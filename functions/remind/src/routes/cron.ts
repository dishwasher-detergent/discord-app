import { Hono } from 'hono';
import { Models, Query } from 'node-appwrite';
import {
  database,
  DATABASE_ID,
  REMINDER_COLLECTION_ID,
} from '../lib/appwrite.js';
import { calculateReminderTime, sendDiscordMessage } from '../lib/utils.js';

export interface Reminder extends Models.Document {
  userId: string;
  guildId: string;
  channelId: string;
  targetMessageId: string;
  reminderTimeInput: string;
  status: string;
  $createdAt: string;
}

export function Cron(app: Hono) {
  app.post('/', async (c) => {
    try {
      console.log('Cron job started');

      const now = new Date();
      const pendingReminders = await database.listDocuments<Reminder>(
        DATABASE_ID,
        REMINDER_COLLECTION_ID,
        [Query.equal('status', 'pending'), Query.limit(5000)]
      );

      if (pendingReminders.total === 0) {
        console.log('No pending reminders found.');
        return c.json({ message: 'No pending reminders.' }, 200);
      }

      const dueReminders: Reminder[] = [];
      for (const reminder of pendingReminders.documents) {
        const reminderTime = calculateReminderTime(
          reminder.reminderTimeInput,
          new Date(reminder.$createdAt)
        );
        if (now >= reminderTime) {
          dueReminders.push(reminder);
        }
      }

      if (dueReminders.length === 0) {
        console.log('No reminders currently due for processing.');
        return c.json({ message: 'No reminders currently due.' }, 200);
      }

      let successfullyProcessed = 0;
      let failedToProcess = 0;

      for (const reminder of dueReminders) {
        try {
          const message = `Hey <@${reminder.userId}>, here's your reminder! [View original message](<https://discord.com/channels/${reminder.guildId}/${reminder.channelId}/${reminder.targetMessageId}>)`;
          await sendDiscordMessage(reminder.userId, message);

          await database.updateDocument(
            DATABASE_ID,
            REMINDER_COLLECTION_ID,
            reminder.$id,
            {
              status: 'complete',
            }
          );
          console.log(`Reminder ${reminder.$id} processed and completed.`);
          successfullyProcessed++;
        } catch (err) {
          console.error(`Error processing reminder ${reminder.$id}:`, err);
          failedToProcess++;

          try {
            await database.updateDocument(
              DATABASE_ID,
              REMINDER_COLLECTION_ID,
              reminder.$id,
              {
                status: 'failed',
              }
            );
            console.log(`Reminder ${reminder.$id} marked as failed.`);
          } catch (updateError) {
            console.error(
              `Error updating status for reminder ${reminder.$id}:`,
              updateError
            );
          }
        }
      }

      return c.json(
        {
          message: 'Cron job execution finished.',
          processed: successfullyProcessed,
          failed: failedToProcess,
          totalDue: dueReminders.length,
        },
        200
      );
    } catch (error) {
      console.error('Error in cron job:', error);
      return c.json({ error: 'Failed to execute cron job' }, 500);
    }
  });
}
