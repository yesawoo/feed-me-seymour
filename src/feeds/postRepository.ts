import { Database } from '../db'
import { Event } from '../events'
import { getLogger } from '../util/logging'

const logger = getLogger(__filename)

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
//   await this.db.deleteFrom('post').where('uri', 'in', postsToDelete).execute()
// }

export const addPostToFeed = async (db: Database, event: Event) => {
  const postToCreate = {
    uri: event.id,
    cid: event.data.cid,
    indexedAt: new Date().toISOString(),
  }
  logger.info('Adding post to feed', postToCreate)
  await db
    .insertInto('post')
    .values(postToCreate)
    .onConflict((oc) => oc.doNothing())
    .execute()
  logger.info('Added post to feed', postToCreate.uri)
  return
}
