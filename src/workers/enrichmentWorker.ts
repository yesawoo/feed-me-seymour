import * as zmq from 'zeromq'
import { Event } from '../events'
import { LanguageFilter } from '../events/filters/language'
import { LengthFilter } from '../events/filters/length'
import { EventFilter, EventFilterHandler } from '../events/filters/filter'
import { Config } from '../config'
import Sentiment from 'sentiment'
import hashtagRegex from 'hashtag-regex'

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

    console.log('Enriched event', JSON.stringify(enrichedEvent))
    // await sink.send(JSON.stringify(event))
  }
}

function enrich(event: Event): Event {
  let newEvent = structuredClone(event)
  if (!newEvent.labels) {
    newEvent.labels = []
  }

  newEvent = analyzeSentiment(newEvent)
  newEvent = extractHashtags(newEvent)

  newEvent.labels.push({ key: 'enriched', value: true })
  return newEvent
}

function analyzeSentiment(newEvent: Event): Event {
  const sentiment = new Sentiment()
  const result = sentiment.analyze(newEvent.data.record.text)
  newEvent.labels.push({ key: 'sentimentScore', value: result.score })
  newEvent.labels.push({
    key: 'sentimentComparative',
    value: result.comparative,
  })
  return newEvent
}
function extractHashtags(newEvent: Event): Event {
  const regex = hashtagRegex()
  let match
  const hashtags = new Set<string>()
  while ((match = regex.exec(newEvent.data.record.text))) {
    const hashtag = match[0]
    hashtags.add(hashtag)
  }
  for (const hashtag of hashtags) {
    newEvent.labels.push({ key: 'hashtag', value: hashtag })
  }
  return newEvent
}
