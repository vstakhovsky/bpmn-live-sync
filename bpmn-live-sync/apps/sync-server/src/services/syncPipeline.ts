import fs from 'node:fs/promises';
import { config } from '../config.js';
import { syncToGoogleDocs } from '../adapters/googleDocs.js';
import { syncToGoogleSlides } from '../adapters/googleSlides.js';
import { syncToMiro } from '../adapters/miro.js';
import { parseBpmnXml } from '../bpmn/parseBpmn.js';
import { renderDiagramAssets } from '../bpmn/renderDiagramAssets.js';
import type { SyncResult } from '../types.js';
import { eventBus } from './eventBus.js';
import { syncState } from './state.js';
import { logger } from '../utils/logger.js';

export async function runSync(reason: string): Promise<SyncResult[]> {
  const xml = await fs.readFile(config.bpmnSourcePath, 'utf8');
  const graph = await parseBpmnXml(xml);
  const assets = await renderDiagramAssets(graph, config.google.localPublicAssetDir);
  const context = { graph, ...assets };

  const results: SyncResult[] = [
    {
      target: 'viewer',
      success: true,
      details: `Viewer payload refreshed (${reason}).`
    }
  ];

  if (config.autoSync.miro) {
    try {
      results.push(await syncToMiro(context));
    } catch (error) {
      results.push({
        target: 'miro',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown Miro sync error.'
      });
    }
  }

  if (config.autoSync.googleSlides) {
    try {
      results.push(await syncToGoogleSlides(context));
    } catch (error) {
      results.push({
        target: 'google-slides',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown Google Slides sync error.'
      });
    }
  }

  if (config.autoSync.googleDocs) {
    try {
      results.push(await syncToGoogleDocs(context));
    } catch (error) {
      results.push({
        target: 'google-docs',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown Google Docs sync error.'
      });
    }
  }

  syncState.lastXml = xml;
  syncState.lastGraph = graph;
  syncState.lastUpdatedAt = new Date().toISOString();
  syncState.lastResults = results;

  eventBus.emit('diagram-updated', {
    updatedAt: syncState.lastUpdatedAt,
    results
  });

  logger.info({ results, reason }, 'Sync completed');
  return results;
}
