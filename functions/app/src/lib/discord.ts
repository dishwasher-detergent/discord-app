import fetch from 'node-fetch';
import { DISCORD_API_BASE_URL, DISCORD_TOKEN } from './constants.js';

export interface CommandOption {
  type: number;
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
  description?: string;
  type?: number;
  options?: CommandOption[];
}

/**
 * Register Discord application commands for your application
 * @param commands Array of command objects
 */
export async function registerCommands(commands: Command[]): Promise<void> {
  const endpoint = `${DISCORD_API_BASE_URL}/commands`;

  const responses = await Promise.all(
    commands.map((command) => {
      const payload: any = {
        name: command.name,
        type: command.type || 1,
      };

      if (command.type === undefined || command.type === 1) {
        payload.description = command.description;
        if (command.options) {
          payload.options = command.options;
        }
      } else {
      }

      return fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    })
  );

  for (const response of responses) {
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        'Failed to register command. Status:',
        response.status,
        'Body:',
        errorBody
      );
      throw new Error(
        `Failed to register command. Status: ${response.status}. Body: ${errorBody}`
      );
    }
  }
}

/**
 * Deletes all global application commands.
 */
export async function deleteAllGlobalCommands(): Promise<void> {
  const endpoint = `${DISCORD_API_BASE_URL}/commands`;

  console.log(
    `Attempting to delete all global commands from endpoint: ${endpoint}`
  );

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${DISCORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([]), // Sending an empty array to remove all commands
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      'Failed to delete all global commands. Status:',
      response.status,
      'Body:',
      errorBody
    );
    throw new Error(
      `Failed to delete all global commands. Status: ${response.status}. Body: ${errorBody}`
    );
  }

  console.log('Successfully deleted all global commands.');
}
