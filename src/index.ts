import * as zmq from 'zeromq'
import FeedGenerator from './server'
import { Config, getConfig } from './config'
import { runFilterWorker } from './workers/filterWorker'
import { fork } from 'node:child_process'
import { run } from 'node:test'
import { runEnrichmentWorker } from './workers/enrichmentWorker'

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

const runChildren = async (config: Config) => {
  runFilterWorker(config)
}

async function spawnWorkers(config: Config) {
  console.log('Forking...')
  for (let i = 0; i < config.numWorkers; i++) {
    const child = fork(__filename, ['child'])
    child.on('error', (err) => {
      console.error('Failed to start worker.', err)
    })
  }
  const child = fork(__filename, ['enrich'])
  child.on('error', (err) => {
    console.error('Failed to start worker.', err)
  })
}

const main = async () => {
  const config = getConfig()
  if (process.argv[2] === 'child') {
    runChildren(config)
  } else if (process.argv[2] === 'enrich') {
    runEnrichmentWorker(config)
  } else {
    console.log('Starting server process...')
    spawnWorkers(config)
    runServer(config)
  }
}

main()
