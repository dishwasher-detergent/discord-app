import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from 'discord-interactions';
import { Hono } from 'hono';

import { DISCORD_PUBLIC_KEY } from '../lib/constants.js';

export function Interactions(app: Hono) {
  app.post('/interactions', async (c) => {
    const signature = c.req.header('x-signature-ed25519');
    const timestamp = c.req.header('x-signature-timestamp');

    if (!signature || !timestamp) {
      return c.json({ error: 'Invalid request signature' }, 401);
    }

    const rawBody = await c.req.text();

    const isValidRequest = verifyKey(
      rawBody,
      signature,
      timestamp,
      DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const interaction = JSON.parse(rawBody);
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { name } = interaction.data;

      if (name === 'hello') {
        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Hello, Discord world!',
          },
        });
      }

      return c.json(
        {
          type: InteractionResponseType.PONG,
        },
        200
      );
    }
  });
}
