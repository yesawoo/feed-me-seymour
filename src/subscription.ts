import { Mutex } from 'async-mutex'
import { Database } from './db'
import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import * as zmq from 'zeromq'
import { metrics } from '@opentelemetry/api'
import { getLogger } from './util/logging'

const logger = getLogger(__filename)

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  private seq = 0
  zmqMutex = new Mutex()
  private meter = metrics.getMeter(
    'feed-me-seymour.bsky.firehose.subscription',
    '0.0.1',
  )
  private publishCounter = this.meter.createCounter('events.sent.counter')
  private publishErrorCounter = this.meter.createCounter('events.error.counter')
  private receiptCounter = this.meter.createCounter('events.received.counter')
  private bonerGauge = this.meter.createGauge('boner.gauge')

  constructor(
    public db: Database,
    public service: string,
    public sock: zmq.Push,
  ) {
    super(db, service)
  }

  async publishRecord(record) {
    const event = wrapInEnvelope(record, this.seq++)

    let messageSent = false
    let attempts = 0
    const jsonEvent = JSON.stringify(event)

    let i = 0
    while (!messageSent) {
      const release = await this.zmqMutex.acquire()
      await this.sock
        .send(jsonEvent)
        .then(() => {
          messageSent = true
          this.publishCounter.add(1)
          if (attempts > 0) logger.info('Retried and succeeded')
        })
        .catch((err) => {
          attempts++
          this.publishErrorCounter.add(1)
          logger.error('Error sending event to firehose. Retrying...', err)
        })
        .finally(() => {
          release()
        })
    }
  }

  async handleEvent(evt: RepoEvent) {
    this.receiptCounter.add(1)

    if (!isCommit(evt)) return

    const ops = await getOpsByType(evt)

    for (const post of ops.posts.creates) {
      this.publishRecord(post)

      if (this.seq % 1000 === 0) {
        logger.info(`Sent ${this.seq} events to firehose`, {
          log_type: 'heartbeat',
        })
        this.bonerGauge.record(this.seq)
      }
    }

    return
  }
}

function wrapInEnvelope(
  post: {
    uri: string
    cid: string
    author: string
    record: any
  },
  seq?: number,
) {
  return {
    id: post.uri,
    name: 'socialmedia.bluesky.record.post_received',
    labels: [
      { key: 'source', value: 'bluesky' },
      { key: 'collector', value: 'feed-me-seymour' },
    ],
    timestamp: new Date(),
    data: post,
    _sequence: seq || -1,
    _schemaVersion: '0.0.1',
  }
}
