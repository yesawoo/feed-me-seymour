import * as zmq from 'zeromq'
import { Event } from '../events'
import { LanguageFilter } from '../events/filters/language'
import { LengthFilter } from '../events/filters/length'
import { Filter, FilterMatcher } from '../events/filters/filter'
import { Config } from '../config'
import { metrics } from '@opentelemetry/api'
import { getLogger } from '../util/logging'
import { getQueueUri } from '../util/zeromq'

const logger = getLogger(__filename)

export async function runFilterWorker(config: Config) {
  const sourceUri = getQueueUri(config.firehoseHost, config.firehosePort)
  const source = new zmq.Pull({ connectTimeout: 2000 })
  source.events.on('connect:retry', (event) => {
    logger.warn(`Retrying Connection: ${event.type}`)
  })
  source.connect(sourceUri)

  const sinkUri = getQueueUri(config.enrichHost, config.enrichPort)
  const sink = new zmq.Push()
  sink.connect(sinkUri)

  const filterStack: (Filter | FilterMatcher)[] = [
    new LanguageFilter(['en', 'en-US', 'en-GB', 'en-CA', 'en-AU']),
    new LengthFilter(10),
    (event: Event) => event.data.record.text.includes('furry'),
  ]

  const applyFilterStack = (event: Event) => {
    return filterStack.every((filter) => {
      if (typeof filter === 'function') {
        return filter(event)
      } else {
        return filter.isMatch(event)
      }
    })
  }

  const fakeGauge = {
    record: (value: number) => {
      if (value % 1000 === 0) {
        logger.info(`[FAKEGAUGE] Events Filtered: ${value}`)
      }
    },
  }

  const meter = metrics.getMeter('feed-me-seymour.filter')
  const publishCounter = meter.createCounter('events.sent.counter')
  const publishErrorCounter = meter.createCounter('events.error.counter')
  const receiptCounter = meter.createCounter('events.received.counter')

  logger.info(
    `FilterWorker[${process.pid}] ready. Source: ${sourceUri}, Sink: ${sinkUri}`,
  )
  logger.info('FilterWorker waiting for messages...')

  let numFiltered = 0
  for await (const [msg] of source) {
    const event = JSON.parse(msg.toString()) as Event

    logger.debug(`Processing Loop: ${numFiltered++}`)
    logger.debug(`Received message from firehose [${numFiltered}]: ${event.id}`)
    receiptCounter.add(1)

    if (!event.id) {
      logger.error(`Event missing id[${numFiltered}]: ${event}`)
    }

    logger.trace(`Applying Filter Stack to[${numFiltered}]: ${event.id}`)
    if (applyFilterStack(event)) {
      logger.info(`Event accepted[${numFiltered}]: ${event.id}`)
      await sink
        .send(JSON.stringify(event))
        .then(() => {
          publishCounter.add(1)
        })
        .catch((err) => {
          publishErrorCounter.add(1)
          console.error(
            `Error publishing filtered event[${numFiltered}]: ${event.id}`,
            err,
          )
        })
    } else {
      logger.trace(`Event rejected[${numFiltered}]: ${event.id}`)
    }

    if (numFiltered == 10) {
      logger.info('FilterWorker is receiving messages (N=10).')
    }

    fakeGauge.record(numFiltered)
  }
}
