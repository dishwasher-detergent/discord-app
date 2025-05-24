import { Command, registerCommands } from './lib/discord.js';
import { throwIfMissing } from './lib/utils.js';

throwIfMissing(process.env, [
  'DISCORD_APPLICATION_ID',
  'DISCORD_TOKEN',
  'DISCORD_PUBLIC_KEY',
]);

const commands: Command[] = [
  {
    name: 'hello',
    description: 'Says hello to the user',
  },
];

async function main() {
  try {
    await registerCommands(commands);
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
}

main();
