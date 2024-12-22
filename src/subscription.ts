import { Mutex } from 'async-mutex'
import { Database } from './db'
import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import * as zmq from 'zeromq'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  private seq = 0
  zmqMutex = new Mutex()

  constructor(
    public db: Database,
    public service: string,
    public sock: zmq.Push,
  ) {
    super(db, service)
  }

  async publishRecord(record) {
    const event = wrapInEvent(record, this.seq++)

    // console.log('Sending event to firehose', event)

    let messageSent = false
    let attempts = 0
    const jsonEvent = JSON.stringify(event)

    let i = 0
    while (!messageSent) {
      const release = await this.zmqMutex.acquire()
      await this.sock
        .send(jsonEvent)
        .then(() => {
          // console.log('Sent event to firehose', event)
          messageSent = true
          if (attempts > 0) console.log('Retried and succeeded')
        })
        .catch((err) => {
          attempts++
          console.error('Error sending event to firehose. Retrying...', err)
        })
        .finally(() => {
          release()
        })
    }
  }

  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return

    const ops = await getOpsByType(evt)

    for (const post of ops.posts.creates) {
      this.publishRecord(post)

      if (this.seq % 1000 === 0) {
        console.log('Sent', this.seq, 'events to firehose')
      }
    }

    return
    // const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    // const postsToCreate = ops.posts.creates
    //   .filter((create) => {
    //     // only alf-related posts
    //     return create.record.text.toLowerCase().includes('furry')
    //   })
    //   .map((create) => {
    //     // map alf-related posts to a db row
    //     return {
    //       uri: create.uri,
    //       cid: create.cid,
    //       indexedAt: new Date().toISOString(),
    //     }
    //   })

    // if (postsToDelete.length > 0) {
    //   await this.db
    //     .deleteFrom('post')
    //     .where('uri', 'in', postsToDelete)
    //     .execute()
    // }
    // if (postsToCreate.length > 0) {
    //   await this.db
    //     .insertInto('post')
    //     .values(postsToCreate)
    //     .onConflict((oc) => oc.doNothing())
    //     .execute()
    // }
  }
}

function wrapInEvent(
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
  }
}
