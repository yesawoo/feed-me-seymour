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
  environment: string

  port: number
  listenhost: string
  hostname: string

  // FeedGen
  dbType: string
  dbConnectionString: string
  subscriptionEndpoint: string
  serviceDid: string
  publisherDid: string

  // Worker Config
  numFilterWorkers: number
  bindHost: string // Localhost for local or 0.0.0.0 to expose the services to the network

  firehoseHost: string
  firehosePort: number
  subscriptionReconnectDelay: number

  filterHost: string
  filterPort: number

  enrichHost: string
  enrichPort: number

  routerPort: number
  routerHost: string
}

export const getConfig = (): Config => {
  dotenv.config()

  if (!process.env.ENVIRONMENT) {
    throw Error('ENVIRONMENT is required')
  }

  const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME) ?? 'example.com'
  const serviceDid =
    maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${hostname}`

  const config: Config = {
    environment: process.env.ENVIRONMENT,

    port: maybeInt(process.env.FEEDGEN_PORT) ?? 3000,
    listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST) ?? 'localhost',
    dbType: maybeStr(process.env.FEEDGEN_DB_TYPE) ?? 'sqlite',
    dbConnectionString:
      maybeStr(process.env.FEEDGEN_DB_CONNECTION_STRING) ?? ':memory:',
    subscriptionEndpoint:
      maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ??
      'wss://bsky.network',
    publisherDid:
      maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? 'did:example:alice',
    subscriptionReconnectDelay:
      maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
    hostname,
    serviceDid,
    numFilterWorkers: 2,

    bindHost: maybeStr(process.env.BIND_HOST) ?? 'localhost',

    firehoseHost: maybeStr(process.env.FIREHOSE_HOST) ?? 'localhost',
    firehosePort: maybeInt(process.env.FIREHOSE_PORT) ?? 23700,

    filterHost: maybeStr(process.env.FILTER_HOST) ?? 'localhost',
    filterPort: maybeInt(process.env.FILTER_PORT) ?? 56320,

    enrichHost: maybeStr(process.env.ENRICH_HOST) ?? 'localhost',
    enrichPort: maybeInt(process.env.ENRICH_PORT) ?? 37592,

    routerPort: maybeInt(process.env.ROUTER_PORT) ?? 41230,
    routerHost: maybeStr(process.env.ROUTER_HOST) ?? 'localhost',
  }
  return config
}
