import * as zmq from 'zeromq'
import { Event } from '../events'
import { Config } from '../config'
import { getLogger } from '../util/logging'
import { getQueueUri } from '../util/zeromq'
import { routeFurryTrashToBlueskyFeed } from '../events/routers/handlers/BlueskyFeed'
import EventRouter from '../events/routers/Router'

export const logger = getLogger(__filename)

export async function runRouterWorker(config: Config) {
  const sourceUri = getQueueUri(config.enrichHost, config.routerPort)
  const source = new zmq.Pull({ connectTimeout: 2000 })
  source.events.on('connect:retry', (event) => {
    logger.warn(`Retrying Connection: ${event.type}`)
  })
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
