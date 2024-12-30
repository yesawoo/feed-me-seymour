import { Event } from '../../events'
import { Filter } from './filter'

class LanguageFilter implements Filter {
  constructor(public allowedLanguages: string[]) {}

  isMatch(event: Event): boolean {
    return event.data.record.langs?.some((x) =>
      this.allowedLanguages.includes(x),
    )
  }
}

// Example usage:
// const filter = new LanguageFilter(['en', 'en-US', 'en-GB', 'en-CA', 'en-AU'])

export { LanguageFilter }
