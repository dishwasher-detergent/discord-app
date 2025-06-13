import { InteractionResponseType } from 'discord-interactions';
import { Query } from 'node-appwrite';

import { database, DATABASE_ID, REMINDER_COLLECTION_ID } from './appwrite.js';
import { EPHEMERAL_FLAG } from './constants.js';

export async function handleListRemindersCommand(
  userId: string | undefined,
  c: any,
  statusOption?: string
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
    const statusToQuery = statusOption || 'pending';

    const response = await database.listDocuments(
      DATABASE_ID,
      REMINDER_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('status', statusToQuery),
        Query.orderDesc('$createdAt'),
      ]
    );

    if (response.documents.length === 0) {
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `✨ You have no ${statusToQuery} reminders! ✨`,
          flags: EPHEMERAL_FLAG,
        },
      });
    }

    let content = `**🗓️ Your ${statusToQuery} Reminders:** \n\n`;
    response.documents.forEach((doc: any) => {
      let messageContext = `[View original message](<https://discord.com/channels/${doc.guildId}/${doc.channelId}/${doc.targetMessageId}>)`;
      const reminderTimestamp = Math.floor(
        new Date(doc.reminderDateTime).getTime() / 1000
      );
      content += `- Reminding at <t:${reminderTimestamp}:f> - ${messageContext} \n`;
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
