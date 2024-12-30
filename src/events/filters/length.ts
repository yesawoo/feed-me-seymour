import { Event } from '../../events'
import { Filter } from './filter'

class LengthFilter implements Filter {
  constructor(public minLength: number) {}

  isMatch(event: Event): boolean {
    return event.data.record.text.length >= this.minLength
  }
}

export { LengthFilter }
