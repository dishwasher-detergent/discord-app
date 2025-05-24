import { Hono } from 'hono';
import { cors } from 'hono/cors';

import {
  requestFromContext,
  responseForContext,
  throwIfMissing,
} from './lib/utils.js';
import { Interactions } from './routes/interactions.js';

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

Interactions(app);

export default async (context: Context) => {
  throwIfMissing(process.env, [
    'DISCORD_APPLICATION_ID',
    'DISCORD_TOKEN',
    'DISCORD_PUBLIC_KEY',
  ]);

  const request = requestFromContext(context);
  const response = await app.request(request);

  return await responseForContext(context, response);
};
