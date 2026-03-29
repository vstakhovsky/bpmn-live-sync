import { google } from 'googleapis';
import { config } from '../config.js';
import type { SyncContext, SyncResult } from '../types.js';
import { getGoogleAuth } from './googleAuth.js';

const PLACEHOLDER = '[[BPMN_DIAGRAM_HERE]]';

function getPublicImageUrl(): string {
  if (!config.google.publicImageBaseUrl) {
    throw new Error('PUBLIC_IMAGE_BASE_URL is required for Google Docs sync because Docs API inserts images by URL.');
  }
  return `${config.google.publicImageBaseUrl.replace(/\/$/, '')}/diagram.png`;
}

function findPlaceholderIndex(document: any): number | null {
  const content = document.body?.content ?? [];
  for (const element of content) {
    const paragraphs = element.paragraph?.elements ?? [];
    for (const paragraphElement of paragraphs) {
      const textRun = paragraphElement.textRun?.content as string | undefined;
      if (textRun?.includes(PLACEHOLDER)) {
        return paragraphElement.startIndex ?? null;
      }
    }
  }
  return null;
}

export async function syncToGoogleDocs(_: SyncContext): Promise<SyncResult> {
  const documentId = config.google.docsDocumentId;
  if (!documentId) {
    return {
      target: 'google-docs',
      success: false,
      details: 'Skipped: GOOGLE_DOCS_DOCUMENT_ID is not configured.'
    };
  }

  const auth = getGoogleAuth([
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive'
  ]);
  const docs = google.docs({ version: 'v1', auth });
  const document = await docs.documents.get({ documentId });
  const placeholderIndex = findPlaceholderIndex(document.data);

  if (placeholderIndex === null) {
    return {
      target: 'google-docs',
      success: false,
      details: `Skipped: placeholder ${PLACEHOLDER} was not found in the document.`
    };
  }

  const imageUrl = getPublicImageUrl();
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          deleteContentRange: {
            range: {
              startIndex: placeholderIndex,
              endIndex: placeholderIndex + PLACEHOLDER.length
            }
          }
        },
        {
          insertInlineImage: {
            uri: imageUrl,
            location: { index: placeholderIndex },
            objectSize: {
              width: { magnitude: 520, unit: 'PT' },
              height: { magnitude: 280, unit: 'PT' }
            }
          }
        }
      ]
    }
  });

  return {
    target: 'google-docs',
    success: true,
    details: `Inserted BPMN preview image into Google Doc ${documentId}.`
  };
}
