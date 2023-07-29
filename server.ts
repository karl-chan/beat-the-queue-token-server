import Koa from 'koa';
import { getEvents } from './events';

let events: object[] = []

const refreshInterval = 5 * 60 * 1000 // 5 minutes
async function refreshEvents() {
  console.log('About to refresh events...')
  events = await getEvents()
  console.log('Refreshed events.')
}
refreshEvents()
setInterval(refreshEvents, refreshInterval)

const app = new Koa();
app.use(ctx => {
  ctx.body = events
})
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening on port ${process.env.PORT || 3000}`)
})
