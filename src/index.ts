import * as zmq from 'zeromq'
import FeedGenerator from './workers/server'
import { Config, getConfig } from './config'
import { runFilterWorker } from './workers/filterWorker'
import { fork } from 'node:child_process'
import { runEnrichmentWorker } from './workers/enrichmentWorker'
import { runRouterWorker } from './workers/routerWorker'
import { getLogger } from './util/logging'

const logger = getLogger(__filename)

const runServer = async (config: Config) => {
  const sock = new zmq.Push()
  await sock.bind(config.zmqUri['blueskyFirehose'])

  const server = FeedGenerator.create(config, sock)

  server.app.get('/', (req, res) => {
    res.send(
      `<p>Feed Me, Seymour!</p><p>ver. ${process.env.APP_VERSION || 'dev'}</p>`,
    )
  })

  await server.start()

  logger.info(
    `🤖 running feed generator at http://${server.cfg.listenhost}:${server.cfg.port}`,
  )
}

async function spawnWorkers(config: Config) {
  const spawnFilterWorkers = async () => {
    for (let i = 0; i < config.numFilterWorkers; i++) {
      const child = fork(__filename, ['filter'])
      child.on('error', (err) => {
        console.error('Failed to start worker.', err)
      })
    }
  }

  const spawnEnrichmentWorker = async () => {
    const child = fork(__filename, ['enrich'])
    child.on('error', (err) => {
      console.error('Failed to start worker.', err)
    })
  }

  const spawnRouterWorker = async () => {
    const child = fork(__filename, ['router'])
    child.on('error', (err) => {
      console.error('Failed to start worker.', err)
    })
  }

  const spawnServer = async () => {
    const child = fork(__filename, ['server'])
    child.on('error', (err) => {
      console.error('Failed to start worker.', err)
    })
  }

  spawnFilterWorkers()
  spawnEnrichmentWorker()
  spawnRouterWorker()
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
    case 'server':
      logger.info('Starting server process...')
      runServer(config)
      break
    default:
      logger.info('Starting main process...')
      spawnWorkers(config)
      break
  }
}

main()
