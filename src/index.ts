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

const main = async () => {
  const config = getConfig()
  if (process.argv[2] === 'child') {
    console.log('Running child worker...')
    runFilter(config)
  } else {
    const controller = new AbortController()
    const { signal } = controller
    console.log('Forking...')
    const child = fork(__filename, ['child'], { signal })
    child.on('error', (err) => {
      console.error('Failed to start worker.', err)
    })
    runServer(config)
    // controller.abort() // Stops the child process
  }
}

main()
