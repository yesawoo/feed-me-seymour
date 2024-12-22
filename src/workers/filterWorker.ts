import * as zmq from 'zeromq'
import { Event } from '../events'
import { LanguageFilter } from '../events/filters/language'
import { LengthFilter } from '../events/filters/length'
import { EventFilter, EventFilterHandler } from '../events/filters/filter'
import { Config } from '../config'

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

  console.log(
    `FilterWorker[${process.pid}] ready. Source: ${sourceUri}, Sink: ${sinkUri}`,
  )

  for await (const [msg] of source) {
    const event = JSON.parse(msg.toString()) as Event
    if (applyFilterStack(event)) {
      console.log(event.data.record.text.trim())
      await sink.send(JSON.stringify(event))
    } else {
      // console.log('Filtered out')
    }
  }
}
