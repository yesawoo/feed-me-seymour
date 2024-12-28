import * as zmq from 'zeromq'
import { Event } from '../events'
import { LanguageFilter } from '../events/filters/language'
import { LengthFilter } from '../events/filters/length'
import { EventFilter, EventFilterHandler } from '../events/filters/filter'
import { Config } from '../config'
import Sentiment from 'sentiment'
import hashtagRegex from 'hashtag-regex'
import uri from 'fast-uri'
import { getLogger } from '../util/logging'
import { getQueueUri } from '../util/zeromq'

const logger = getLogger(__filename)

export async function runEnrichmentWorker(config: Config) {
  const source = new zmq.Pull()
  const sourceUri = getQueueUri(config.bindHost, config.enrichPort)
  await source.bind(sourceUri)

  const sink = new zmq.Push()
  const sinkUri = getQueueUri(config.bindHost, config.routerPort)
  await sink.bind(sinkUri)

  logger.info(
    `EnrichmentWorker[${process.pid}] ready. Source: ${sourceUri}, Sink: ${sinkUri}`,
  )

  for await (const [msg] of source) {
    const event = JSON.parse(msg.toString()) as Event
    logger.info(`Enriching Event: ${event.id}`)

    const enrichedEvent = enrich(event)

    await sink.send(JSON.stringify(enrichedEvent))
  }
}

function enrich(event: Event): Event {
  logger.info(`Enriching Event: ${event.id}`)
  let newEvent = structuredClone(event)
  if (!newEvent.labels) {
    newEvent.labels = []
  }

  newEvent = analyzeSentiment(newEvent)
  newEvent = extractHashtags(newEvent)
  newEvent = wordFinder(newEvent, ['furry', 'fursuit', 'bandana'])
  newEvent = regexMatcher(
    newEvent,
    /comm\w*\sopen|open\s+for\s+(:?comms|commission[s?])\s/gi,
    'commsOpen',
  )
  newEvent = postUrlEnricher(newEvent)
  newEvent = detectPostLanguage(newEvent)
  newEvent = furryTrashDetector(newEvent)

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

function wordFinder(newEvent: Event, wordsToFind: string[]): Event {
  const postText = newEvent.data.record.text.toLowerCase()
  for (const word of wordsToFind.map((w) => w.toLowerCase())) {
    if (postText.includes(word)) {
      newEvent.labels.push({ key: 'includesWord', value: word })
    }
  }
  return newEvent
}

function regexMatcher(
  newEvent: Event,
  regex: RegExp,
  regexName: string,
): Event {
  const postText = newEvent.data.record.text

  const isMatchFound = regex.test(postText)
  newEvent.labels.push({
    key: `matchesRegex.${regexName}`,
    value: isMatchFound,
  })
  return newEvent
}
function postUrlEnricher(newEvent: Event): Event {
  // at://<DID>/<COLLECTION>/<RKEY>
  // https://bsky.app/profile/<DID>/post/<RKEY>

  const authorDID = newEvent.data.author
  const postUri = uri.parse(newEvent.id)
  const rkey = postUri.path?.split('/')[2] || 'PARSE_ERROR'

  const enrichedUrl = `https://bsky.app/profile/${authorDID}/post/${rkey}`
  newEvent.labels.push({ key: 'blueskyPostUrl', value: enrichedUrl })
  return newEvent
}
function detectPostLanguage(newEvent: Event): Event {
  const langs = newEvent.data.record.langs || []
  newEvent.labels.push({ key: 'detectedLanguages', value: langs.join(',') })
  return newEvent
}
function furryTrashDetector(newEvent: Event): Event {
  const wordsToFind = ['furry', 'fursuit', 'bandana']
  const postText = newEvent.data.record.text.toLowerCase()

  let isFurryTrash = false
  for (const word of wordsToFind.map((w) => w.toLowerCase())) {
    isFurryTrash ||= postText.includes(word)
  }
  newEvent.labels.push({ key: 'isFurryTrash', value: isFurryTrash })
  return newEvent
}
