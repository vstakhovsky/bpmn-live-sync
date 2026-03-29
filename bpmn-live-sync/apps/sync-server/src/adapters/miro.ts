import type { BpmnGraph, DiagramNode, SyncContext, SyncResult } from '../types.js';
import { config } from '../config.js';

const MIRO_API = 'https://api.miro.com/v2';

type MiroCreateResponse = { id: string };

function shapeForNode(node: DiagramNode): string {
  switch (node.type) {
    case 'startEvent':
    case 'endEvent':
      return 'circle';
    case 'exclusiveGateway':
    case 'parallelGateway':
      return 'rhombus';
    case 'subProcess':
      return 'round_rectangle';
    default:
      return 'rectangle';
  }
}

async function miroFetch<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MIRO_API}${pathname}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.miro.accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Miro API failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

function boardPosition(node: DiagramNode) {
  const bounds = node.bounds ?? { x: 0, y: 0, width: 120, height: 80 };
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
    origin: 'center'
  };
}

async function createShape(boardId: string, node: DiagramNode): Promise<string> {
  const bounds = node.bounds ?? { x: 0, y: 0, width: 120, height: 80 };
  const payload = {
    data: {
      content: node.name
    },
    style: {
      textAlign: 'center',
      textAlignVertical: 'middle'
    },
    position: boardPosition(node),
    geometry: {
      width: Math.max(bounds.width, 80),
      height: Math.max(bounds.height, 60)
    },
    shape: shapeForNode(node),
    parent: config.miro.frameId ? { id: config.miro.frameId } : undefined
  };

  const result = await miroFetch<MiroCreateResponse>(`/boards/${boardId}/shapes`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return result.id;
}

async function createConnector(boardId: string, startId: string, endId: string, caption?: string): Promise<void> {
  const payload = {
    startItem: { id: startId, snapTo: 'auto' },
    endItem: { id: endId, snapTo: 'auto' },
    shape: 'elbowed',
    captions: caption ? [{ content: caption, position: 'middle' }] : undefined
  };

  await miroFetch(`/boards/${boardId}/connectors`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function syncToMiro({ graph }: SyncContext): Promise<SyncResult> {
  const boardId = config.miro.boardId;
  if (!config.miro.accessToken || !boardId) {
    return {
      target: 'miro',
      success: false,
      details: 'Skipped: MIRO_ACCESS_TOKEN or MIRO_BOARD_ID is not configured.'
    };
  }

  const idMap = new Map<string, string>();

  for (const node of graph.nodes) {
    const miroId = await createShape(boardId, node);
    idMap.set(node.id, miroId);
  }

  for (const edge of graph.edges) {
    const startId = idMap.get(edge.sourceRef);
    const endId = idMap.get(edge.targetRef);
    if (startId && endId) {
      await createConnector(boardId, startId, endId, edge.name);
    }
  }

  return {
    target: 'miro',
    success: true,
    details: `Created ${graph.nodes.length} shapes and ${graph.edges.length} connectors on Miro board ${boardId}.`
  };
}
