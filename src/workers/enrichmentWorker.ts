import * as zmq from 'zeromq'
import { Event } from '../events'
import { LanguageFilter } from '../events/filters/language'
import { LengthFilter } from '../events/filters/length'
import { EventFilter, EventFilterHandler } from '../events/filters/filter'
import { Config } from '../config'
import Sentiment from 'sentiment'

export async function runEnrichmentWorker(config: Config) {
  const sourceUri = config.zmqUri['filteredEvents']
  const source = new zmq.Pull()
  await source.bind(sourceUri)

  const sinkUri = config.zmqUri['filteredEvents']
  // const sink = new zmq.Push()
  // await sink.connect(sinkUri)

  console.log(
    `EnrichmentWorker[${process.pid}] ready. Source: ${sourceUri}, Sink: ${sinkUri}`,
  )

  for await (const [msg] of source) {
    const event = JSON.parse(msg.toString()) as Event
    const enrichedEvent = enrich(event)

    console.log(enrichedEvent, enrichedEvent)
    // await sink.send(JSON.stringify(event))
  }
}

function enrich(event: Event): Event {
  const newEvent = structuredClone(event)
  if (!newEvent.labels) {
    newEvent.labels = []
  }

  const sentiment = new Sentiment()
  const result = sentiment.analyze(newEvent.data.record.text)
  newEvent.labels.push({ key: 'sentimentScore', value: result.score })
  newEvent.labels.push({
    key: 'sentimentComparative',
    value: result.comparative,
  })
  newEvent.labels.push({ key: 'enriched', value: true })
  return newEvent
}
