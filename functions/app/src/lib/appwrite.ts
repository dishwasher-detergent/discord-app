import { Client, Databases } from 'node-appwrite';

export const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT as string;
export const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID as string;
export const API_KEY = process.env.API_KEY as string;
export const DATABASE_ID = process.env.DATABASE_ID as string;

// Collections
export const REMINDER_COLLECTION_ID = process.env
  .REMINDER_COLLECTION_ID as string;

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

export const database = new Databases(client);
