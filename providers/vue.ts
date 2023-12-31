import { type Browser, type Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { type Provider } from '../provider'
import { newLogger } from '../util'

puppeteer.use(StealthPlugin())

const logger = newLogger('Vue')

interface VueToken {
  cookies: Cookie[]
}

interface Cookie {
  name: string
  value: string
}

export class Vue implements Provider<VueToken> {
  route = '/vue'
  default = { cookies: [] }

  async get (browser: Browser): Promise<VueToken> {
    let page: Page | undefined
    try {
      page = await browser.newPage()
      logger.info('Opened new page')
      page.setDefaultNavigationTimeout(60000)

      // Open science museum events page
      await page.goto('https://www.myvue.com/')
      logger.info('Launching website...')

      // Wait for initial results to load
      await page.waitForXPath('//div[text()="ABOUT VUE"]')
      logger.info('Loaded home page')

      const cookies = await page.cookies()
      return {
        cookies: cookies.map(cookie => {
          return {
            name: cookie.name,
            value: cookie.value
          }
        })
      }
    } catch (err) {
      logger.error(err)

      // Take screenshot for debugging in case of WAF
      await page?.screenshot({ path: '/tmp/vue-error-screenshot.jpg' })
      logger.error('Took screenshot /tmp/vue-error-screenshot.jpg...')

      throw (err)
    } finally {
      await page?.close()
      logger.info('Closed page')
    }
  }
}
