import { getLogger } from '../../util/logging'
import { FilterMatcher } from '../filters/filter'

const logger = getLogger(__filename)

type Sink = { name: string; push: (event: any) => void }

export interface RoutingRule {
  filter: FilterMatcher
  sink: Sink
}

class EventRouter {
  private routingRules: RoutingRule[]

  constructor(routingRules: RoutingRule[]) {
    this.routingRules = routingRules
  }

  route(event: any): void {
    for (const rule of this.routingRules) {
      if (rule.filter(event)) {
        logger.info(`Routing event ${event.id} to sink: ${rule.sink.name}`)
        rule.sink.push(event)
      }
    }
  }
}

export default EventRouter
