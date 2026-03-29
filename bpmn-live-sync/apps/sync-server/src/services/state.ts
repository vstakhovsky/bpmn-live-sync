import type { BpmnGraph, SyncResult } from '../types.js';

export interface SyncState {
  lastXml: string | null;
  lastGraph: BpmnGraph | null;
  lastUpdatedAt: string | null;
  lastResults: SyncResult[];
}

export const syncState: SyncState = {
  lastXml: null,
  lastGraph: null,
  lastUpdatedAt: null,
  lastResults: []
};
