import BpmnModdle from 'bpmn-moddle';
import type { BpmnGraph, Bounds, DiagramEdge, DiagramNode, DiagramNodeType } from '../types.js';

const moddle = new BpmnModdle();

type AnyObject = Record<string, any>;

function mapNodeType(elementType: string | undefined): DiagramNodeType {
  switch (elementType) {
    case 'bpmn:StartEvent':
      return 'startEvent';
    case 'bpmn:EndEvent':
      return 'endEvent';
    case 'bpmn:Task':
      return 'task';
    case 'bpmn:UserTask':
      return 'userTask';
    case 'bpmn:ServiceTask':
      return 'serviceTask';
    case 'bpmn:ExclusiveGateway':
      return 'exclusiveGateway';
    case 'bpmn:ParallelGateway':
      return 'parallelGateway';
    case 'bpmn:SubProcess':
      return 'subProcess';
    default:
      return 'unknown';
  }
}

function indexBounds(definitions: AnyObject): Map<string, Bounds> {
  const result = new Map<string, Bounds>();
  const diagrams = definitions.diagrams ?? [];

  for (const diagram of diagrams) {
    const planeElements = diagram?.plane?.planeElement ?? [];
    for (const planeElement of planeElements) {
      if (planeElement.$type === 'bpmndi:BPMNShape' && planeElement.bpmnElement?.id && planeElement.bounds) {
        result.set(planeElement.bpmnElement.id, {
          x: planeElement.bounds.x,
          y: planeElement.bounds.y,
          width: planeElement.bounds.width,
          height: planeElement.bounds.height
        });
      }
    }
  }

  return result;
}

function extractNodes(flowElements: AnyObject[], boundsIndex: Map<string, Bounds>): DiagramNode[] {
  return flowElements
    .filter((element) => !String(element.$type ?? '').includes('SequenceFlow'))
    .map((element) => ({
      id: element.id,
      name: element.name ?? element.id,
      type: mapNodeType(element.$type),
      bounds: boundsIndex.get(element.id)
    }));
}

function extractEdges(flowElements: AnyObject[]): DiagramEdge[] {
  return flowElements
    .filter((element) => element.$type === 'bpmn:SequenceFlow')
    .map((element) => ({
      id: element.id,
      name: element.name,
      sourceRef: element.sourceRef?.id,
      targetRef: element.targetRef?.id
    }))
    .filter((edge) => edge.sourceRef && edge.targetRef) as DiagramEdge[];
}

export async function parseBpmnXml(xml: string): Promise<BpmnGraph> {
  const { rootElement } = await moddle.fromXML(xml);
  const definitions = rootElement as AnyObject;
  const process = (definitions.rootElements ?? []).find((item: AnyObject) => item.$type === 'bpmn:Process');

  if (!process) {
    throw new Error('No bpmn:Process found in BPMN definitions');
  }

  const flowElements = process.flowElements ?? [];
  const boundsIndex = indexBounds(definitions);

  return {
    processId: process.id,
    processName: process.name ?? process.id,
    nodes: extractNodes(flowElements, boundsIndex),
    edges: extractEdges(flowElements),
    rawXml: xml
  };
}
