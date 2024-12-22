import { Database } from './db'
import { DidResolver } from '@atproto/identity'
import dotenv from 'dotenv'
import { maybeInt, maybeStr } from './util/maybe'

export type AppContext = {
  db: Database
  didResolver: DidResolver
  cfg: Config
}

interface UriDict {
  [index: string]: string
}

export type Config = {
  port: number
  listenhost: string
  hostname: string
  sqliteLocation: string
  subscriptionEndpoint: string
  serviceDid: string
  publisherDid: string
  subscriptionReconnectDelay: number
  numWorkers: number
  zmqUri: UriDict
}

export const getConfig = (): Config => {
  dotenv.config()

  const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME) ?? 'example.com'
  const serviceDid =
    maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${hostname}`

  const config = {
    port: maybeInt(process.env.FEEDGEN_PORT) ?? 3000,
    listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST) ?? 'localhost',
    sqliteLocation: maybeStr(process.env.FEEDGEN_SQLITE_LOCATION) ?? ':memory:',
    subscriptionEndpoint:
      maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ??
      'wss://bsky.network',
    publisherDid:
      maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? 'did:example:alice',
    subscriptionReconnectDelay:
      maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
    hostname,
    serviceDid,
    numWorkers: 2,
    zmqUri: {
      blueskyFirehose: maybeStr(process.env.ZMQ_URI) ?? 'tcp://127.0.0.1:23700',
      filteredEvents: maybeStr(process.env.ZMQ_URI) ?? 'tcp://127.0.0.1:56320',
      enrichedEvents: maybeStr(process.env.ZMQ_URI) ?? 'tcp://127.0.0.1:37592',
    },
  }
  return config
}
