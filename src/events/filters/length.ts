import Event from '../../events'
import { EventFilter } from './filter'

class LengthFilter implements EventFilter {
  constructor(public minLength: number) {}

  isMatch(event: Event): boolean {
    return event.data.record.text.length >= this.minLength
  }
}

export { LengthFilter }
