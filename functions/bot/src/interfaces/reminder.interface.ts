import { Models } from 'node-appwrite';

export interface Reminder extends Models.Document {
  userId: string;
  guildId: string;
  channelId: string;
  targetMessageId: string;
  reminderTimeInput: string;
  reminderDateTime: Date;
  status: 'pending' | 'complete' | 'cancelled' | 'failed';
}
