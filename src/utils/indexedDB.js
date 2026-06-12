// IndexedDB Helper Utility for St. Paul ID Card Management System
// Offloads large Base64 images (photos, signatures, logos) from localStorage to prevent quota exceeded errors.

const DB_NAME = 'StPaulIDCardDB';
const MEDIA_STORE = 'media';
const STAFF_STORE = 'staff';
const KV_STORE = 'keyvalue';
const DB_VERSION = 3;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE);
      }
      if (!db.objectStoreNames.contains(STAFF_STORE)) {
        db.createObjectStore(STAFF_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(KV_STORE)) {
        db.createObjectStore(KV_STORE, { keyPath: 'key' });
      }
    };
    
    request.onsuccess = (e) => {
      resolve(e.target.result);
    };
    
    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

/**
 * Retrieve a media item (Base64 string or Blob) by key
 */
export async function getMedia(key) {
  if (!key) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MEDIA_STORE, 'readonly');
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.get(key);
      
      request.onsuccess = (e) => {
        resolve(e.target.result || null);
      };
      
      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  } catch (err) {
    console.error(`IndexedDB getMedia failed for key "${key}":`, err);
    return null;
  }
}

/**
 * Staff store helpers
 */
export async function setStaffList(list) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STAFF_STORE, 'readwrite');
      const store = tx.objectStore(STAFF_STORE);
      // clear existing
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const item of list) {
          store.put(item);
        }
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IndexedDB setStaffList failed:', err);
    return false;
  }
}

export async function getStaffList() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STAFF_STORE, 'readonly');
      const store = tx.objectStore(STAFF_STORE);
      const req = store.getAll();
      req.onsuccess = (e) => resolve(e.target.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IndexedDB getStaffList failed:', err);
    return [];
  }
}

/**
 * Store a media item by key
 */
export async function setMedia(key, value) {
  if (!key) return false;
  
  // If the value is empty/null, delete the key to save space
  if (!value) {
    return await deleteMedia(key);
  }
  
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MEDIA_STORE, 'readwrite');
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.put(value, key);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  } catch (err) {
    console.error(`IndexedDB setMedia failed for key "${key}":`, err);
    return false;
  }
}

/**
 * Delete a media item by key
 */
export async function deleteMedia(key) {
  if (!key) return false;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MEDIA_STORE, 'readwrite');
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.delete(key);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  } catch (err) {
    console.error(`IndexedDB deleteMedia failed for key "${key}":`, err);
    return false;
  }
}

/**
 * Clean up old keys that are not present in the current active IDs list.
 * Helps prevent dangling data from deleted staff or temporary uploads.
 */
export async function cleanupMediaStore(activeKeys) {
  try {
    const db = await openDB();
    const allKeys = await new Promise((resolve, reject) => {
      const transaction = db.transaction(MEDIA_STORE, 'readonly');
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.getAllKeys();
      request.onsuccess = (e) => resolve(e.target.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
    
    const activeKeySet = new Set(activeKeys);
    const keysToDelete = allKeys.filter(k => !activeKeySet.has(k) && k !== 'school_logo' && k !== 'school_stamp');
    
    if (keysToDelete.length > 0) {
      console.log(`Cleaning up ${keysToDelete.length} unused media items from IndexedDB...`);
      const transaction = db.transaction(MEDIA_STORE, 'readwrite');
      const store = transaction.objectStore(MEDIA_STORE);
      for (const k of keysToDelete) {
        store.delete(k);
      }
    }
  } catch (err) {
    console.error("IndexedDB cleanup failed:", err);
  }
}

export async function setKV(key, value) {
  if (!key) return false;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KV_STORE, 'readwrite');
      const store = transaction.objectStore(KV_STORE);
      const request = store.put({ key, value });
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error(`IndexedDB setKV failed for key "${key}":`, err);
    return false;
  }
}

export async function getKV(key) {
  if (!key) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KV_STORE, 'readonly');
      const store = transaction.objectStore(KV_STORE);
      const request = store.get(key);
      request.onsuccess = (e) => resolve(e.target.result ? e.target.result.value : null);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error(`IndexedDB getKV failed for key "${key}":`, err);
    return null;
  }
}
