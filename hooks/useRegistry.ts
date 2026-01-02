import { useState, useCallback, useEffect } from 'react';
import { Project, MediaAsset, MultiCamContainer, TranscriptWord, STORE_NAMES } from '../types';

const DB_NAME = 'StoryGraphVault';
/** * Version 4: Ensures Container indexing is robust for Phased Ingest
 */
const DB_VERSION = 4; 

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

// --- Project Registry Hook ---

export const useProjectRegistry = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAMES.PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_NAMES.PROJECTS);
      const result = await promisifyRequest(store.getAll());
      setProjects(result);
    } catch (e) {
      console.error("Failed to fetch projects", e);
    } finally {
      setLoading(false);
    }
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

// --- Media & Container Registry Hook ---

export const useMediaRegistry = (projectId?: string) => {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [containers, setContainers] = useState<MultiCamContainer[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetches both raw media and sync-containers (XML results) for the project.
   */
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const db = await openDB();
      
      // Fetch Media Assets
      const mTx = db.transaction(STORE_NAMES.MEDIA, 'readonly');
      const mIndex = mTx.objectStore(STORE_NAMES.MEDIA).index('projectId');
      const mResult = await promisifyRequest(mIndex.getAll(IDBKeyRange.only(projectId)));
      setMedia(mResult);

      // Fetch Containers (Multicam/Sequences)
      const cTx = db.transaction(STORE_NAMES.CONTAINERS, 'readonly');
      const cIndex = cTx.objectStore(STORE_NAMES.CONTAINERS).index('projectId');
      const cResult = await promisifyRequest(cIndex.getAll(IDBKeyRange.only(projectId)));
      setContainers(cResult);
    } catch (e) {
      console.error("Registry Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const bulkUpsertMedia = async (assets: MediaAsset[]) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAMES.MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.MEDIA);
    
    assets.forEach(asset => {
      // .put() handles both create and update (upsert)
      store.put(asset);
    });

    return new Promise<void>((resolve) => {
      tx.oncomplete = () => {
        fetchData(); // Trigger UI refresh
        resolve();
      };
    });
  };

  const bulkUpsertContainers = async (newContainers: MultiCamContainer[]) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAMES.CONTAINERS, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.CONTAINERS);
    
    newContainers.forEach(container => {
      store.put(container);
    });

    return new Promise<void>((resolve) => {
      tx.oncomplete = () => {
        fetchData(); // Trigger UI refresh
        resolve();
      };
    });
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  return { 
    media, 
    containers, 
    loading, 
    bulkUpsertMedia, 
    bulkUpsertContainers, 
    refresh: fetchData 
  };
};