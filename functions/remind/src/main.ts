import { Hono } from 'hono';
import { cors } from 'hono/cors';

import {
  requestFromContext,
  responseForContext,
  throwIfMissing,
} from './lib/utils.js';
import { Cron } from './routes/cron.js';

export interface Context {
  req: any;
  res: any;
  log: (msg: any) => void;
  error: (msg: any) => void;
}

const app = new Hono();

app.use('*', cors());

app.onError((err, c) => {
  return c.json(err, 500);
});

Cron(app);

export default async (context: Context) => {
  throwIfMissing(process.env, [
    'DISCORD_APPLICATION_ID',
    'DISCORD_TOKEN',
    'DISCORD_PUBLIC_KEY',
    'API_KEY',
    'DATABASE_ID',
    'REMINDER_COLLECTION_ID',
  ]);

  const request = requestFromContext(context);
  const response = await app.request(request);

  return await responseForContext(context, response);
};
