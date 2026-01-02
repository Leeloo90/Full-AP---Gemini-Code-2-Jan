
import { useState, useCallback, useEffect } from 'react';
import { Project, MediaAsset, MultiCamContainer, TranscriptWord, STORE_NAMES } from '../types';

const DB_NAME = 'StoryGraphVault';
const DB_VERSION = 3;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAMES.PROJECTS)) {
        db.createObjectStore(STORE_NAMES.PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.MEDIA)) {
        const mediaStore = db.createObjectStore(STORE_NAMES.MEDIA, { keyPath: 'fileName' });
        mediaStore.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.CONTAINERS)) {
        const containerStore = db.createObjectStore(STORE_NAMES.CONTAINERS, { keyPath: 'id' });
        containerStore.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.GRAPHS)) {
        db.createObjectStore(STORE_NAMES.GRAPHS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const promisifyRequest = (request: IDBRequest): Promise<any> => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const useProjectRegistry = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAMES.PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_NAMES.PROJECTS);
    const result = await promisifyRequest(store.getAll());
    setProjects(result);
    setLoading(false);
  }, []);

  const createProject = async (name: string, description?: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const db = await openDB();
    const tx = db.transaction(STORE_NAMES.PROJECTS, 'readwrite');
    tx.objectStore(STORE_NAMES.PROJECTS).add(newProject);
    return new Promise<Project>((resolve) => {
      tx.oncomplete = () => {
        fetchProjects();
        resolve(newProject);
      };
    });
  };

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  return { projects, loading, createProject, reload: fetchProjects };
};

export const useMediaRegistry = (projectId?: string) => {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  
  const fetchMedia = useCallback(async () => {
    if (!projectId) return;
    const db = await openDB();
    const tx = db.transaction(STORE_NAMES.MEDIA, 'readonly');
    const index = tx.objectStore(STORE_NAMES.MEDIA).index('projectId');
    const result = await promisifyRequest(index.getAll(IDBKeyRange.only(projectId)));
    setMedia(result);
  }, [projectId]);

  const bulkUpsertMedia = async (assets: MediaAsset[]) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAMES.MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.MEDIA);
    assets.forEach(asset => store.put(asset));
    return new Promise<void>((resolve) => {
      tx.oncomplete = () => {
        fetchMedia();
        resolve();
      };
    });
  };

  useEffect(() => { fetchMedia(); }, [fetchMedia]);
  return { media, bulkUpsertMedia };
};
