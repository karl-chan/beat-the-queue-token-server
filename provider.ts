import { type Browser } from 'puppeteer'

export interface Provider<Token> {
  route: string
  default: Token
  refreshInterval: number
  get: (browser: Browser) => Promise<Token>
}
