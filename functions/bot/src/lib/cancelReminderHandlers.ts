import {
  InteractionResponseType,
  MessageComponentTypes,
} from 'discord-interactions';
import { Query } from 'node-appwrite';

import { database, DATABASE_ID, REMINDER_COLLECTION_ID } from './appwrite.js';
import { EPHEMERAL_FLAG } from './constants.js';

async function listRemindersForCancellation(userId: string) {
  return await database.listDocuments(DATABASE_ID, REMINDER_COLLECTION_ID, [
    Query.equal('userId', userId),
    Query.equal('status', 'pending'),
    Query.orderDesc('$createdAt'),
    Query.limit(25),
  ]);
}

function formatReminderOption(doc: any) {
  const docId = doc.$id;
  const reminderTime = doc.reminderTimeInput || 'N/A';

  let createdAtTimestamp: number | null = null;
  if (doc.$createdAt) {
    const date = new Date(doc.$createdAt);
    if (!isNaN(date.getTime())) {
      createdAtTimestamp = Math.floor(date.getTime() / 1000);
    }
  }

  let label: string;
  let description: string;

  if (createdAtTimestamp !== null) {
    label = `Remind: ${reminderTime}`;
    const date = new Date(doc.$createdAt);
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    description = `Set on: ${year}-${month}-${day} ${hours}:${minutes} UTC`;
  } else {
    label = `Remind: ${reminderTime} (date unknown)`;
    description = `Set on: date unknown`;
  }

  if (label.length > 100) {
    label = label.substring(0, 97) + '...';
  }
  if (description.length > 100) {
    description = description.substring(0, 97) + '...';
  }

  return {
    label: label,
    value: docId,
    description: description,
  };
}

export async function handleCancelReminderCommand(interaction: any, c: any) {
  const userId = interaction.member?.user?.id || interaction.user?.id;

  if (!userId) {
    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Could not identify user.',
        flags: EPHEMERAL_FLAG,
      },
    });
  }

  try {
    const response = await listRemindersForCancellation(userId);

    if (response.documents.length === 0) {
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '✨ You have no pending reminders to cancel! ✨',
          flags: EPHEMERAL_FLAG,
        },
      });
    }

    const options = response.documents
      .map(formatReminderOption)
      .filter((option) => option.value);

    if (options.length === 0 && response.documents.length > 0) {
      console.error(
        'All reminder documents were filtered out, potentially due to missing $id.'
      );
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content:
            'Sorry, there was an issue preparing the list of reminders. Some data might be corrupted.',
          flags: EPHEMERAL_FLAG,
        },
      });
    }

    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Select a reminder to cancel:',
        flags: EPHEMERAL_FLAG,
        components: [
          {
            type: MessageComponentTypes.ACTION_ROW,
            components: [
              {
                type: MessageComponentTypes.STRING_SELECT,
                custom_id: 'cancel_reminder_select',
                placeholder: 'Choose a reminder...',
                options: options,
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    console.error('Failed to fetch reminders for cancellation:', error);
    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Sorry, I couldn't fetch your reminders. Please try again.",
        flags: EPHEMERAL_FLAG,
      },
    });
  }
}

export async function handleCancelReminderSelect(interaction: any, c: any) {
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const reminderId = interaction.data.values[0];

  if (!userId) {
    return c.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: 'Could not identify user for cancellation.',
        flags: EPHEMERAL_FLAG,
        components: [],
      },
    });
  }

  if (!reminderId) {
    return c.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: 'No reminder selected or invalid selection.',
        flags: EPHEMERAL_FLAG,
        components: [],
      },
    });
  }

  try {
    const reminder = await database.getDocument(
      DATABASE_ID,
      REMINDER_COLLECTION_ID,
      reminderId
    );

    if (reminder.userId !== userId) {
      return c.json({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content:
            'You can only cancel your own reminders. This selection is invalid.',
          flags: EPHEMERAL_FLAG,
          components: [],
        },
      });
    }

    if (reminder.status !== 'pending') {
      return c.json({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content:
            'This reminder is no longer pending and cannot be cancelled.',
          flags: EPHEMERAL_FLAG,
          components: [],
        },
      });
    }

    await database.updateDocument(
      DATABASE_ID,
      REMINDER_COLLECTION_ID,
      reminderId,
      {
        status: 'cancelled',
      }
    );

    return c.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: `✅ Reminder with ID \`${reminderId}\` has been cancelled.`,
        flags: EPHEMERAL_FLAG,
        components: [],
      },
    });
  } catch (error: any) {
    console.error('Failed to cancel reminder via select:', error);
    if (error.code === 404) {
      return c.json({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content: `Sorry, I couldn't find the selected reminder (\`${reminderId}\`). It might have been already cancelled or deleted.`,
          flags: EPHEMERAL_FLAG,
          components: [],
        },
      });
    }
    return c.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: "Sorry, I couldn't cancel your reminder. Please try again.",
        flags: EPHEMERAL_FLAG,
        components: [],
      },
    });
  }
}
