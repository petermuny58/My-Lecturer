import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'StudyMaterialsDB';
const STORE_NAME = 'modules';
const DB_VERSION = 1;

export interface StudyModule {
  id: string; // Typically the user's UID
  text: string;
  fileName: string;
  timestamp: number;
}

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function saveModule(module: StudyModule) {
  const db = await initDB();
  return db.put(STORE_NAME, module);
}

export async function getModule(uid: string): Promise<StudyModule | undefined> {
  const db = await initDB();
  return db.get(STORE_NAME, uid);
}

export async function deleteModule(uid: string) {
  const db = await initDB();
  return db.delete(STORE_NAME, uid);
}
