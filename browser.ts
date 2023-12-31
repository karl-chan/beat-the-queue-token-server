import { type Browser } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { newLogger } from './util'

const logger = newLogger('Browser')

puppeteer.use(StealthPlugin())

export class HeadlessBrowser {
  async init (): Promise<Browser> {
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      headless: process.env.NODE_ENV === 'production' ? 'new' : false
    })
    logger.info('Initialised browser')

    return browser
  }
}
