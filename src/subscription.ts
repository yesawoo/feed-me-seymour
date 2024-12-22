import { Database } from './db'
import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import * as zmq from 'zeromq'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  private seq = 0

  constructor(
    public db: Database,
    public service: string,
    public sock: zmq.Push,
  ) {
    super(db, service)
  }

  async publishRecord(record) {
    let messageSent = false
    let firstTry = true

    while (!messageSent) {
      const event = wrapInEvent(record)
      await this.sock
        .send(JSON.stringify(event))
        .then(() => {
          messageSent = true
          this.seq++
          if (!firstTry) console.log('Retried and succeeded')
        })
        .catch((err) => {
          console.error('Error sending event to firehose. Retrying...', err)
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
function wrapInEvent(post: {
  uri: string
  cid: string
  author: string
  record: any
}) {
  return {
    id: post.uri,
    name: 'socialmedia.bluesky.record.post_received',
    labels: [
      { key: 'source', value: 'bluesky' },
      { key: 'collector', value: 'feed-me-seymour' },
    ],
    timestamp: new Date(),
    data: post,
  }
}
