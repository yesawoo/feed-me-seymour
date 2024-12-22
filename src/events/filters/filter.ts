import { Event } from '../../events'

export type EventFilterHandler = (event: Event) => boolean

export interface EventFilter {
  isMatch: EventFilterHandler
}
