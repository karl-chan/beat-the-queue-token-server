import { type Browser } from 'puppeteer'

export interface Provider<Token> {
  route: string
  default: Token
  get: (browser: Browser) => Promise<Token>
}
