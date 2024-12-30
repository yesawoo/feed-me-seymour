import { Event } from '../..'
import { getLogger } from '../../../util/logging'

const logger = getLogger(__filename)

const DISABLED = true

export class WebhookPusher {
  private webhookUrl: string

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  async handleEvent(event: Event): Promise<void> {
    if (this.matchesRoutingRules(event)) {
      logger.info('Routing event to webhook')
      this.pushEvent(event)
    }
  }

  private matchesRoutingRules(event: Event) {
    return event._sequence % 2 === 0
  }

  private async pushEvent(event: Event): Promise<void> {
    const promise = new Promise<void>(async (resolve, reject) => {
      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        })

        if (!response.ok) {
          console.error(
            `Failed to push event to webhook: ${response.statusText}`,
          )
          reject()
        }
      } catch (error) {
        console.error(`Error pushing event to webhook: ${error.message}`)
        reject()
      }
      resolve()
    })
    return promise
  }
}
