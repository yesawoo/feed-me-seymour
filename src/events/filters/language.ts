import Event from '../../events'
import { EventFilter } from './filter'

class LanguageFilter implements EventFilter {
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