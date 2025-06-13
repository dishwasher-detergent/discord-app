export const DISCORD_APPLICATION_ID = process.env
  .DISCORD_APPLICATION_ID as string;
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN as string;
export const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY as string;

export const DISCORD_API_URL = 'https://discord.com/api/v10';
export const DISCORD_API_BASE_URL = `${DISCORD_API_URL}/applications/${DISCORD_APPLICATION_ID}`;
export const APPWRITE_SITEMAP_URL = 'https://appwrite.io/docs/sitemap.xml';

export const EPHEMERAL_FLAG = 64;
