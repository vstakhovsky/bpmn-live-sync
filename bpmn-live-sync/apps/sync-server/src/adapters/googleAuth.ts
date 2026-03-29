import { google } from 'googleapis';
import { config } from '../config.js';

export function getGoogleAuth(scopes: string[]) {
  if (!config.google.clientEmail || !config.google.privateKey) {
    throw new Error('Google credentials are not configured. Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.');
  }

  return new google.auth.JWT({
    email: config.google.clientEmail,
    key: config.google.privateKey,
    scopes,
    subject: undefined
  });
}
