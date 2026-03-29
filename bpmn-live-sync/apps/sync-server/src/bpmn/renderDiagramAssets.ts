import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { optimize } from 'svgo';
import type { BpmnGraph, DiagramNode } from '../types.js';

function fallbackLayout(nodes: DiagramNode[]): DiagramNode[] {
  return nodes.map((node, index) => ({
    ...node,
    bounds:
      node.bounds ?? {
        x: 80 + index * 220,
        y: 140,
        width: node.type.includes('Gateway') ? 60 : 120,
        height: node.type.includes('Gateway') ? 60 : 80
      }
  }));
}

function nodeSvg(node: DiagramNode): string {
  const b = node.bounds!;
  const label = node.name.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  if (node.type === 'startEvent' || node.type === 'endEvent') {
    const r = Math.min(b.width, b.height) / 2;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const inner = node.type === 'endEvent' ? `<circle cx="${cx}" cy="${cy}" r="${r - 6}" fill="none" stroke="#111" stroke-width="2" />` : '';
    return `
      <g id="${node.id}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#111" stroke-width="2" />
        ${inner}
        <text x="${cx}" y="${cy + r + 20}" text-anchor="middle" font-size="14" font-family="Arial, sans-serif">${label}</text>
      </g>
    `;
  }

  if (node.type === 'exclusiveGateway' || node.type === 'parallelGateway') {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const points = `${cx},${b.y} ${b.x + b.width},${cy} ${cx},${b.y + b.height} ${b.x},${cy}`;
    const mark = node.type === 'parallelGateway'
      ? `<text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="28" font-family="Arial, sans-serif">+</text>`
      : `<text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="24" font-family="Arial, sans-serif">×</text>`;

    return `
      <g id="${node.id}">
        <polygon points="${points}" fill="#fff" stroke="#111" stroke-width="2" />
        ${mark}
        <text x="${cx}" y="${b.y + b.height + 20}" text-anchor="middle" font-size="14" font-family="Arial, sans-serif">${label}</text>
      </g>
    `;
  }

  const rx = node.type === 'subProcess' ? 20 : 12;
  const badge = node.type === 'subProcess'
    ? `<rect x="${b.x + b.width - 28}" y="${b.y + b.height - 24}" width="18" height="18" rx="2" ry="2" fill="#fff" stroke="#111" stroke-width="1" /><text x="${b.x + b.width - 19}" y="${b.y + b.height - 10}" text-anchor="middle" font-size="14" font-family="Arial, sans-serif">+</text>`
    : '';

  return `
    <g id="${node.id}">
      <rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${rx}" ry="${rx}" fill="#fff" stroke="#111" stroke-width="2" />
      <text x="${b.x + b.width / 2}" y="${b.y + b.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="14" font-family="Arial, sans-serif">${label}</text>
      ${badge}
    </g>
  `;
}

function edgeSvg(graph: BpmnGraph): string {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  return graph.edges
    .map((edge) => {
      const source = byId.get(edge.sourceRef);
      const target = byId.get(edge.targetRef);
      if (!source?.bounds || !target?.bounds) return '';

      const x1 = source.bounds.x + source.bounds.width;
      const y1 = source.bounds.y + source.bounds.height / 2;
      const x2 = target.bounds.x;
      const y2 = target.bounds.y + target.bounds.height / 2;
      const midX = (x1 + x2) / 2;
      const label = edge.name
        ? `<text x="${midX}" y="${Math.min(y1, y2) - 10}" text-anchor="middle" font-size="12" font-family="Arial, sans-serif">${edge.name}</text>`
        : '';

      return `
        <g id="${edge.id}">
          <path d="M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}" fill="none" stroke="#111" stroke-width="2" marker-end="url(#arrow)" />
          ${label}
        </g>
      `;
    })
    .join('\n');
}

export async function renderDiagramAssets(graph: BpmnGraph, outputDir: string): Promise<{ svgPath: string; pngPath: string }> {
  const nodes = fallbackLayout(graph.nodes);
  const hydratedGraph: BpmnGraph = { ...graph, nodes };
  const maxX = Math.max(...nodes.map((n) => (n.bounds?.x ?? 0) + (n.bounds?.width ?? 0)), 1200) + 120;
  const maxY = Math.max(...nodes.map((n) => (n.bounds?.y ?? 0) + (n.bounds?.height ?? 0)), 500) + 120;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#111" />
        </marker>
      </defs>
      <rect width="100%" height="100%" fill="#fafafa" />
      <text x="40" y="48" font-size="24" font-family="Arial, sans-serif">${hydratedGraph.processName.replace(/&/g, '&amp;')}</text>
      ${edgeSvg(hydratedGraph)}
      ${hydratedGraph.nodes.map(nodeSvg).join('\n')}
    </svg>
  `;

  const optimized = optimize(svg, { multipass: true }).data;
  await fs.mkdir(outputDir, { recursive: true });

  const svgPath = path.join(outputDir, 'diagram.svg');
  const pngPath = path.join(outputDir, 'diagram.png');

  await fs.writeFile(svgPath, optimized, 'utf8');
  await sharp(Buffer.from(optimized)).png().toFile(pngPath);

  return { svgPath, pngPath };
}
