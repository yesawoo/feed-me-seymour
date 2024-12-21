import * as zmq from 'zeromq'
import dotenv from 'dotenv'
import FeedGenerator from './server'
import { Worker } from 'node:worker_threads'

const run = async () => {
  dotenv.config()
  const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME) ?? 'example.com'
  const serviceDid =
    maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${hostname}`
  const config = {
    port: maybeInt(process.env.FEEDGEN_PORT) ?? 3000,
    listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST) ?? 'localhost',
    sqliteLocation: maybeStr(process.env.FEEDGEN_SQLITE_LOCATION) ?? ':memory:',
    subscriptionEndpoint:
      maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ??
      'wss://bsky.network',
    publisherDid:
      maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? 'did:example:alice',
    subscriptionReconnectDelay:
      maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
    hostname,
    serviceDid,
    zmqUri: maybeStr(process.env.ZMQ_URI) ?? 'inproc://firehose',
  }
  const sock = new zmq.Push()
  await sock.bind(config.zmqUri)
  console.log('Producer bound to port 5678')

  const server = FeedGenerator.create(config, sock)
  server.app.get('/', (req, res) => {
    res.send('Feed Me, Seymour!')
  })
  await server.start()

  console.log(
    `🤖 running feed generator at http://${server.cfg.listenhost}:${server.cfg.port}`,
  )
}

const maybeStr = (val?: string) => {
  if (!val) return undefined
  return val
}

const maybeInt = (val?: string) => {
  if (!val) return undefined
  const int = parseInt(val, 10)
  if (isNaN(int)) return undefined
  return int
}

const startWorkers = () => {
  console.log('Starting workers.')
  let workerCount = 10
  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(`${__dirname}/workers/worker.js`, {
      workerData: {},
    })
    worker.on('message', (result) => {
      console.log(result)
    })
  }
}

startWorkers()
run()
