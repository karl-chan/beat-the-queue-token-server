import { type Browser, type Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { type Provider } from '../provider'
import { newLogger } from '../util'

puppeteer.use(StealthPlugin())

const logger = newLogger('Science Museum')

interface ScienceMuseumToken {
  cookies: Cookie[]
}

interface Cookie {
  name: string
  value: string
}

export class ScienceMuseum implements Provider<ScienceMuseumToken> {
  route = '/science-museum'
  default = { cookies: [] }

  async get (browser: Browser): Promise<ScienceMuseumToken> {
    let page: Page | undefined
    try {
      page = await browser.newPage()
      logger.info('Opened new page')
      page.setDefaultNavigationTimeout(60000)

      // Open science museum events page
      await page.goto('https://my.sciencemuseum.org.uk/events')
      logger.info('Launching website...')

      // Wait for initial results to load
      await page.waitForXPath('//a[text() = "Museum Admission"]')
      logger.info('Loaded events page')

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
      await page?.screenshot({ path: '/tmp/science-museum-error-screenshot.jpg' })
      logger.error('Took screenshot /tmp/science-museum-error-screenshot.jpg...')

      throw err
    } finally {
      await page?.close()
      logger.info('Closed page')
    }
  }
}
