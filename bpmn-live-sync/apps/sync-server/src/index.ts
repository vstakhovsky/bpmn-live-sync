import cors from 'cors';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { startWatcher } from './services/fileWatcher.js';
import { runSync } from './services/syncPipeline.js';
import { syncState } from './services/state.js';
import { eventBus } from './services/eventBus.js';
import { logger } from './utils/logger.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const viewerDir = path.resolve(process.cwd(), 'apps/live-viewer/public');
app.use('/viewer', express.static(viewerDir));
app.use('/assets', express.static(config.google.localPublicAssetDir));

app.get('/health', (_req, res) => {
  res.json({ ok: true, source: config.bpmnSourcePath, updatedAt: syncState.lastUpdatedAt });
});

app.get('/state', (_req, res) => {
  res.json(syncState);
});

app.get('/diagram.xml', async (_req, res) => {
  if (syncState.lastXml) {
    res.type('application/xml').send(syncState.lastXml);
    return;
  }
  const xml = await fs.readFile(config.bpmnSourcePath, 'utf8');
  res.type('application/xml').send(xml);
});

app.post('/sync', async (_req, res) => {
  const results = await runSync('manual:api');
  res.json({ ok: true, results });
});

app.post('/sync/miro', async (_req, res) => {
  const previous = {
    miro: config.autoSync.miro,
    googleSlides: config.autoSync.googleSlides,
    googleDocs: config.autoSync.googleDocs
  };
  config.autoSync.miro = true;
  config.autoSync.googleSlides = false;
  config.autoSync.googleDocs = false;
  const results = await runSync('manual:miro');
  Object.assign(config.autoSync, previous);
  res.json({ ok: true, results });
});

app.post('/sync/google/slides', async (_req, res) => {
  const previous = {
    miro: config.autoSync.miro,
    googleSlides: config.autoSync.googleSlides,
    googleDocs: config.autoSync.googleDocs
  };
  config.autoSync.miro = false;
  config.autoSync.googleSlides = true;
  config.autoSync.googleDocs = false;
  const results = await runSync('manual:google-slides');
  Object.assign(config.autoSync, previous);
  res.json({ ok: true, results });
});

app.post('/sync/google/docs', async (_req, res) => {
  const previous = {
    miro: config.autoSync.miro,
    googleSlides: config.autoSync.googleSlides,
    googleDocs: config.autoSync.googleDocs
  };
  config.autoSync.miro = false;
  config.autoSync.googleSlides = false;
  config.autoSync.googleDocs = true;
  const results = await runSync('manual:google-docs');
  Object.assign(config.autoSync, previous);
  res.json({ ok: true, results });
});

app.get('/events', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const handler = (payload: unknown) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  eventBus.on('diagram-updated', handler);
  res.write(`data: ${JSON.stringify({ updatedAt: syncState.lastUpdatedAt })}\n\n`);

  _req.on('close', () => {
    eventBus.off('diagram-updated', handler);
    res.end();
  });
});

async function main() {
  await runSync('startup');
  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'BPMN live sync server started');
  });

  if (config.enableWatcher) {
    startWatcher();
  }
}

main().catch((error) => {
  logger.error({ error }, 'Fatal startup error');
  process.exit(1);
});
