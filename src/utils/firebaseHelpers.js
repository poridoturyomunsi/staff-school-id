import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  getDoc,
  setDoc
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { db, storage } from './firebaseClient';

// Staff Collection Reference
const STAFF_COLLECTION = 'staff';
const SCHOOL_SETTINGS_COLLECTION = 'school_settings';
const CARD_TEMPLATES_COLLECTION = 'card_templates';
const PRINT_HISTORY_COLLECTION = 'print_history';
const DESIGNATIONS_COLLECTION = 'designations';

/**
 * Upload image to Firebase Storage
 * @param {File} file - Image file to upload
 * @param {string} folder - Folder path in storage (e.g., 'staff_photos')
 * @param {string} fileName - Custom file name
 * @returns {Promise<string>} - Download URL of uploaded image
 */
export const uploadImage = async (file, folder, fileName) => {
  if (!file) return null;

  try {
    // Convert file if it's a data URL
    let fileToUpload = file;
    if (typeof file === 'string' && file.startsWith('data:image/')) {
      const response = await fetch(file);
      const blob = await response.blob();
      fileToUpload = new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' });
    }

    const storageRef = ref(storage, `${folder}/${fileName}-${Date.now()}`);
    const snapshot = await uploadBytes(storageRef, fileToUpload);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Delete image from Firebase Storage
 * @param {string} imageUrl - URL of the image to delete
 */
export const deleteImage = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('firebase')) return;

  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};

/**
 * Add new staff member with photo and signature
 * @param {Object} staffData - Staff information
 * @returns {Promise<Object>} - Created staff document with ID
 */
export const addStaffToFirebase = async (staffData) => {
  try {
    const { photo_url, signature_url, ...baseData } = staffData;

    // Upload photo if provided
    let photoURL = null;
    if (photo_url) {
      photoURL = await uploadImage(photo_url, 'staff_photos', baseData.id || baseData.staff_number);
    }

    // Upload signature if provided
    let signatureURL = null;
    if (signature_url) {
      signatureURL = await uploadImage(signature_url, 'staff_signatures', baseData.id || baseData.staff_number);
    }

    // Create document in Firestore
    const docData = {
      ...baseData,
      photo_url: photoURL || '',
      signature_url: signatureURL || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, STAFF_COLLECTION), docData);
    return { id: docRef.id, ...docData };
  } catch (error) {
    console.error('Error adding staff to Firebase:', error);
    throw error;
  }
};

/**
 * Add multiple staff members (bulk upload)
 * @param {Array} staffList - Array of staff objects
 */
export const addStaffBulkToFirebase = async (staffList) => {
  try {
    const batch = writeBatch(db);
    const addedStaff = [];

    for (const staffData of staffList) {
      const { photo_url, signature_url, ...baseData } = staffData;

      // Upload photo if provided
      let photoURL = null;
      if (photo_url) {
        photoURL = await uploadImage(photo_url, 'staff_photos', baseData.staff_number);
      }

      // Upload signature if provided
      let signatureURL = null;
      if (signature_url) {
        signatureURL = await uploadImage(signature_url, 'staff_signatures', baseData.staff_number);
      }

      const docRef = doc(collection(db, STAFF_COLLECTION));
      batch.set(docRef, {
        ...baseData,
        photo_url: photoURL || '',
        signature_url: signatureURL || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      addedStaff.push({ id: docRef.id, ...baseData });
    }

    await batch.commit();
    return addedStaff;
  } catch (error) {
    console.error('Error bulk adding staff to Firebase:', error);
    throw error;
  }
};

/**
 * Get all staff members
 * @returns {Promise<Array>} - Array of all staff documents
 */
export const getAllStaffFromFirebase = async () => {
  try {
    const q = query(collection(db, STAFF_COLLECTION), orderBy('created_at', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching staff from Firebase:', error);
    throw error;
  }
};

/**
 * Real-time listener for staff changes
 * @param {Function} callback - Function called when data changes
 * @returns {Function} - Unsubscribe function
 */
export const listenToStaffChanges = (callback) => {
  try {
    const q = query(collection(db, STAFF_COLLECTION), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const staff = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(staff);
    });
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up staff listener:', error);
    throw error;
  }
};

/**
 * Update staff member
 * @param {string} staffId - ID of staff to update
 * @param {Object} updatedData - Updated staff information
 */
export const updateStaffInFirebase = async (staffId, updatedData) => {
  try {
    const { photo_url, signature_url, ...baseData } = updatedData;

    // Get current staff to check if images need updating
    const staffRef = doc(db, STAFF_COLLECTION, staffId);
    const staffSnap = await getDoc(staffRef);
    const currentStaff = staffSnap.data();

    let photoURL = currentStaff?.photo_url;
    let signatureURL = currentStaff?.signature_url;

    // Update photo if new one provided
    if (photo_url && photo_url !== currentStaff?.photo_url) {
      if (currentStaff?.photo_url) {
        await deleteImage(currentStaff.photo_url);
      }
      photoURL = await uploadImage(photo_url, 'staff_photos', staffId);
    }

    // Update signature if new one provided
    if (signature_url && signature_url !== currentStaff?.signature_url) {
      if (currentStaff?.signature_url) {
        await deleteImage(currentStaff.signature_url);
      }
      signatureURL = await uploadImage(signature_url, 'staff_signatures', staffId);
    }

    const updateData = {
      ...baseData,
      photo_url: photoURL,
      signature_url: signatureURL,
      updated_at: new Date().toISOString()
    };

    await updateDoc(staffRef, updateData);
    return { id: staffId, ...updateData };
  } catch (error) {
    console.error('Error updating staff in Firebase:', error);
    throw error;
  }
};

/**
 * Delete staff member and their images
 * @param {string} staffId - ID of staff to delete
 */
export const deleteStaffFromFirebase = async (staffId) => {
  try {
    // Get staff document to access image URLs
    const staffRef = doc(db, STAFF_COLLECTION, staffId);
    const staffSnap = await getDoc(staffRef);
    const staffData = staffSnap.data();

    // Delete images from storage
    if (staffData?.photo_url) {
      await deleteImage(staffData.photo_url);
    }
    if (staffData?.signature_url) {
      await deleteImage(staffData.signature_url);
    }

    // Delete document
    await deleteDoc(staffRef);
  } catch (error) {
    console.error('Error deleting staff from Firebase:', error);
    throw error;
  }
};

/**
 * Search staff by staff number (for duplicate checking)
 * @param {string} staffNumber - Staff number to search
 */
export const getStaffByNumber = async (staffNumber) => {
  try {
    const allStaff = await getAllStaffFromFirebase();
    return allStaff.find(s => s.staff_number.toLowerCase() === staffNumber.toLowerCase());
  } catch (error) {
    console.error('Error searching staff by number:', error);
    throw error;
  }
};

// School Settings Operations
export const updateSchoolSettingsInFirebase = async (settings) => {
  try {
    const settingsRef = doc(db, SCHOOL_SETTINGS_COLLECTION, 'default');
    const settingsSnap = await getDoc(settingsRef);
    
    const updateData = {
      ...settings,
      updated_at: new Date().toISOString()
    };

    if (settingsSnap.exists()) {
      await updateDoc(settingsRef, updateData);
    } else {
      await setDoc(settingsRef, {
        id: 'default',
        ...updateData,
        created_at: new Date().toISOString()
      });
    }
    return updateData;
  } catch (error) {
    console.error('Error updating school settings:', error);
    throw error;
  }
};

export const getSchoolSettingsFromFirebase = async () => {
  try {
    const settingsRef = doc(db, SCHOOL_SETTINGS_COLLECTION, 'default');
    const settingsSnap = await getDoc(settingsRef);
    return settingsSnap.data() || null;
  } catch (error) {
    console.error('Error fetching school settings:', error);
    throw error;
  }
};

// Card Template Operations
export const updateCardTemplateInFirebase = async (template) => {
  try {
    const templateRef = doc(db, CARD_TEMPLATES_COLLECTION, 'default');
    const templateSnap = await getDoc(templateRef);
    
    const updateData = {
      ...template,
      is_active: true,
      updated_at: new Date().toISOString()
    };

    if (templateSnap.exists()) {
      await updateDoc(templateRef, updateData);
    } else {
      await setDoc(templateRef, {
        id: 'default',
        ...updateData,
        created_at: new Date().toISOString()
      });
    }
    return updateData;
  } catch (error) {
    console.error('Error updating card template:', error);
    throw error;
  }
};

export const getCardTemplateFromFirebase = async () => {
  try {
    const templateRef = doc(db, CARD_TEMPLATES_COLLECTION, 'default');
    const templateSnap = await getDoc(templateRef);
    return templateSnap.data() || null;
  } catch (error) {
    console.error('Error fetching card template:', error);
    throw error;
  }
};

// Print History
export const logPrintInFirebase = async (printData) => {
  try {
    const docRef = await addDoc(collection(db, PRINT_HISTORY_COLLECTION), {
      ...printData,
      printed_at: new Date().toISOString()
    });
    return { id: docRef.id, ...printData };
  } catch (error) {
    console.error('Error logging print:', error);
    throw error;
  }
};

export const getPrintHistoryFromFirebase = async () => {
  try {
    const q = query(collection(db, PRINT_HISTORY_COLLECTION), orderBy('printed_at', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching print history:', error);
    throw error;
  }
};
