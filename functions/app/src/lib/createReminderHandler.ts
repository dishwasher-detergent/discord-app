import { InteractionResponseType } from 'discord-interactions';
import { ID, Query } from 'node-appwrite';

import { database, DATABASE_ID, REMINDER_COLLECTION_ID } from './appwrite.js';
import { EPHEMERAL_FLAG } from './constants.js';

export async function handleCreateReminderCommand(interaction: any, c: any) {
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

export async function handleReminderModalSubmit(interaction: any, c: any) {
  const customId = interaction.data.custom_id;
  const targetMessageId = customId.split(':')[1];
  const reminderTimeInput =
    interaction.data.components[0].components[0].value.trim();
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const guildId = interaction.guild_id;
  const channelId = interaction.channel_id;

  const timeRegex = /^(\\d+)([mhd])$/i;
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
    const existingReminders = await database.listDocuments(
      DATABASE_ID,
      REMINDER_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('status', 'pending'),
        Query.limit(25),
      ]
    );

    if (existingReminders.total >= 25) {
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content:
            "⚠️ You've reached the maximum limit of 25 pending reminders. Please cancel some old ones before adding new ones.",
          flags: EPHEMERAL_FLAG,
        },
      });
    }

    await database.createDocument(
      DATABASE_ID,
      REMINDER_COLLECTION_ID,
      ID.unique(),
      {
        userId,
        guildId,
        channelId,
        targetMessageId,
        reminderTimeInput,
        status: 'pending',
      }
    );

    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Okay, I'll remind you about that message! (Time: ${reminderTimeInput})`,
        flags: EPHEMERAL_FLAG,
      },
    });
  } catch (error) {
    console.error('Failed to save reminder to Appwrite:', error);
    const appwriteError = error as any;
    if (appwriteError.response) {
      console.error('Appwrite error response:', appwriteError.response);
    }
    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Sorry, I couldn't save your reminder. Please try again.",
        flags: EPHEMERAL_FLAG,
      },
    });
  }
}
