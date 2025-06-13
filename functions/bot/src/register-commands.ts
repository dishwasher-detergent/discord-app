import {
  Command,
  deleteAllGlobalCommands,
  registerCommands,
} from './lib/discord.js';
import { throwIfMissing } from './lib/utils.js';

throwIfMissing(process.env, [
  'DISCORD_APPLICATION_ID',
  'DISCORD_TOKEN',
  'DISCORD_PUBLIC_KEY',
]);

const commands: Command[] = [
  {
    name: 'create',
    description: 'Create a new reminder',
    type: 3,
  },
  {
    name: 'list',
    description: 'Lists your reminders, optionally filtering by status.',
    type: 1,
    options: [
      {
        name: 'status',
        description: 'Filter reminders by status (default: pending)',
        type: 3,
        required: false,
        choices: [
          {
            name: 'Pending',
            value: 'pending',
          },
          {
            name: 'Completed',
            value: 'complete',
          },
          {
            name: 'Cancelled',
            value: 'cancelled',
          },
          {
            name: 'Failed',
            value: 'failed',
          },
        ],
      },
    ],
  },
  {
    name: 'cancel',
    description: 'Cancel a pending reminder by selecting it from a list.',
    type: 1,
  },
];

async function main() {
  try {
    console.log('Attempting to delete all global commands...');
    await deleteAllGlobalCommands();
    console.log('All global commands should now be deleted.');

    console.log('Registering new commands...');
    await registerCommands(commands);
    console.log('New commands registered.');
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
}

main();
