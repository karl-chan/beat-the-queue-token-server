import fs from 'fs/promises';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin())

export async function getEvents(): Promise<object[]> {
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
    headless: 'new'
  })
  const chromeTmpDataDir = browser.process()?.spawnargs
    .find(arg => arg.startsWith("--user-data-dir"))
    ?.replace("--user-data-dir=", "")

  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)

  let jsonResponse: object[] = []
  try {
    // Open science museum events page
    await page.goto('https://my.sciencemuseum.org.uk/events')
    console.log('Launching website...')

    // Wait for initial results to load
    await page.waitForXPath('//a[text() = "Museum Admission"]')
    console.log('Loaded events page')

    // Open date selector
    await page.click('.tn-events-list-view__datepicker-container--to button')
    console.log('Opened date selector')

    // Get current year 
    const toYearDiv = (await page.$('.year:not(.nav)'))!
    const toYear = await toYearDiv.evaluate(e => +e.textContent!)
    const nextYear = toYear + 1
    console.log(`Got next year ${nextYear}`)

    // Register handler in advance for productionseasons call
    page.on('response', async (response) => {
      const request = response.request();
      if (request.url().includes('/api/products/productionseasons')) {
        jsonResponse = await response.json()
      }
    })

    // Press right arrow to next year
    await page.click('.nav.btn.next.year')
    console.log('Pressed right arrow')

    // Click 1st of month
    await page.waitForSelector('.day')
    const dates = await page.$$('.day')
    await dates.at(0)?.click()
    console.log('Clicked 1st of month')

    // Wait for results
    await page.waitForXPath(
      `//*[@id="tn-event-listing-view-results-heading" and contains(text(), ${nextYear})]`,
      { timeout: 60000 }
    )
    console.log('Loaded events page (until next year)')

    if (jsonResponse === null) {
      throw new Error("/api/products/productionseasons was never called!")
    }

  } catch (err) {
    console.error(err)

    // Take screenshot for debugging in case of WAF
    await page.screenshot({ path: '/tmp/science-museum-error-screenshot.jpg' })
    console.log('Took screenshot /tmp/science-museum-error-screenshot.jpg...')

  } finally {
    await page.close()
    console.log('Closed page')
    await browser.close()
    console.log('Closed browser')

    if (chromeTmpDataDir !== null) {
      await fs.rm(chromeTmpDataDir!, { recursive: true, force: true })
      console.log(`Deleted puppeteer temp dir ${chromeTmpDataDir}`)
    }
  }

  return jsonResponse
}
