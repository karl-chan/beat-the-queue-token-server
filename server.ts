import Router from '@koa/router'
import Koa from 'koa'
import { HeadlessBrowser } from './browser'
import { type Provider } from './provider'
import { Odeon } from './providers/odeon'
import { ScienceMuseum } from './providers/science_museum'
import { Vue } from './providers/vue'
import { hours, newLogger } from './util'

const PROVIDERS = [
  new Odeon(),
  new ScienceMuseum(),
  new Vue()
]
const REFRESH_INTERVAL = hours(6)

const logger = newLogger('Server')
const app = new Koa()
const router = new Router()
const port: number = +(process.env.PORT ?? '3000')

app.use(router.routes())
app.listen(port, () => {
  logger.info(`Server listening on port ${port}`)
})

async function main (): Promise<void> {
  const cachedTokens = getDefaultTokens()
  registerRoutes(cachedTokens)

  await updateTokens(cachedTokens)
  setInterval(() => { void updateTokens(cachedTokens) }, REFRESH_INTERVAL)
}

function getDefaultTokens (): Map<Provider<any>, object> {
  const defaultTokens = new Map<Provider<any>, object>()
  for (const tokenProvider of PROVIDERS) {
    defaultTokens.set(tokenProvider, tokenProvider.default)
  }
  return defaultTokens
}

async function updateTokens (cachedTokens: Map<Provider<any>, object>): Promise<void> {
  const browser = await new HeadlessBrowser().init()
  for (const tokenProvider of PROVIDERS) {
    logger.info(`Start updateTokens for ${tokenProvider.route}`)
    const newToken = await tokenProvider.get(browser)
    cachedTokens.set(tokenProvider, newToken)
    logger.info(`End updateTokens for ${tokenProvider.route}`)
  }
  await browser.close()
}

function registerRoutes (tokens: Map<Provider<any>, object>): void {
  for (const tokenProvider of PROVIDERS) {
    router.get(tokenProvider.route, (ctx) => {
      ctx.body = tokens.get(tokenProvider)
    })
  }
}

void main()
