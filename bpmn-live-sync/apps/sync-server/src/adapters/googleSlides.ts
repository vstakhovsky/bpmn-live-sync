import { google } from 'googleapis';
import { config } from '../config.js';
import type { BpmnGraph, DiagramNode, SyncContext, SyncResult } from '../types.js';
import { getGoogleAuth } from './googleAuth.js';

function sanitizeObjectId(raw: string): string {
  return `bpmn_${raw.replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, 45);
}

function slidesShapeType(node: DiagramNode): string {
  switch (node.type) {
    case 'startEvent':
    case 'endEvent':
      return 'ELLIPSE';
    case 'exclusiveGateway':
    case 'parallelGateway':
      return 'DIAMOND';
    case 'subProcess':
      return 'ROUND_RECTANGLE';
    default:
      return 'ROUND_RECTANGLE';
  }
}

function sizeForNode(node: DiagramNode) {
  const bounds = node.bounds ?? { x: 0, y: 0, width: 120, height: 80 };
  return {
    width: { magnitude: bounds.width, unit: 'PT' },
    height: { magnitude: bounds.height, unit: 'PT' }
  };
}

function transformForNode(node: DiagramNode) {
  const bounds = node.bounds ?? { x: 0, y: 0, width: 120, height: 80 };
  return {
    scaleX: 1,
    scaleY: 1,
    translateX: bounds.x,
    translateY: bounds.y,
    unit: 'PT'
  };
}

async function getPresentationPageId(presentationId: string): Promise<string> {
  const auth = getGoogleAuth([
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive'
  ]);

  const slides = google.slides({ version: 'v1', auth });
  const presentation = await slides.presentations.get({ presentationId });
  const firstSlide = presentation.data.slides?.[0];

  if (!firstSlide?.objectId) {
    throw new Error('No slide found in the target presentation. Create one blank slide first.');
  }

  return firstSlide.objectId;
}

function fallbackLayout(graph: BpmnGraph): BpmnGraph {
  const nodes = graph.nodes.map((node, index) => ({
    ...node,
    bounds:
      node.bounds ?? {
        x: 60 + index * 180,
        y: 120,
        width: node.type.includes('Gateway') ? 50 : 120,
        height: node.type.includes('Gateway') ? 50 : 70
      }
  }));
  return { ...graph, nodes };
}

export async function syncToGoogleSlides({ graph }: SyncContext): Promise<SyncResult> {
  const presentationId = config.google.slidesPresentationId;
  if (!presentationId) {
    return {
      target: 'google-slides',
      success: false,
      details: 'Skipped: GOOGLE_SLIDES_PRESENTATION_ID is not configured.'
    };
  }

  const auth = getGoogleAuth([
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive'
  ]);
  const slides = google.slides({ version: 'v1', auth });
  const pageId = config.google.slidesPageId || (await getPresentationPageId(presentationId));
  const hydrated = fallbackLayout(graph);
  const presentation = await slides.presentations.get({ presentationId });
  const page = presentation.data.slides?.find((slide) => slide.objectId === pageId);
  const existingElementIds = (page?.pageElements ?? [])
    .map((el) => el.objectId)
    .filter((id): id is string => Boolean(id));

  const requests: any[] = [];

  for (const objectId of existingElementIds) {
    requests.push({ deleteObject: { objectId } });
  }

  for (const node of hydrated.nodes) {
    const objectId = sanitizeObjectId(node.id);
    requests.push({
      createShape: {
        objectId,
        shapeType: slidesShapeType(node),
        elementProperties: {
          pageObjectId: pageId,
          size: sizeForNode(node),
          transform: transformForNode(node)
        }
      }
    });
    requests.push({
      insertText: {
        objectId,
        text: node.name
      }
    });
  }

  const nodeById = new Map(hydrated.nodes.map((node) => [node.id, node]));
  for (const edge of hydrated.edges) {
    const source = nodeById.get(edge.sourceRef);
    const target = nodeById.get(edge.targetRef);
    if (!source?.bounds || !target?.bounds) continue;

    const objectId = sanitizeObjectId(edge.id);
    const startX = source.bounds.x + source.bounds.width;
    const startY = source.bounds.y + source.bounds.height / 2;
    const endX = target.bounds.x;
    const endY = target.bounds.y + target.bounds.height / 2;

    requests.push({
      createLine: {
        objectId,
        lineCategory: 'STRAIGHT',
        elementProperties: {
          pageObjectId: pageId,
          size: {
            width: { magnitude: Math.max(20, endX - startX), unit: 'PT' },
            height: { magnitude: Math.max(2, Math.abs(endY - startY) || 2), unit: 'PT' }
          },
          transform: {
            scaleX: 1,
            scaleY: endY >= startY ? 1 : -1,
            translateX: startX,
            translateY: Math.min(startY, endY),
            unit: 'PT'
          }
        }
      }
    });
  }

  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: { requests }
  });

  return {
    target: 'google-slides',
    success: true,
    details: `Rebuilt slide ${pageId} in presentation ${presentationId} with ${hydrated.nodes.length} nodes.`
  };
}
