import pino from 'pino'

const fileTransport = pino.transport({
  target: 'pino/file',
  options: { destination: `./app.log` },
})

export const logger = pino(
  {
    name: 'feed-me-seymour',
    level: process.env.LOG_LEVEL || 'info',
  },
  process.env['ENVIRONMENT'] == 'development' ? fileTransport : undefined,
)

export const rootLogger = logger

export function getLogger(name: string) {
  return logger.child({ filename: name })
}

function disableConsoleLogging() {
  const die = () => {
    throw new Error('console.log called')
  }
  var DEBUG = false
  if (!DEBUG) {
    var methods = ['log', 'debug', 'warn', 'info']
    for (var i = 0; i < methods.length; i++) {
      console[methods[i]] = die
    }
  }
}
// disableConsoleLogging()
