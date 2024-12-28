import { metrics } from '@opentelemetry/api'
import * as zmq from 'zeromq'
import FeedGenerator from './workers/server'
import { Config, getConfig } from './config'
import { runFilterWorker } from './workers/filterWorker'
import { fork } from 'node:child_process'
import { runEnrichmentWorker } from './workers/enrichmentWorker'
import { runRouterWorker } from './workers/routerWorker'
import { getLogger } from './util/logging'
import { getQueueUri } from './util/zeromq'
import { connect } from 'node:http2'

const logger = getLogger(__filename)

const runServer = async (
  config: Config,
  connectToFirehose: boolean = false,
) => {
  const sock = new zmq.Push()
  const sinkUri = getQueueUri(config.bindHost, config.firehosePort)
  await sock.bind(sinkUri)

  const server = FeedGenerator.create(config, sock)

  server.app.get('/', (req, res) => {
    res.send('<p>Feed Me, Seymour!</p>')
  })

  server.app.get(['/health', '/system/health'], (req, res) => {
    res.status(200).send('OK')
  })

  server.app.get('/system/version', (req, res) => {
    res.send(process.env.APP_VERSION || 'dev')
  })

  server.app.get('/system/info', (req, res) => {
    const sortedEnv = Object.entries(process.env).sort(([keyA], [keyB]) =>
      keyA.localeCompare(keyB),
    ) // Sort keys alphabetically

    res.send(`<pre>${JSON.stringify(sortedEnv, undefined, 2)}</pre>`),
      {
        status: 'ok',
        version: process.env.APP_VERSION || 'dev',
      }
  })

  await server.start(connectToFirehose)

  if (connectToFirehose) {
    logger.info(
      `Bluesky Firehose Source [${process.pid}] ready. Source: Bluesky, Sink: ${sinkUri}`,
    )
  } else {
    logger.info(
      `🤖 running feed generator at http://${server.cfg.listenhost}:${server.cfg.port}`,
    )
  }
}

const borkfork = async (workerName: string) => {
  console.log('Forking it up: ', workerName)
  const child = fork(__filename, [workerName], {
    execArgv: ['-r', 'ts-node/register', '-r', './src/instrumentation.ts'],
  })

  child.on('error', (err) => {
    console.error('Failed to start worker.', err)
  })
  return child
}

async function spawnWorkers(config: Config) {
  const spawnFilterWorkers = async () => {
    for (let i = 0; i < config.numFilterWorkers; i++) {
      console.log(`Spawning filter worker ${i}/${config.numFilterWorkers}`)
      const child = borkfork('filter')
    }
  }

  const spawnEnrichmentWorker = async () => {
    console.log('Spawning enrichment worker')
    const child = borkfork('enrich')
  }

  const spawnRouterWorker = async () => {
    console.log('Spawning router worker')
    const child = borkfork('router')
  }

  const spawnFirehose = async () => {
    console.log('Spawning server worker')
    const child = borkfork('firehose')
  }

  const spawnServer = async () => {
    console.log('Spawning server worker')
    const child = borkfork('server')
  }

  spawnFilterWorkers()
  spawnEnrichmentWorker()
  spawnRouterWorker()
  spawnFirehose()
  spawnServer()
}

const main = async () => {
  const config = getConfig()
  switch (process.argv[2]) {
    case 'filter':
      runFilterWorker(config)
      break
    case 'enrich':
      runEnrichmentWorker(config)
      break
    case 'router':
      runRouterWorker(config)
      break
    case 'firehose':
      runServer(config, true)
      break
    case 'server':
      runServer(config, false)
      break
    default:
      spawnWorkers(config)
      break
  }
}

main()
