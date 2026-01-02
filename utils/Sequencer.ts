
import { Node, Edge } from '@xyflow/react';

interface FlattenedClip {
  id: string;
  name: string;
  timelineStart: number;
  timelineEnd: number;
  sourceIn: number;
  sourceOut: number;
  track: number;
}

interface TimelineMarker {
  name: string;
  start: number;
  duration: number;
  color: string;
}

const PIXELS_PER_SECOND = 100;

const getAbsoluteX = (nodeId: string, nodes: Node[]): number => {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return 0;
  if (node.parentId) {
    return (node.position.x || 0) + getAbsoluteX(node.parentId, nodes);
  }
  return node.position.x || 0;
};

export const flattenCanvasToTimeline = (nodes: Node[], edges: Edge[], fps: number = 24) => {
  const playableNodes = nodes.filter(n => n.type === 'spineNode' || n.type === 'satelliteNode');
  const structureNodes = nodes.filter(n => n.type === 'actNode' || n.type === 'sceneNode');
  
  if (playableNodes.length === 0) return null;

  const positionedClips = playableNodes.map(node => ({
    node,
    absoluteX: getAbsoluteX(node.id, nodes)
  })).sort((a, b) => a.absoluteX - b.absoluteX);

  const startOffset = positionedClips[0].absoluteX;

  // 1. Process Clips
  const clips: FlattenedClip[] = positionedClips.map(({ node, absoluteX }) => {
    const globalX = absoluteX - startOffset;
    const timelineStartSec = globalX / PIXELS_PER_SECOND;
    const duration = (node.data.duration as number) || 5;

    return {
      id: node.id,
      name: (node.data.label as string) || 'Untitled Clip',
      timelineStart: Math.round(timelineStartSec * fps),
      timelineEnd: Math.round((timelineStartSec + duration) * fps),
      sourceIn: Math.round(((node.data.startTime as number) || 0) * fps),
      sourceOut: Math.round(((node.data.endTime as number) || duration) * fps),
      track: node.type === 'spineNode' ? 1 : 2
    };
  });

  // 2. Process structural nodes (Acts/Scenes) as Markers
  const markers: TimelineMarker[] = structureNodes.map(node => {
    const absX = getAbsoluteX(node.id, nodes);
    const globalX = absX - startOffset;
    const start = Math.round((globalX / PIXELS_PER_SECOND) * fps);
    
    return {
      name: (node.data.label as string) || 'Marker',
      start,
      duration: node.type === 'actNode' ? 2400 : 240, // Arbitrary visual length for markers
      color: node.type === 'actNode' ? 'blue' : 'green'
    };
  });

  return generateXMEML(clips, markers, fps);
};

const generateXMEML = (clips: FlattenedClip[], markers: TimelineMarker[], fps: number) => {
  const timestamp = new Date().toISOString();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmeml version="5">
  <sequence>
    <name>Story Graph - ${timestamp}</name>
    <rate><timebase>${fps}</timebase></rate>
    <media>
      <video>
        <track>`;

  clips.forEach(clip => {
    xml += `
          <clipitem id="${clip.id}">
            <name>${clip.name}</name>
            <start>${clip.timelineStart}</start>
            <end>${clip.timelineEnd}</end>
            <in>${clip.sourceIn}</in>
            <out>${clip.sourceOut}</out>
            <rate><timebase>${fps}</timebase></rate>
          </clipitem>`;
  });

  xml += `
        </track>
      </video>
    </media>
    <markerlist>`;

  markers.forEach(m => {
    xml += `
      <marker>
        <name>${m.name}</name>
        <in>${m.start}</in>
        <out>${m.start + m.duration}</out>
        <comment>Imported from Story Graph</comment>
      </marker>`;
  });

  xml += `
    </markerlist>
  </sequence>
</xmeml>`;
  return xml;
};
