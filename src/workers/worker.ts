import * as zmq from 'zeromq'
import Event from '../events'
import { LanguageFilter } from '../events/filters/language'
import { LengthFilter } from '../events/filters/length'
import { EventFilter, EventFilterHandler } from '../events/filters/filter'
import { Config } from '../config'

export async function runFilter(config: Config) {
  const sock = new zmq.Pull()

  sock.connect(config.zmqUri)
  console.log(`Worker[${process.pid}] connected to ${config.zmqUri}`)

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

  for await (const [msg] of sock) {
    const event = JSON.parse(msg.toString()) as Event
    if (applyFilterStack(event)) {
      console.log(event.data.record.text.trim())
    } else {
    }
  }
}
