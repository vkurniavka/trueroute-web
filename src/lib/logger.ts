const isProd = process.env.NODE_ENV === 'production'

export const logger = {
  info: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    if (!isProd) console.info(...args)
  },
  warn: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    if (!isProd) console.warn(...args)
  },
  error: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error(...args)
  },
}
