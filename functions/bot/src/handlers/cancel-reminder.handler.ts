import {
  InteractionResponseType,
  MessageComponentTypes,
} from 'discord-interactions';
import { Query } from 'node-appwrite';

import { Context } from 'hono';
import { Reminder } from '../interfaces/reminder.interface.js';
import {
  database,
  DATABASE_ID,
  REMINDER_COLLECTION_ID,
} from '../lib/appwrite.js';
import { EPHEMERAL_FLAG, MAX_REMINDERS_PER_USER } from '../lib/constants.js';

function createErrorResponse(content: string, components: any[] = []) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: EPHEMERAL_FLAG,
      components,
    },
  };
}

function createUpdateErrorResponse(content: string) {
  return {
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: {
      content,
      flags: EPHEMERAL_FLAG,
      components: [],
    },
  };
}

async function listRemindersForCancellation(userId: string) {
  return await database.listDocuments<Reminder>(
    DATABASE_ID,
    REMINDER_COLLECTION_ID,
    [
      Query.equal('userId', userId),
      Query.equal('status', 'pending'),
      Query.orderDesc('$createdAt'),
      Query.limit(MAX_REMINDERS_PER_USER),
    ]
  );
}

function formatDateForDisplay(date: Date): string {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

function formatReminderOption(doc: Reminder) {
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
    description = `Set on: ${formatDateForDisplay(date)}`;
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

function validateUserId(userId: string | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (!userId) {
    return {
      isValid: false,
      error: 'Could not identify user.',
    };
  }
  return { isValid: true };
}

function createSelectMenuResponse(options: any[]) {
  return {
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
  };
}

async function validateReminderForCancellation(
  reminderId: string,
  userId: string
): Promise<{ isValid: boolean; reminder?: Reminder; error?: string }> {
  try {
    const reminder = await database.getDocument<Reminder>(
      DATABASE_ID,
      REMINDER_COLLECTION_ID,
      reminderId
    );

    if (reminder.userId !== userId) {
      return {
        isValid: false,
        error:
          'You can only cancel your own reminders. This selection is invalid.',
      };
    }

    if (reminder.status !== 'pending') {
      return {
        isValid: false,
        error: 'This reminder is no longer pending and cannot be cancelled.',
      };
    }

    return { isValid: true, reminder };
  } catch (error: any) {
    if (error.code === 404) {
      return {
        isValid: false,
        error: `Sorry, I couldn't find the selected reminder (\`${reminderId}\`). It might have been already cancelled or deleted.`,
      };
    }
    throw error;
  }
}

async function cancelReminderInDatabase(reminderId: string): Promise<void> {
  await database.updateDocument(
    DATABASE_ID,
    REMINDER_COLLECTION_ID,
    reminderId,
    {
      status: 'cancelled',
    }
  );
}

export async function handleCancelReminderCommand(
  interaction: any,
  c: Context
) {
  const userId = interaction.member?.user?.id || interaction.user?.id;

  const userValidation = validateUserId(userId);
  if (!userValidation.isValid) {
    return c.json(createErrorResponse(userValidation.error!));
  }

  try {
    const response = await listRemindersForCancellation(userId);

    if (response.documents.length === 0) {
      return c.json(
        createErrorResponse('✨ You have no pending reminders to cancel! ✨')
      );
    }

    const options = response.documents
      .map(formatReminderOption)
      .filter((option) => option.value);

    if (options.length === 0 && response.documents.length > 0) {
      console.error(
        'All reminder documents were filtered out, potentially due to missing $id.'
      );
      return c.json(
        createErrorResponse(
          'Sorry, there was an issue preparing the list of reminders. Some data might be corrupted.'
        )
      );
    }

    return c.json(createSelectMenuResponse(options));
  } catch (error) {
    console.error('Failed to fetch reminders for cancellation:', error);
    return c.json(
      createErrorResponse(
        "Sorry, I couldn't fetch your reminders. Please try again."
      )
    );
  }
}

export async function handleCancelReminderSelect(interaction: any, c: any) {
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const reminderId = interaction.data.values[0];

  const userValidation = validateUserId(userId);
  if (!userValidation.isValid) {
    return c.json(
      createUpdateErrorResponse('Could not identify user for cancellation.')
    );
  }

  if (!reminderId) {
    return c.json(
      createUpdateErrorResponse('No reminder selected or invalid selection.')
    );
  }

  try {
    const reminderValidation = await validateReminderForCancellation(
      reminderId,
      userId
    );
    if (!reminderValidation.isValid) {
      return c.json(createUpdateErrorResponse(reminderValidation.error!));
    }

    await cancelReminderInDatabase(reminderId);

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
    return c.json(
      createUpdateErrorResponse(
        "Sorry, I couldn't cancel your reminder. Please try again."
      )
    );
  }
}
