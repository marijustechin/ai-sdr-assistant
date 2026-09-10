import { pino } from 'pino';

const level = process.env.NODE_ENV === 'test' ? 'silent' : 'info';

export const logger = pino({ level });
