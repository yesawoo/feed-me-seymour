import * as zmq from 'zeromq'
import { Event } from '../events'
import { LanguageFilter } from '../events/filters/language'
import { LengthFilter } from '../events/filters/length'
import { EventFilter, EventFilterHandler } from '../events/filters/filter'
import { Config } from '../config'
import Sentiment from 'sentiment'
import hashtagRegex from 'hashtag-regex'
import { createDb, Database, migrateToLatest } from '../db'
import { addPostToFeed } from '../feeds/postRepository'
import { getLogger } from '../util/logging'
import { getQueueUri } from '../util/zeromq'

const logger = getLogger(__filename)

export async function runRouterWorker(config: Config) {
  const sourceUri = getQueueUri(config.enrichHost, config.routerPort)
  const source = new zmq.Pull()
  source.connect(sourceUri)

  const sinkUri = 'N/A'
  // const sinkUri = config.zmqUri['enrichedEvents']
  // const sink = new zmq.Push()
  // await sink.connect(sinkUri)

  const db = createDb(config.dbType, config.dbConnectionString)
  migrateToLatest(db)

  logger.info(
    `RouterWorker[${process.pid}] ready. Source: ${sourceUri}, Sink: ${sinkUri}`,
  )

  const webhookRouter = new WebhookRouter('https://furryhose.com/webhook')

  const routeHandlers: ((Event) => void)[] = [
    (event: Event) => {
      logger.info(`Routing Event: ${event.id}`)
    },
    // webhookRouter.handleEvent.bind(webhookRouter),
    (event: Event) => {
      if (
        event.labels.some(
          (label) => label.key === 'isFurryTrash' && label.value === true,
        )
      ) {
        logger.info('Furry Trash Detected! Adding it to the feed.')
        addPostToFeed(db, event)
      }
    },
  ]

  for await (const [msg] of source) {
    const event = JSON.parse(msg.toString()) as Event
    routeHandlers.forEach((handler) => handler(event))

    // await sink.send(JSON.stringify(event))
  }
}

class WebhookRouter {
  private webhookUrl: string

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  async handleEvent(event: Event): Promise<void> {
    if (this.matchesRoutingRules(event)) {
      logger.info('Routing event to webhook')
      this.pushEvent(event)
    }
  }

  private matchesRoutingRules(event: Event) {
    return event._sequence % 2 === 0
  }

  private async pushEvent(event: Event): Promise<void> {
    const promise = new Promise<void>(async (resolve, reject) => {
      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        })

        if (!response.ok) {
          console.error(
            `Failed to push event to webhook: ${response.statusText}`,
          )
          reject()
        }
      } catch (error) {
        console.error(`Error pushing event to webhook: ${error.message}`)
        reject()
      }
      resolve()
    })
    return promise
  }
}
