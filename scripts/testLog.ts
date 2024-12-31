import { getLogger } from '../src/util/logging'

const log = getLogger('testLog')

log.info({ cum: 'farts' }, 'Test Log.')
