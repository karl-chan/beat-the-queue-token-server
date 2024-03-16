import Router from '@koa/router'
import { Mutex } from 'async-mutex'
import Koa from 'koa'
import { HeadlessBrowser } from './browser'
import { type Provider } from './provider'
import { Odeon } from './providers/odeon'
import { ScienceMuseum } from './providers/science_museum'
import { Vue } from './providers/vue'
import { minutes, newLogger } from './util'

const PROVIDERS = [
  new Odeon(),
  new ScienceMuseum(),
  new Vue()
]
const DEQUEUE_INTERVAL = minutes(1)

const logger = newLogger('Server')
const app = new Koa()
const router = new Router()
const port: number = +(process.env.PORT ?? '3000')

const mutex = new Mutex()
const queue: Array<Provider<object>> = []

app.use(router.routes())
app.listen(port, () => {
  logger.info(`Server listening on port ${port}`)
})

async function main (): Promise<void> {
  const cachedTokens = getDefaultTokens()
  registerRoutes(cachedTokens)
  registerJobs(cachedTokens)

  await dequeue(cachedTokens)
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setInterval(async () => { await dequeue(cachedTokens) }, DEQUEUE_INTERVAL)
}

function registerJobs (cachedTokens: Map<Provider<object>, object>): void {
  for (const provider of PROVIDERS) {
    queue.push(provider)
    setInterval(() => {
      queue.push(provider)
    }, provider.refreshInterval)
  }
}

function getDefaultTokens (): Map<Provider<object>, object> {
  const defaultTokens = new Map<Provider<object>, object>()
  for (const tokenProvider of PROVIDERS) {
    defaultTokens.set(tokenProvider, tokenProvider.default)
  }
  return defaultTokens
}

async function dequeue (cachedTokens: Map<Provider<object>, object>): Promise<void> {
  if (queue.length === 0) {
    // Optimisation, don't launch browser if there is nothing to run
    return
  }
  logger.info(`About to dequeue: ${JSON.stringify(queue.map(e => e.route))}`)
  const release = await mutex.acquire()
  const browser = await new HeadlessBrowser().init()
  const seen = new Set<string>()
  try {
    while (queue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tokenProvider = queue.shift()!

      // Avoid duplicates in case multiple jobs are batched within the same minute
      if (seen.has(tokenProvider.route)) {
        continue
      }
      seen.add(tokenProvider.route)

      logger.info(`Start updateTokens for ${tokenProvider.route}`)
      const newToken = await tokenProvider.get(browser)
      cachedTokens.set(tokenProvider, newToken)
      logger.info(`End updateTokens for ${tokenProvider.route}`)
    }
  } finally {
    await browser.close()
    release()
  }
}

function registerRoutes (tokens: Map<Provider<object>, object>): void {
  for (const tokenProvider of PROVIDERS) {
    router.get(tokenProvider.route, (ctx) => {
      ctx.body = tokens.get(tokenProvider)
    })
  }
}

void main()
