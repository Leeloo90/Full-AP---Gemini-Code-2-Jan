
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MediaAsset {
  fileName: string;
  projectId: string;
  clipDirectory: string;
  startTC: string;
  endTC: string;
  duration: string;
  fps: number;
  resolution: string;
  filePath: string;
  mediaType: 'video' | 'audio';
  scene?: string; // Added for CSV parsing
  take?: string;  // Added for CSV parsing
  transcript?: TranscriptWord[]; // Added for SRT parsing
}

export interface TranscriptWord {
  id: string;
  word: string;
  start: number;
  end: number;
  speaker?: string;
  startTC?: string;
}

export interface ContainerTrack {
  fileName: string;
  trackIndex: number;
  offsetFrames: number;
  startFrame: number;
  endFrame: number;
  duration: number;
  mediaType: 'video' | 'audio';
  in: number;
  out: number;
}

export interface MultiCamContainer {
  id: string;
  projectId: string;
  name: string;
  tracks: ContainerTrack[];
  transcript?: TranscriptWord[];
  duration: number;
  fps: number;
  startTC: string;
}

export type StoryNodeType = 'actNode' | 'sceneNode' | 'spineNode' | 'satelliteNode' | 'springNode';

export interface StoryNodeData {
  label: string;
  assetId?: string;
  isCompound?: boolean;
  startTime: number;
  endTime: number;
  duration: number;
  transcript?: TranscriptWord[];
  activeCameraIndex?: number;
  isIsolated?: boolean;
}

export interface IElectronAPI {
  getAssetUrl: (filePath: string) => Promise<string>;
  selectDirectory: () => Promise<string | null>;
  listFiles: (dirPath: string) => Promise<string[]>;
  readFile: (filePath: string) => Promise<string>;
  pathJoin: (...args: string[]) => Promise<string>;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}

export const STORE_NAMES = {
  PROJECTS: 'ProjectStore',
  MEDIA: 'MediaStore',
  CONTAINERS: 'ContainerStore',
  GRAPHS: 'GraphStore'
} as const;

export interface UploadStatus {
  type: 'csv' | 'xml' | 'srtx';
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
}
