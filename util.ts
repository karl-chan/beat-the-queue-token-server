import dayjs, { extend } from 'dayjs'
import duration from 'dayjs/plugin/duration'
import winston, { createLogger, format, type Logger } from 'winston'

extend(duration)

export function hours (hours: number): number {
  return dayjs.duration({ hours }).asMilliseconds()
}

export function newLogger (name: string): Logger {
  const { label, timestamp, combine, colorize, align, printf } = format
  return createLogger({
    format: combine(
      align(),
      colorize(),
      label({ label: name }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      printf(({ level, message, label, timestamp }) => {
        return `${timestamp} [${label}] ${level}: ${message}`
      })
    ),
    transports: [new winston.transports.Console()]
  })
}
