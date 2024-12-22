import * as zmq from 'zeromq'
import FeedGenerator from './server'
import { Worker } from 'node:worker_threads'
import { Config, getConfig } from './config'
import { runFilter } from './workers/worker'
import { fork } from 'node:child_process'

const runServer = async (config: Config) => {
  const sock = new zmq.Push()
  await sock.bind(config.zmqUri)

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
  console.log('Running child worker...')
  runFilter(config)
}

async function spawnWorkers(config: Config) {
  console.log('Forking...')
  const child = fork(__filename, ['child'])
  for (let i = 0; i < config.numWorkers; i++) {
    const child = fork(__filename, ['child'])
    child.on('error', (err) => {
      console.error('Failed to start worker.', err)
    })
  }
  child.on('error', (err) => {
    console.error('Failed to start worker.', err)
  })
}

const main = async () => {
  const config = getConfig()
  if (process.argv[2] === 'child') {
    runChildren(config)
  } else {
    spawnWorkers(config)
    runServer(config)
  }
}

main()
