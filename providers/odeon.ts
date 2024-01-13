import { type Browser, type Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { type Provider } from '../provider'
import { newLogger } from '../util'

puppeteer.use(StealthPlugin())

const logger = newLogger('Odeon')

interface OdeonToken {
  jwtToken: string
}

export class Odeon implements Provider<OdeonToken> {
  route = '/odeon'
  default = { jwtToken: '' }

  async get (browser: Browser): Promise<OdeonToken> {
    let page: Page | undefined
    try {
      page = await browser.newPage()
      logger.info('Opened new page')
      page.setDefaultNavigationTimeout(120000)
      page.setDefaultTimeout(120000)

      // Open odeon page
      await page.goto('https://www.odeon.co.uk/')
      logger.info('Launching website...')

      // Wait for page to load
      await page.waitForXPath('//script[contains(text(), "authToken")]')
      logger.info('Loaded page with authToken')

      const html = await page.content()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const jwtToken = html.match(/"authToken":"([^"]+)"/)![1]
      return { jwtToken }
    } catch (err) {
      logger.error(err)

      // Take screenshot for debugging in case of WAF
      await page?.screenshot({ path: '/tmp/odeon-error-screenshot.jpg' })
      logger.error('Took screenshot /tmp/odeon-error-screenshot.jpg...')

      throw err
    } finally {
      await page?.close()
      logger.info('Closed page')
    }
  }
}
