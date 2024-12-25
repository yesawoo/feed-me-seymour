import * as zmq from 'zeromq'
import { Event } from '../events'
import { LanguageFilter } from '../events/filters/language'
import { LengthFilter } from '../events/filters/length'
import { EventFilter, EventFilterHandler } from '../events/filters/filter'
import { Config } from '../config'
import { metrics } from '@opentelemetry/api'
import { getLogger } from '../util/logging'

const logger = getLogger(__filename)
export async function runFilterWorker(config: Config) {
  const sourceUri = config.zmqUri['blueskyFirehose']
  const source = new zmq.Pull()
  source.connect(sourceUri)

  const sinkUri = config.zmqUri['filteredEvents']
  const sink = new zmq.Push()
  await sink.connect(sinkUri)

  const filterStack: (EventFilter | EventFilterHandler)[] = [
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

  const meter = metrics.getMeter('feed-me-seymour.filter')
  const publishCounter = meter.createCounter('events.sent.counter')
  const publishErrorCounter = meter.createCounter('events.error.counter')
  const receiptCounter = meter.createCounter('events.received.counter')

  logger.info(
    `FilterWorker[${process.pid}] ready. Source: ${sourceUri}, Sink: ${sinkUri}`,
  )

  for await (const [msg] of source) {
    const event = JSON.parse(msg.toString()) as Event
    receiptCounter.add(1)

    if (applyFilterStack(event)) {
      logger.debug({ 'Applying Filter Stack to': event })

      await sink
        .send(JSON.stringify(event))
        .then(() => {
          publishCounter.add(1)
        })
        .catch((err) => {
          publishErrorCounter.add(1)
          console.error('Error publishing filtered event', err)
        })
    }
  }
}
