import * as zmq from 'zeromq'
import FeedGenerator from './workers/server'
import { Config, getConfig } from './config'
import { runFilterWorker } from './workers/filterWorker'
import { fork } from 'node:child_process'
import { runEnrichmentWorker } from './workers/enrichmentWorker'
import { runRouterWorker } from './workers/routerWorker'

const runServer = async (config: Config) => {
  const sock = new zmq.Push()
  await sock.bind(config.zmqUri['blueskyFirehose'])

  const server = FeedGenerator.create(config, sock)

  server.app.get('/', (req, res) => {
    res.send('Feed Me, Seymour!')
  })

  await server.start()

  console.log(
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
      console.log('Starting server process...')
      runServer(config)
      break
    default:
      console.log('Starting main process...')
      spawnWorkers(config)
      break
  }
}

main()
