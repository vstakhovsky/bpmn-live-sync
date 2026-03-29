import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  BPMN_SOURCE_PATH: z.string().default('./examples/order-approval.bpmn'),
  SYNC_DEBOUNCE_MS: z.coerce.number().default(1200),
  ENABLE_WATCHER: z.string().default('true'),
  MIRO_AUTO_SYNC: z.string().default('false'),
  GOOGLE_SLIDES_AUTO_SYNC: z.string().default('false'),
  GOOGLE_DOCS_AUTO_SYNC: z.string().default('false'),
  LIVE_VIEWER_ENABLED: z.string().default('true'),
  MIRO_ACCESS_TOKEN: z.string().optional(),
  MIRO_BOARD_ID: z.string().optional(),
  MIRO_FRAME_ID: z.string().optional(),
  MIRO_X_GAP: z.coerce.number().default(320),
  MIRO_Y_GAP: z.coerce.number().default(180),
  GOOGLE_PROJECT_ID: z.string().optional(),
  GOOGLE_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_SLIDES_PRESENTATION_ID: z.string().optional(),
  GOOGLE_SLIDES_PAGE_ID: z.string().optional(),
  GOOGLE_DOCS_DOCUMENT_ID: z.string().optional(),
  PUBLIC_IMAGE_BASE_URL: z.string().optional(),
  LOCAL_PUBLIC_ASSET_DIR: z.string().default('./apps/sync-server/data/out'),
  GOOGLE_SYNC_TARGET: z.string().default('slides'),
  LOG_LEVEL: z.string().default('info')
});

const env = schema.parse(process.env);

export const config = {
  port: env.PORT,
  bpmnSourcePath: path.resolve(process.cwd(), env.BPMN_SOURCE_PATH),
  syncDebounceMs: env.SYNC_DEBOUNCE_MS,
  enableWatcher: env.ENABLE_WATCHER === 'true',
  liveViewerEnabled: env.LIVE_VIEWER_ENABLED === 'true',
  autoSync: {
    miro: env.MIRO_AUTO_SYNC === 'true',
    googleSlides: env.GOOGLE_SLIDES_AUTO_SYNC === 'true',
    googleDocs: env.GOOGLE_DOCS_AUTO_SYNC === 'true'
  },
  miro: {
    accessToken: env.MIRO_ACCESS_TOKEN,
    boardId: env.MIRO_BOARD_ID,
    frameId: env.MIRO_FRAME_ID,
    xGap: env.MIRO_X_GAP,
    yGap: env.MIRO_Y_GAP
  },
  google: {
    projectId: env.GOOGLE_PROJECT_ID,
    clientEmail: env.GOOGLE_CLIENT_EMAIL,
    privateKey: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    slidesPresentationId: env.GOOGLE_SLIDES_PRESENTATION_ID,
    slidesPageId: env.GOOGLE_SLIDES_PAGE_ID,
    docsDocumentId: env.GOOGLE_DOCS_DOCUMENT_ID,
    publicImageBaseUrl: env.PUBLIC_IMAGE_BASE_URL,
    localPublicAssetDir: path.resolve(process.cwd(), env.LOCAL_PUBLIC_ASSET_DIR),
    syncTarget: env.GOOGLE_SYNC_TARGET
  },
  logLevel: env.LOG_LEVEL
};
