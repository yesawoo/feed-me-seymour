import * as zmq from 'zeromq'
import { Event } from '../events'
import { Config } from '../config'
import { createDb, Database, migrateToLatest } from '../db'
import { addPostToFeed } from '../feeds/postRepository'
import { getLogger } from '../util/logging'
import { getQueueUri } from '../util/zeromq'
import { WebhookPusher } from '../events/routers/handlers/WebhookPusher'
import { routeFurryTrashToBlueskyFeed } from '../events/routers/handlers/BlueskyFeed'
import EventRouter from '../events/routers/Router'

export const logger = getLogger(__filename)

export async function runRouterWorker(config: Config) {
  const sourceUri = getQueueUri(config.enrichHost, config.routerPort)
  const source = new zmq.Pull()
  source.connect(sourceUri)

  const sinkUri = 'N/A'

  logger.info(
    `RouterWorker[${process.pid}] ready. Source: ${sourceUri}, Sink: ${sinkUri}`,
  )

  const router = new EventRouter([routeFurryTrashToBlueskyFeed])

  for await (const [msg] of source) {
    const event = JSON.parse(msg.toString()) as Event
    router.route(event)
  }
}
