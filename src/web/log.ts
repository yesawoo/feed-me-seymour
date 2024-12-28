import expressPino from 'express-pino-logger'

export const logRequest = expressPino({
  level: 'info',
  enabled: true,
})
