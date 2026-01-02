
import React, { useCallback, useMemo } from 'react';
import { ReactFlow, Background, Controls, Panel, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import { XCircle } from 'lucide-react';
import '@xyflow/react/dist/style.css';

import { useStore } from '../store/useStore';
import { ActNode } from './nodes/ActNode';
import { SceneNode } from './nodes/SceneNode';
import { SpineNode } from './nodes/SpineNode';
import { SatelliteNode } from './nodes/SatelliteNode';
import { AnchorEdge } from './edges/AnchorEdge';
import { useMediaRegistry } from '../hooks/useRegistry';

const nodeTypes = {
  actNode: ActNode,
  sceneNode: SceneNode,
  spineNode: SpineNode,
  satelliteNode: SatelliteNode
};

const edgeTypes = {
  anchor: AnchorEdge
};

const CanvasInner: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect, 
    addNodeAtPosition,
    isIsolated,
    activeParentId,
    exitIsolation 
  } = useStore();
  
  const { media } = useMediaRegistry(projectId);
  const { screenToFlowPosition } = useReactFlow();

  // Fractal Filtering: If isolated, only show nodes belonging to the active parent
  const displayNodes = useMemo(() => {
    if (!isIsolated || !activeParentId) return nodes;
    return nodes.filter(n => n.parentId === activeParentId || n.id === activeParentId);
  }, [nodes, isIsolated, activeParentId]);

  const displayEdges = useMemo(() => {
    if (!isIsolated) return edges;
    const nodeIds = new Set(displayNodes.map(n => n.id));
    return edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [edges, displayNodes, isIsolated]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const assetId = event.dataTransfer.getData('application/storygraph-asset');
    const asset = media.find(m => m.fileName === assetId);
    if (!asset) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    addNodeAtPosition(
      asset.mediaType === 'audio' ? 'spineNode' : 'satelliteNode', 
      { x: position.x - 100, y: position.y - 50 }, 
      asset
    );
  }, [media, addNodeAtPosition, screenToFlowPosition]);

  return (
    <div className="h-full w-full bg-slate-950 relative" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        colorMode="dark"
      >
        <Background color="#1A1A1A" gap={20} size={1} />
        <Controls />
        
        {isIsolated && (
          <Panel position="top-center" className="mt-4">
            <div className="bg-blue-600 px-4 py-2 rounded-full flex items-center gap-3 shadow-2xl border border-blue-400">
              <span className="text-[10px] font-black uppercase text-white tracking-widest">ISOLATION MODE ACTIVE</span>
              <button onClick={exitIsolation} className="hover:scale-110 transition-transform">
                <XCircle className="w-4 h-4 text-white" />
              </button>
            </div>
          </Panel>
        )}

        <Panel position="top-right" className="bg-slate-900 border border-slate-800 p-2 rounded-lg m-4 shadow-2xl flex gap-2">
           <button 
             onClick={() => addNodeAtPosition('actNode', { x: 0, y: 0 }, { name: 'New Act' })}
             className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-black uppercase text-white"
           >
             + ACT
           </button>
           <button 
             onClick={() => addNodeAtPosition('sceneNode', { x: 50, y: 50 }, { name: 'New Scene' })}
             className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-black uppercase text-white"
           >
             + SCENE
           </button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const CanvasPage: React.FC<{ projectId: string }> = ({ projectId }) => (
  <ReactFlowProvider>
    <CanvasInner projectId={projectId} />
  </ReactFlowProvider>
);
