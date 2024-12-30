import { Event } from '../..'
import { createDb, migrateToLatest } from '../../../db'
import { addPostToFeed } from '../../../feeds/postRepository'
import { getLogger } from '../../../util/logging'
import { RoutingRule } from '../Router'
import { getConfig } from '../../../config'

const logger = getLogger(__filename)

const config = getConfig()
const db = createDb(config.dbType, config.dbConnectionString)
migrateToLatest(db)

export const routeFurryTrashToBlueskyFeed: RoutingRule = {
  filter: (event: Event) => {
    return event.labels.some(
      (label) => label.key === 'isFurryTrash' && label.value === true,
    )
  },
  sink: {
    name: 'BlueskyFeed',
    push: (event: Event) => {
      logger.info('Furry Trash Detected! Adding it to the feed.')
      addPostToFeed(db, event)
    },
  },
}
