import fetch from 'node-fetch';
import { DISCORD_API_BASE_URL, DISCORD_TOKEN } from './constants.js';

export interface CommandOption {
  type: number; // Discord API option type (3 = STRING, etc.)
  name: string;
  description: string;
  required?: boolean;
  choices?: Array<{
    name: string;
    value: string | number;
  }>;
}

export interface Command {
  name: string;
  description: string;
  options?: CommandOption[];
}

/**
 * Register Discord slash commands for your application
 * @param appId Application ID
 * @param commands Array of command objects
 * @param token Bot token
 */
export async function registerCommands(commands: Command[]): Promise<void> {
  const endpoint = `${DISCORD_API_BASE_URL}/commands`;

  const responses = await Promise.all(
    commands.map((command) => {
      return fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      });
    })
  );

  if (responses.some((response) => !response.ok)) {
    throw new Error('Failed to register command');
  }
}
