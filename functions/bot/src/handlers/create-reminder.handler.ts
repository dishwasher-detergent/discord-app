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

function createErrorResponse(content: string) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: EPHEMERAL_FLAG,
    },
  };
}

function validateTimeFormat(reminderTimeInput: string): {
  isValid: boolean;
  error?: string;
} {
  const timeRegex = /^(\d+)([mhd])$/i;
  const isValidFormat = timeRegex.test(reminderTimeInput);

  if (!isValidFormat) {
    return {
      isValid: false,
      error:
        "Sorry, that's not a valid time format. Please use formats like `30m` (minutes), `2h` (hours), or `1d` (days).",
    };
  }

  return { isValid: true };
}

function validateTimeDuration(reminderTimeInput: string): {
  isValid: boolean;
  error?: string;
} {
  const timeRegex = /^(\d+)([mhd])$/i;
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
      return {
        isValid: false,
        error:
          'Sorry, the maximum reminder time is 30 days. Please enter a shorter duration.',
      };
    }
  }

  return { isValid: true };
}

async function checkForDuplicateReminder(
  userId: string,
  targetMessageId: string
): Promise<{ hasDuplicate: boolean; error?: string }> {
  try {
    const existingMessageReminder = await database.listDocuments<Reminder>(
      DATABASE_ID,
      REMINDER_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('targetMessageId', targetMessageId),
        Query.equal('status', 'pending'),
        Query.limit(1),
      ]
    );

    if (existingMessageReminder.total > 0) {
      return {
        hasDuplicate: true,
        error:
          '⚠️ You already have a pending reminder for this message. Please cancel the existing reminder first if you want to create a new one.',
      };
    }

    return { hasDuplicate: false };
  } catch (error) {
    console.error('Error checking for duplicate reminder:', error);
    throw error;
  }
}

async function checkReminderLimit(
  userId: string
): Promise<{ exceedsLimit: boolean; error?: string }> {
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
      return {
        exceedsLimit: true,
        error: `⚠️ You've reached the maximum limit of ${MAX_REMINDERS_PER_USER} pending reminders. Please cancel some old ones before adding new ones.`,
      };
    }

    return { exceedsLimit: false };
  } catch (error) {
    console.error('Error checking reminder limit:', error);
    throw error;
  }
}

async function createReminderDocument(
  userId: string,
  guildId: string,
  channelId: string,
  targetMessageId: string,
  reminderTimeInput: string
): Promise<Reminder> {
  try {
    const reminderDateTime = calculateReminderTime(
      reminderTimeInput,
      new Date()
    ).toISOString();

    const res = await database.createDocument(
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

    return res as Reminder;
  } catch (error) {
    console.error('Error creating reminder document:', error);
    throw error;
  }
}

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

  const timeFormatValidation = validateTimeFormat(reminderTimeInput);
  if (!timeFormatValidation.isValid) {
    return c.json(createErrorResponse(timeFormatValidation.error!));
  }

  const timeDurationValidation = validateTimeDuration(reminderTimeInput);
  if (!timeDurationValidation.isValid) {
    return c.json(createErrorResponse(timeDurationValidation.error!));
  }

  if (!userId) {
    console.error('User ID not found in modal submission');
    return c.json(
      createErrorResponse(
        "Sorry, I couldn't identify you to save the reminder."
      )
    );
  }

  try {
    const duplicateCheck = await checkForDuplicateReminder(
      userId,
      targetMessageId
    );
    if (duplicateCheck.hasDuplicate) {
      return c.json(createErrorResponse(duplicateCheck.error!));
    }

    const limitCheck = await checkReminderLimit(userId);
    if (limitCheck.exceedsLimit) {
      return c.json(createErrorResponse(limitCheck.error!));
    }

    const reminderDocument = await createReminderDocument(
      userId,
      guildId,
      channelId,
      targetMessageId,
      reminderTimeInput
    );

    const reminderTimestamp = Math.floor(
      new Date(reminderDocument.reminderDateTime).getTime() / 1000
    );

    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Okay, I'll remind you about that message at <t:${reminderTimestamp}:f>`,
        flags: EPHEMERAL_FLAG,
      },
    });
  } catch (error) {
    console.error('Failed to save reminder to Appwrite:', error);
    return c.json(
      createErrorResponse(
        "Sorry, I couldn't save your reminder. Please try again."
      )
    );
  }
}
