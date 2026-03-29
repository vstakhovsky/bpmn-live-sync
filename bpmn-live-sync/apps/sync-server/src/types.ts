export type DiagramNodeType =
  | 'startEvent'
  | 'endEvent'
  | 'task'
  | 'userTask'
  | 'serviceTask'
  | 'exclusiveGateway'
  | 'parallelGateway'
  | 'subProcess'
  | 'unknown';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagramNode {
  id: string;
  name: string;
  type: DiagramNodeType;
  bounds?: Bounds;
}

export interface DiagramEdge {
  id: string;
  name?: string;
  sourceRef: string;
  targetRef: string;
}

export interface BpmnGraph {
  processId: string;
  processName: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  rawXml: string;
}

export interface SyncResult {
  target: 'miro' | 'google-slides' | 'google-docs' | 'viewer';
  success: boolean;
  details: string;
}

export interface SyncContext {
  graph: BpmnGraph;
  svgPath: string;
  pngPath: string;
}
