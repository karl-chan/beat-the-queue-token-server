import Koa from 'koa';
import EventsProvider from './events';

let events: object[] = []

const refreshInterval = 5 * 60 * 1000 // 5 minutes

async function main() {
  const provider = new EventsProvider()
  await provider.init()

  async function refreshEvents() {
    console.log('About to refresh events...')
    events = await provider.getEvents()
    console.log('Refreshed events')
  }

  refreshEvents()
  setInterval(refreshEvents, refreshInterval)
}

const app = new Koa()
app.use(ctx => {
  ctx.body = events
})
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening on port ${process.env.PORT || 3000}`)
})

main()