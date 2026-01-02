
import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  Node,
  Edge
} from '@xyflow/react';
import { StoryNodeType, STORE_NAMES } from '../types';
import { openDB } from '../hooks/useRegistry';

interface StoryState {
  nodes: Node[];
  edges: Edge[];
  activeParentId: string | null;
  isIsolated: boolean;
  currentProjectId: string | null;
  
  saveGraph: () => Promise<void>;
  loadGraph: (projectId: string) => Promise<void>;
  
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  enterIsolation: (sceneId: string) => void;
  exitIsolation: () => void;
  addNodeAtPosition: (type: StoryNodeType, position: { x: number, y: number }, data: any) => void;
  setProjectId: (id: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

const persistToIDB = async (projectId: string, nodes: Node[], edges: Edge[]) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAMES.GRAPHS, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.GRAPHS);
    // Persist the entire state for the project
    store.put({ 
      id: projectId, 
      nodes, 
      edges, 
      updatedAt: Date.now() 
    });
    return new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (error) {
    console.error('[Persistence] Auto-save failed:', error);
  }
};

export const useStore = create<StoryState>((set, get) => ({
  nodes: [],
  edges: [],
  activeParentId: null,
  isIsolated: false,
  currentProjectId: null,

  setProjectId: (id) => {
    // If switching projects, clear state first to prevent flickering/pollution
    if (get().currentProjectId !== id) {
      set({ 
        currentProjectId: id, 
        nodes: [], 
        edges: [], 
        isIsolated: false, 
        activeParentId: null 
      });
      get().loadGraph(id);
    }
  },

  saveGraph: async () => {
    const { currentProjectId, nodes, edges } = get();
    if (!currentProjectId) return;
    
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      persistToIDB(currentProjectId, nodes, edges);
    }, 1000);
  },

  loadGraph: async (projectId: string) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAMES.GRAPHS, 'readonly');
      const store = tx.objectStore(STORE_NAMES.GRAPHS);
      const request = store.get(projectId);
      
      request.onsuccess = () => {
        if (request.result) {
          set({ 
            nodes: request.result.nodes || [], 
            edges: request.result.edges || [] 
          });
        }
      };
    } catch (error) {
      console.error('[Persistence] Load failed:', error);
    }
  },

  onNodesChange: (changes) => {
    const nextNodes = applyNodeChanges(changes, get().nodes).map(node => {
      // Enforce Narrative Physics: Spine Nodes locked to Y=200
      if (node.type === 'spineNode') {
        return { 
          ...node, 
          position: { ...node.position, y: 200 }
        };
      }
      return node;
    });

    set({ nodes: nextNodes });
    get().saveGraph();
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    get().saveGraph();
  },

  onConnect: (connection) => {
    set({ 
      edges: addEdge({ 
        ...connection, 
        type: 'anchor', 
        style: { stroke: '#10B981', strokeWidth: 1, strokeDasharray: '4' } 
      }, get().edges) 
    });
    get().saveGraph();
  },

  enterIsolation: (sceneId) => {
    set({ activeParentId: sceneId, isIsolated: true });
  },

  exitIsolation: () => {
    set({ activeParentId: null, isIsolated: false });
  },

  addNodeAtPosition: (type, position, assetData) => {
    const { activeParentId } = get();
    const finalPosition = type === 'spineNode' ? { ...position, y: 200 } : position;
    
    // Ensure numeric values for duration and time offsets
    const duration = parseFloat(assetData.duration) || 5;

    const newNode: Node = {
      id: crypto.randomUUID(),
      type,
      position: finalPosition,
      parentId: activeParentId || undefined,
      data: {
        label: assetData.name || assetData.fileName,
        assetId: assetData.id,
        duration,
        startTime: parseFloat(assetData.startTime) || 0,
        endTime: parseFloat(assetData.endTime) || duration,
        transcript: assetData.transcript || [],
        ...assetData
      },
    };

    set({ nodes: [...get().nodes, newNode] });
    get().saveGraph();
  },
}));
