import chokidar from 'chokidar';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { runSync } from './syncPipeline.js';

let timer: NodeJS.Timeout | null = null;

export function startWatcher(): void {
  const watcher = chokidar.watch(config.bpmnSourcePath, { ignoreInitial: true });

  watcher.on('all', (event) => {
    logger.info({ event, file: config.bpmnSourcePath }, 'Detected BPMN file change');
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      runSync(`watch:${event}`).catch((error) => {
        logger.error({ error }, 'Watcher sync failed');
      });
    }, config.syncDebounceMs);
  });

  logger.info({ file: config.bpmnSourcePath }, 'BPMN watcher started');
}
