/* eslint-disable no-console */
const isProd = process.env.NODE_ENV === 'production'

export const logger = {
  info: (...args: unknown[]) => {
    if (!isProd) console.info(...args)
  },
  warn: (...args: unknown[]) => {
    if (!isProd) console.warn(...args)
  },
  error: (...args: unknown[]) => console.error(...args),
}
