import { DidResolver, MemoryCache } from '@atproto/identity'
import events from 'events'
import express from 'express'
import http from 'http'
import * as zmq from 'zeromq'
import { AppContext, Config } from '../config'
import { createDb, Database, migrateToLatest } from '../db'
import { createServer } from '../lexicon'
import describeGenerator from '../methods/describe-generator'
import feedGeneration from '../methods/feed-generation'
import { FirehoseSubscription } from '../subscription'
import wellKnown from '../well-known'
import { getLogger } from '../util/logging'
import { logRequest } from '../web/log'
import { getQueueUri } from '../util/zeromq'
import { CompiledQuery } from 'kysely'

const logger = getLogger(__filename)

export class FeedGenerator {
  public app: express.Application
  public server?: http.Server
  public db: Database
  public firehose: FirehoseSubscription
  public cfg: Config
  private sinkUri: string

  constructor(
    app: express.Application,
    db: Database,
    firehose: FirehoseSubscription,
    cfg: Config,
    sinkUri: string,
  ) {
    this.app = app
    this.db = db
    this.firehose = firehose
    this.cfg = cfg
    this.sinkUri = sinkUri
  }

  static async create(cfg: Config, connectToFirehose: boolean) {
    const app = express()
    app.use(logRequest)
    const db = createDb(cfg.dbType, cfg.dbConnectionString)

    const sock = new zmq.Push()
    const sinkUri = getQueueUri(
      cfg.bindHost,
      connectToFirehose ? cfg.firehosePort : 29384, // More janky hacks cuz this class does too much.
    )
    await sock.bind(sinkUri)
    const firehose = new FirehoseSubscription(
      db,
      cfg.subscriptionEndpoint,
      sock,
    )

    testDbConnection(db, cfg.dbType)

    const didCache = new MemoryCache()
    const didResolver = new DidResolver({
      plcUrl: 'https://plc.directory',
      didCache,
    })

    const server = createServer({
      validateResponse: true,
      payload: {
        jsonLimit: 100 * 1024, // 100kb
        textLimit: 100 * 1024, // 100kb
        blobLimit: 5 * 1024 * 1024, // 5mb
      },
    })
    const ctx: AppContext = {
      db,
      didResolver,
      cfg,
    }
    feedGeneration(server, ctx)
    describeGenerator(server, ctx)
    app.use(server.xrpc.router)
    app.use(wellKnown(ctx))

    return new FeedGenerator(app, db, firehose, cfg, sinkUri)
  }

  async start(connectToFirehose: boolean = true): Promise<http.Server> {
    await migrateToLatest(this.db)
    if (connectToFirehose) {
      this.firehose.run(this.cfg.subscriptionReconnectDelay)
      this.server = this.app.listen(8080, '127.0.0.1') // janky hack to disable server on the firehose component.
      await events.once(this.server, 'listening')
      logger.info(
        `Bluesky Firehose Source [${process.pid}] ready. Source: Bluesky, Sink: ${this.sinkUri}`,
      )
    } else {
      this.server = this.app.listen(this.cfg.port, this.cfg.listenhost)
      await events.once(this.server, 'listening')
      logger.info(
        `Feed Generator Webserver [${process.pid}] ready. Listening at http://${this.cfg.listenhost}:${this.cfg.port}`,
      )
    }
    return this.server
  }
}

async function testDbConnection(db: Database, dbType: string) {
  if (dbType === 'sqlite') {
    logger.info("Running SQLite - Not Testing DB Connection")
    return

  try {
    let result = await db.executeQuery(
      CompiledQuery.raw(
        `
        SELECT 
          1+1 AS one_plus_one,
          current_database as current_database
        `,
      ),
    )
    logger.info('Database connection successful with result:', result)
  } catch (error) {
    logger.error(`Database connection failed: ${JSON.stringify(error)}`)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    throw new Error(`Database connection failed`, error)
  }
}

export default FeedGenerator
