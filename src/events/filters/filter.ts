import { Event } from '../../events'

/**
 * A type representing a function that determines whether an event matches certain criteria.
 *
 * methods typically named `isMatch`
 *
 * @param event - The event to be evaluated.
 * @returns true to indicate that the event is accepted by the filter, false
 */
export type FilterMatcher = (event: Event) => boolean

export interface Filter {
  isMatch: FilterMatcher
}
