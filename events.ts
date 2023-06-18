import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

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
    headless: true
  })

  // Open science museum events page
  const page = await browser.newPage()
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
  let jsonResponse = null
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
  await page.waitForXPath(`//*[@id="tn-event-listing-view-results-heading" and contains(text(), ${nextYear})]`)
  console.log('Loaded events page (until next year)')

  if (jsonResponse === null) {
    throw new Error("/api/products/productionseasons was never called!")
  }

  await browser.close()
  console.log('Closed browser')

  return jsonResponse
}
