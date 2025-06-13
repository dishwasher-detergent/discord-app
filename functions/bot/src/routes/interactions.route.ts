import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from 'discord-interactions';
import { Hono } from 'hono';

import {
  handleCancelReminderCommand,
  handleCancelReminderSelect,
} from '../handlers/cancel-reminder.handler.js';
import {
  handleCreateReminderCommand,
  handleReminderModalSubmit,
} from '../handlers/create-reminder.handler.js';
import { handleListRemindersCommand } from '../handlers/list-reminders.handler.js';
import { DISCORD_PUBLIC_KEY, EPHEMERAL_FLAG } from '../lib/constants.js';

export function Interactions(app: Hono) {
  app.post('/interactions', async (c) => {
    if (!DISCORD_PUBLIC_KEY) {
      console.error('DISCORD_PUBLIC_KEY is not configured');
      return c.json({ error: 'Server configuration error' }, 500);
    }

    const signature = c.req.header('x-signature-ed25519');
    const timestamp = c.req.header('x-signature-timestamp');

    if (!signature || !timestamp) {
      console.warn('Missing signature headers', {
        signature: !!signature,
        timestamp: !!timestamp,
      });
      return c.json({ error: 'Bad request signature' }, 401);
    }

    const rawBody = await c.req.text();

    if (!rawBody) {
      console.warn('Empty request body');
      return c.json({ error: 'Bad request signature' }, 401);
    }

    let isValidRequest: boolean;

    try {
      isValidRequest = await verifyKey(
        rawBody,
        signature,
        timestamp,
        DISCORD_PUBLIC_KEY
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return c.json({ error: 'Bad request signature' }, 401);
    }

    if (!isValidRequest) {
      console.warn('Invalid Discord signature');
      return c.json({ error: 'Bad request signature' }, 401);
    }

    let interaction;

    try {
      interaction = JSON.parse(rawBody);
    } catch (error) {
      console.error('Failed to parse interaction JSON:', error);
      return c.json({ error: 'Bad request signature' }, 401);
    }

    if (interaction.type === InteractionType.PING) {
      return c.json({ type: InteractionResponseType.PONG });
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { name } = interaction.data;
      const userId = interaction.member?.user?.id || interaction.user?.id;

      switch (name) {
        case 'create':
          return handleCreateReminderCommand(interaction, c);
        case 'list':
          const statusOption = interaction.data.options?.find(
            (option: any) => option.name === 'status'
          )?.value;
          return handleListRemindersCommand(userId, c, statusOption);
        case 'cancel':
          return handleCancelReminderCommand(interaction, c);
        default:
          console.warn('Unhandled application command name:', name);
          return c.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "Sorry, I don't know how to handle that command.",
              flags: EPHEMERAL_FLAG,
            },
          });
      }
    } else if (interaction.type === InteractionType.MODAL_SUBMIT) {
      const customId = interaction.data.custom_id;
      if (customId.startsWith('reminder_modal:')) {
        return handleReminderModalSubmit(interaction, c);
      } else {
        console.warn('Unhandled modal custom_id:', customId);
        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Sorry, I don't know how to handle that action.",
            flags: EPHEMERAL_FLAG,
          },
        });
      }
    } else if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const customId = interaction.data.custom_id;
      if (customId === 'cancel_reminder_select') {
        return handleCancelReminderSelect(interaction, c);
      } else {
        console.warn('Unhandled message component custom_id:', customId);
        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Sorry, I don't know how to handle that action.",
            flags: EPHEMERAL_FLAG,
          },
        });
      }
    }

    console.warn('Unhandled interaction type:', interaction.type);
    return c.json({ type: InteractionResponseType.PONG });
  });
}
