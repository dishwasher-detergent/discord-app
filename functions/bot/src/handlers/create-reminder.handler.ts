import { InteractionResponseType } from 'discord-interactions';
import { ID, Query } from 'node-appwrite';

import { Context } from 'hono';
import { Reminder } from '../interfaces/reminder.interface.js';
import {
  database,
  DATABASE_ID,
  REMINDER_COLLECTION_ID,
} from '../lib/appwrite.js';
import { EPHEMERAL_FLAG, MAX_REMINDERS_PER_USER } from '../lib/constants.js';
import { calculateReminderTime } from '../lib/utils.js';

export async function handleCreateReminderCommand(
  interaction: any,
  c: Context
) {
  const targetMessageId = interaction.data.target_id;
  return c.json({
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: `reminder_modal:${targetMessageId}`,
      title: 'Set a Reminder',
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'reminder_time_input',
              label: 'When to remind you?',
              style: 1,
              min_length: 1,
              placeholder: 'e.g., 30m, 2h, 1d',
              required: true,
            },
          ],
        },
      ],
    },
  });
}

export async function handleReminderModalSubmit(interaction: any, c: Context) {
  const customId = interaction.data.custom_id;
  const targetMessageId = customId.split(':')[1];
  const reminderTimeInput =
    interaction.data.components[0].components[0].value.trim();
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const guildId = interaction.guild_id;
  const channelId = interaction.channel_id;

  const timeRegex = /^(\d+)([mhd])$/i;
  const isValidFormat = timeRegex.test(reminderTimeInput);

  if (!isValidFormat) {
    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content:
          "Sorry, that's not a valid time format. Please use formats like `30m` (minutes), `2h` (hours), or `1d` (days).",
        flags: EPHEMERAL_FLAG,
      },
    });
  }

  const match = reminderTimeInput.match(timeRegex);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    let durationInMilliseconds = 0;

    if (unit === 'm') {
      durationInMilliseconds = value * 60 * 1000;
    } else if (unit === 'h') {
      durationInMilliseconds = value * 60 * 60 * 1000;
    } else if (unit === 'd') {
      durationInMilliseconds = value * 24 * 60 * 60 * 1000;
    }

    const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1000;

    if (durationInMilliseconds > thirtyDaysInMilliseconds) {
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content:
            'Sorry, the maximum reminder time is 30 days. Please enter a shorter duration.',
          flags: EPHEMERAL_FLAG,
        },
      });
    }
  }

  if (!userId) {
    console.error('User ID not found in modal submission');
    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Sorry, I couldn't identify you to save the reminder.",
        flags: EPHEMERAL_FLAG,
      },
    });
  }

  try {
    const existingReminders = await database.listDocuments<Reminder>(
      DATABASE_ID,
      REMINDER_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('status', 'pending'),
        Query.limit(MAX_REMINDERS_PER_USER),
      ]
    );

    if (existingReminders.total >= MAX_REMINDERS_PER_USER) {
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `⚠️ You've reached the maximum limit of ${MAX_REMINDERS_PER_USER} pending reminders. Please cancel some old ones before adding new ones.`,
          flags: EPHEMERAL_FLAG,
        },
      });
    }

    const reminderDateTime = calculateReminderTime(
      reminderTimeInput,
      new Date()
    ).toISOString();

    let res = await database.createDocument(
      DATABASE_ID,
      REMINDER_COLLECTION_ID,
      ID.unique(),
      {
        userId,
        guildId,
        channelId,
        targetMessageId,
        reminderTimeInput,
        reminderDateTime,
        status: 'pending',
      }
    );

    const remainderTimestamp = Math.floor(
      new Date(res.reminderDateTime).getTime() / 1000
    );

    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Okay, I'll remind you about that message at <t:${remainderTimestamp}:f>`,
        flags: EPHEMERAL_FLAG,
      },
    });
  } catch (error) {
    console.error('Failed to save reminder to Appwrite:', error);

    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Sorry, I couldn't save your reminder. Please try again.",
        flags: EPHEMERAL_FLAG,
      },
    });
  }
}
