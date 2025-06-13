import { InteractionResponseType } from 'discord-interactions';
import { Query } from 'node-appwrite';

import { database, DATABASE_ID, REMINDER_COLLECTION_ID } from './appwrite.js';
import { EPHEMERAL_FLAG } from './constants.js';

export async function handleListRemindersCommand(
  userId: string | undefined,
  c: any
) {
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
    const response = await database.listDocuments(
      DATABASE_ID,
      REMINDER_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('status', 'pending'),
        Query.orderDesc('$createdAt'),
      ]
    );

    if (response.documents.length === 0) {
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '✨ You have no pending reminders! ✨',
          flags: EPHEMERAL_FLAG,
        },
      });
    }

    let content = '**🗓️ Your Pending Reminders:**\\n\\n';
    response.documents.forEach((doc: any) => {
      let messageContext = `[View original message](<https://discord.com/channels/${doc.guildId}/${doc.channelId}/${doc.targetMessageId}>)`;
      const createdAtTimestamp = Math.floor(
        new Date(doc.$createdAt).getTime() / 1000
      );
      content += `- Remind \`${doc.reminderTimeInput}\` after <t:${createdAtTimestamp}:f> - ${messageContext}\\n`;
    });

    if (content.length > 2000) {
      content = content.substring(0, 1990) + '... (list truncated)';
    }

    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: content,
        flags: EPHEMERAL_FLAG,
      },
    });
  } catch (error) {
    console.error('Failed to fetch reminders from Appwrite:', error);
    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Sorry, I couldn't fetch your reminders. Please try again.",
        flags: EPHEMERAL_FLAG,
      },
    });
  }
}
