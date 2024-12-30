import FeedGenerator from './workers/server'
import { Config, getConfig } from './config'
import { runFilterWorker } from './workers/filterWorker'
import { fork } from 'node:child_process'
import { runEnrichmentWorker } from './workers/enrichmentWorker'
import { runRouterWorker } from './workers/routerWorker'
import { getLogger } from './util/logging'

const logger = getLogger(__filename)

const runServer = async (
  config: Config,
  connectToFirehose: boolean = false,
) => {
  const server = await FeedGenerator.create(config, connectToFirehose)

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
    const child = borkfork('webserver')
  }

  spawnFilterWorkers()
  spawnEnrichmentWorker()
  spawnRouterWorker()
  spawnFirehose()
  spawnServer()
}

const main = async () => {
  logger.info(`Process starting with command line: ${process.argv.join(' ')}`)

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
    case 'webserver':
      runServer(config, false)
      break
    case 'fork-it-up':
      if (config.environment != 'development') {
        throw new Error('Forking is only allowed in development')
      }
      spawnWorkers(config)
      break
    default:
      throw new Error('Unknown worker type: ' + process.argv[2])
      break
  }
}

main()
