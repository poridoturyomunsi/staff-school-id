import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { 
  isFirebaseConfigured, 
  db 
} from '../utils/firebaseClient';
import {
  addStaffToFirebase,
  addStaffBulkToFirebase,
  getAllStaffFromFirebase,
  updateStaffInFirebase,
  deleteStaffFromFirebase,
  listenToStaffChanges
} from '../utils/firebaseHelpers';
import { getMedia, setMedia, deleteMedia, cleanupMediaStore, setStaffList as persistStaffList, getStaffList as fetchStaffList, setKV, getKV } from '../utils/indexedDB';

const DatabaseContext = createContext();

const DEFAULT_SCHOOL_SETTINGS = {
  school_name: 'St. Paul Secondary School, Nasuti',
  school_address: 'P.O. Box 678, Nasuti, Iganga',
  telephone: '+256 701 234567',
  email: 'info@stpaulnasuti.ac.ug',
  motto: 'Education for Service',
  school_logo_url: null, // Base64 or URL
  school_stamp_url: null // Base64 or URL
};

const DEFAULT_CARD_TEMPLATE = {
  template_name: 'Default Template',
  font_family: 'Outfit',
  theme_color_primary: '#0369a1', // Tailwind Sky-700
  theme_color_secondary: '#0c4a6e', // Tailwind Sky-900
  theme_color_accent: '#f59e0b', // Tailwind Amber-500
  watermark_opacity: 0.08,
  watermark_size: 'large',
  logo_size: 67,
  qr_position: { x: 76.5, y: 26 }, // in percentages
  photo_position: { x: 7, y: 26 },
  elements_config: {
    title: { font_size: 10, font_weight: 'bold', text_color: '#0369a1' },
    school_name: { font_size: 12, font_weight: 'bold', text_color: '#0c4a6e' }
  }
};

const DEFAULT_DESIGNATIONS = [
  { id: '1', name: 'Head Teacher', status: 'Active' },
  { id: '2', name: 'Deputy Head Teacher', status: 'Active' },
  { id: '3', name: 'Director of Studies', status: 'Active' },
  { id: '4', name: 'Senior Teacher', status: 'Active' },
  { id: '5', name: 'Classroom Teacher', status: 'Active' },
  { id: '6', name: 'School Administrator', status: 'Active' },
  { id: '7', name: 'Bursar', status: 'Active' },
  { id: '8', name: 'Librarian', status: 'Active' },
  { id: '9', name: 'Laboratory Technician', status: 'Active' },
  { id: '10', name: 'ICT Administrator', status: 'Active' },
  { id: '11', name: 'Accounts Officer', status: 'Active' }
];

const normalizeCardNumber = (staffNumber) => {
  if (!staffNumber) {
    return `STP-${Math.floor(10000 + Math.random() * 90000)}-X`;
  }
  return staffNumber.trim().replace(/\//g, '-').replace(/\s+/g, '-').toUpperCase();
};

const generateSerialNumber = () => {
  const uuidSegment = crypto.randomUUID().split('-')[0].toUpperCase();
  return `SN-${uuidSegment}`;
};

const ensureStaffDates = (staffData) => {
  const today = new Date();
  const issue_date = staffData.issue_date?.trim() ? staffData.issue_date : today.toISOString().split('T')[0];
  const expiry_date = staffData.expiry_date?.trim()
    ? staffData.expiry_date
    : (() => {
        const expiryDate = new Date(today);
        expiryDate.setFullYear(expiryDate.getFullYear() + 5);
        return expiryDate.toISOString().split('T')[0];
      })();

  return { issue_date, expiry_date };
};

// Promise timeout helper to avoid indefinite waits for remote ops
const withTimeout = (promise, ms = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('operation_timed_out')), ms))
  ]);
};
const MOCK_STAFF = [
  {
    id: 'b75f80b9-52e6-4279-b1d5-8f6b158022b1',
    staff_number: 'STP/2023/001',
    full_name: 'Kibuuka Richard',
    gender: 'Male',
    department: 'Science',
    designation: 'Head of Department - Physics',
    subjects: 'Physics, Mathematics',
    status: 'Active',
    photo_url: '', // Will fall back to dynamic avatar
    signature_url: '',
    card_number: 'STP-90218-A',
    serial_number: 'SN-1A2B3C4D',
    created_at: '2026-06-08T10:00:00Z'
  },
  {
    id: 'a8b7c6d5-e4f3-a2b1-0987-1234567890ab',
    staff_number: 'STP/2022/045',
    full_name: 'Nakamya Sarah',
    gender: 'Female',
    department: 'Humanities',
    designation: 'Senior Teacher - History',
    subjects: 'History, Geography',
    status: 'Active',
    photo_url: '',
    signature_url: '',
    card_number: 'STP-84729-B',
    serial_number: 'SN-4E5F6G7H',
    created_at: '2026-06-08T11:00:00Z'
  },
  {
    id: 'c5d6e7f8-0912-3456-7890-abcdef012345',
    staff_number: 'STP/2024/012',
    full_name: 'Mwesigwa Emmanuel',
    gender: 'Male',
    department: 'Administration',
    designation: 'Deputy Headteacher (Administration)',
    subjects: 'General Paper',
    status: 'Active',
    photo_url: '',
    signature_url: '',
    card_number: 'STP-19382-C',
    serial_number: 'SN-8I9J0K1L',
    created_at: '2026-06-08T12:00:00Z'
  }
];

export const DatabaseProvider = ({ children }) => {
  const [isOffline, setIsOffline] = useState(!isFirebaseConfigured);
  const [staffList, setStaffList] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState(DEFAULT_SCHOOL_SETTINGS);
  const [cardTemplate, setCardTemplate] = useState(DEFAULT_CARD_TEMPLATE);
  const [printHistory, setPrintHistory] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unsubscribeStaff, setUnsubscribeStaff] = useState(null);
  const syncIntervalRef = useRef(null);

  // Helper to save staff list to IndexedDB and offload image payloads to IndexedDB
  const saveStaffListToIndexedDB = async (list) => {
    const strippedList = await Promise.all(list.map(async (s) => {
      const hasBase64Photo = s.photo_url && s.photo_url.startsWith('data:image/');
      const hasBase64Sig = s.signature_url && s.signature_url.startsWith('data:image/');
      
      if (hasBase64Photo) {
        await setMedia(`staff_photo_${s.id}`, s.photo_url);
      }
      if (hasBase64Sig) {
        await setMedia(`staff_signature_${s.id}`, s.signature_url);
      }
      
      return {
        ...s,
        photo_url: s.photo_url ? (hasBase64Photo || s.photo_url === 'indexeddb:photo' ? 'indexeddb:photo' : s.photo_url) : '',
        signature_url: s.signature_url ? (hasBase64Sig || s.signature_url === 'indexeddb:signature' ? 'indexeddb:signature' : s.signature_url) : ''
      };
    }));

    // persist staff records (without large base64 payloads) to IndexedDB
    await persistStaffList(strippedList);

    // Clean up media files that are no longer associated with active staff
    const activeKeys = list.flatMap(s => [`staff_photo_${s.id}`, `staff_signature_${s.id}`]);
    cleanupMediaStore(activeKeys);
  };

  // Attempt to sync locally saved staff records that failed to reach Firebase
  const syncLocalToFirebase = async () => {
    if (!isFirebaseConfigured || isOffline || !db) return;
    try {
      console.debug('[Database] Starting syncLocalToFirebase');
      const localStaff = [...staffList];
      const pending = localStaff.filter(s => s.pending_sync);
      if (!pending.length) {
        console.debug('[Database] No pending local records to sync');
        return;
      }

      for (const s of pending) {
        try {
          console.debug('[Database] syncing staff to firebase', s.staff_number || s.card_number);
          const result = await withTimeout(addStaffToFirebase(s), 20000);
          // Replace local record with firebase result (which includes firestore id, timestamps)
          const idx = localStaff.findIndex(x => x.id === s.id);
          if (idx >= 0) {
            localStaff[idx] = { ...result };
          }
        } catch (err) {
          console.warn('[Database] sync failed for', s.staff_number, err.message || err);
          // leave pending flag so it will be retried
        }
      }

      // Update state and persisted store with synced results
      setStaffList(localStaff);
      await saveStaffListToIndexedDB(localStaff);
      console.debug('[Database] syncLocalToFirebase completed');
    } catch (err) {
      console.error('[Database] syncLocalToFirebase error', err);
    }
  };

  const loadPersistedData = async () => {
    // 1. Staff Loading (migrated from localStorage to IndexedDB)
    let parsedStaff = await fetchStaffList();
    if (!parsedStaff || parsedStaff.length === 0) {
      const localStaff = localStorage.getItem('stp_staff');
      if (localStaff) {
        parsedStaff = JSON.parse(localStaff);
        await persistStaffList(parsedStaff);
      } else {
        await persistStaffList(MOCK_STAFF);
        parsedStaff = [...MOCK_STAFF];
      }
    }

    // Hydrate staff with IndexedDB images asynchronously
    const hydratedStaff = await Promise.all(parsedStaff.map(async (s) => {
      let photo_url = s.photo_url;
      let signature_url = s.signature_url;
      
      if (s.photo_url === 'indexeddb:photo') {
        photo_url = await getMedia(`staff_photo_${s.id}`) || '';
      }
      if (s.signature_url === 'indexeddb:signature') {
        signature_url = await getMedia(`staff_signature_${s.id}`) || '';
      }
      return { ...s, photo_url, signature_url };
    }));
    setStaffList(hydratedStaff);
    await loadPersistentConfig();
  };

  const loadPersistentConfig = async () => {
    let parsedSettings = await getKV('stp_school_settings');
    if (!parsedSettings) {
      const localSettings = localStorage.getItem('stp_school_settings');
      parsedSettings = localSettings ? JSON.parse(localSettings) : DEFAULT_SCHOOL_SETTINGS;
      await setKV('stp_school_settings', parsedSettings);
    }

    let logo_url = parsedSettings.school_logo_url;
    let stamp_url = parsedSettings.school_stamp_url;
    if (logo_url === 'indexeddb:logo') {
      logo_url = await getMedia('school_logo') || '';
    }
    if (stamp_url === 'indexeddb:stamp') {
      stamp_url = await getMedia('school_stamp') || '';
    }
    setSchoolSettings({
      ...parsedSettings,
      school_logo_url: logo_url,
      school_stamp_url: stamp_url
    });

    let parsedTemplate = await getKV('stp_card_template');
    if (!parsedTemplate) {
      const localTemplate = localStorage.getItem('stp_card_template');
      parsedTemplate = localTemplate ? JSON.parse(localTemplate) : DEFAULT_CARD_TEMPLATE;
      await setKV('stp_card_template', parsedTemplate);
    }
    setCardTemplate(parsedTemplate);

    let parsedHistory = await getKV('stp_print_history');
    if (!parsedHistory) {
      const localHistory = localStorage.getItem('stp_print_history');
      parsedHistory = localHistory ? JSON.parse(localHistory) : [];
      await setKV('stp_print_history', parsedHistory);
    }
    setPrintHistory(parsedHistory);

    let parsedDesignations = await getKV('stp_designations');
    if (!parsedDesignations) {
      const localDesignations = localStorage.getItem('stp_designations');
      parsedDesignations = localDesignations ? JSON.parse(localDesignations) : DEFAULT_DESIGNATIONS;
      await setKV('stp_designations', parsedDesignations);
    }
    setDesignations(parsedDesignations);
  };


  // Initialize data (either from Firebase or persisted IndexedDB)
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (isFirebaseConfigured && !isOffline && db) {
          // Listen to real-time staff changes from Firebase
          const unsubscribe = listenToStaffChanges((staffData) => {
            setStaffList(staffData);
          });
          setUnsubscribeStaff(() => unsubscribe);

          // Load persisted settings and templates from IndexedDB
          await loadPersistentConfig();
          // Try to sync any pending local records to Firebase now and periodically
          try { syncLocalToFirebase(); } catch (e) { console.warn('syncLocalToFirebase initial call failed', e); }
          try { syncIntervalRef.current = setInterval(() => syncLocalToFirebase(), 30000); } catch (e) {}
        } else {
          await loadPersistedData();
        }
      } catch (error) {
        console.error("Firebase load failed, falling back to persisted IndexedDB data:", error.message);
        setIsOffline(true);
        await loadPersistedData();
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Cleanup subscription and sync interval on unmount
    return () => {
      if (unsubscribeStaff) {
        unsubscribeStaff();
      }
      try { clearInterval(syncIntervalRef.current); } catch (e) {}
    };
  }, [isOffline]);

  // 1. Staff CRUD Operations
  const addStaff = async (staffData) => {
    console.debug('[Database] addStaff start', { staff_number: staffData.staff_number });
    const staffNumber = staffData.staff_number?.trim();
    if (!staffNumber) {
      throw new Error('Staff Number is required.');
    }

    // Duplicate staff_number check
    const isDuplicate = staffList.some(s => s.staff_number.toLowerCase() === staffNumber.toLowerCase());
    if (isDuplicate) {
      throw new Error(`Staff Number "${staffNumber}" is already registered.`);
    }

    const dates = ensureStaffDates(staffData);
    const newStaffObj = {
      id: crypto.randomUUID(),
      ...staffData,
      staff_number: staffNumber,
      card_number: staffData.card_number?.trim() || normalizeCardNumber(staffNumber),
      serial_number: staffData.serial_number || generateSerialNumber(),
      status: staffData.status || 'Active',
      ...dates,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isFirebaseConfigured && !isOffline && db) {
      try {
        // Use timeout to avoid hanging if Firebase Storage/Firestore stalls
        const result = await withTimeout(addStaffToFirebase(newStaffObj), 15000);
        console.debug('[Database] addStaff firebase result', result?.id || result);
        setStaffList(prev => [result, ...prev]);
        return result;
      } catch (err) {
        console.error("Firebase insert error or timeout, saving locally:", err.message || err);
        // Fallback to local save when remote fails or times out
          newStaffObj.pending_sync = true;
          newStaffObj._local = true;
          const updated = [newStaffObj, ...staffList];
        setStaffList(updated);
        await saveStaffListToIndexedDB(updated);
        return newStaffObj;
      }
    } else {
        newStaffObj.pending_sync = true;
        newStaffObj._local = true;
        const updated = [newStaffObj, ...staffList];
      setStaffList(updated);
      await saveStaffListToIndexedDB(updated);
      return newStaffObj;
    }
  };

  const addStaffBulk = async (records) => {
    const existingStaffNumbers = new Set(staffList.map(s => s.staff_number.toLowerCase()));
    const newStaffObjects = [];

    for (const record of records) {
      const recordStaffNumber = record.staff_number?.trim();
      if (!recordStaffNumber) {
        throw new Error('Each imported record must include a valid staff number.');
      }

      if (existingStaffNumbers.has(recordStaffNumber.toLowerCase())) {
        throw new Error(`Staff ID "${recordStaffNumber}" is already registered.`);
      }
      existingStaffNumbers.add(recordStaffNumber.toLowerCase());

      const dates = ensureStaffDates(record);
      newStaffObjects.push({
        id: crypto.randomUUID(),
        ...record,
        staff_number: recordStaffNumber,
        card_number: record.card_number?.trim() || normalizeCardNumber(recordStaffNumber),
        serial_number: record.serial_number || generateSerialNumber(),
        status: record.status || 'Active',
        ...dates,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    if (isFirebaseConfigured && !isOffline && db) {
      try {
        const result = await withTimeout(addStaffBulkToFirebase(newStaffObjects), 20000);
        setStaffList(prev => [...result, ...prev]);
        return result;
      } catch (err) {
        console.error("Firebase bulk insert error or timeout, falling back to local:", err.message || err);
        // mark pending sync for bulk saved records
        const pendingMarked = newStaffObjects.map(n => ({ ...n, pending_sync: true, _local: true }));
        const updated = [...pendingMarked, ...staffList];
        setStaffList(updated);
        await saveStaffListToIndexedDB(updated);
        return newStaffObjects;
      }
    } else {
      const pendingMarked = newStaffObjects.map(n => ({ ...n, pending_sync: true, _local: true }));
      const updated = [...pendingMarked, ...staffList];
      setStaffList(updated);
      await saveStaffListToIndexedDB(updated);
      return newStaffObjects;
    }
  };

  const updateStaff = async (id, updatedData) => {
    const normalizedStaffNumber = updatedData.staff_number?.trim();
    const isDuplicate = staffList.some(s => s.id !== id && normalizedStaffNumber && s.staff_number.toLowerCase() === normalizedStaffNumber.toLowerCase());
    if (isDuplicate) {
      throw new Error(`Staff Number "${normalizedStaffNumber}" is already registered by another staff.`);
    }

    const updatePayload = {
      ...updatedData,
      updated_at: new Date().toISOString()
    };

    if (normalizedStaffNumber) {
      updatePayload.staff_number = normalizedStaffNumber;
      if (!updatePayload.card_number) {
        updatePayload.card_number = normalizeCardNumber(normalizedStaffNumber);
      }
    }

    if (isFirebaseConfigured && !isOffline && db) {
      try {
        const result = await withTimeout(updateStaffInFirebase(id, updatePayload), 15000);
        setStaffList(prev => prev.map(s => s.id === id ? result : s));
        return result;
      } catch (err) {
        console.error("Firebase update error or timeout, falling back to local:", err.message || err);
        const updated = staffList.map(s => {
          if (s.id === id) {
            return { ...s, ...updatePayload, pending_sync: true };
          }
          return s;
        });
        setStaffList(updated);
        await saveStaffListToIndexedDB(updated);
        return updated.find(s => s.id === id);
      }
    } else {
      const updated = staffList.map(s => {
        if (s.id === id) {
          return { ...s, ...updatePayload };
        }
        return s;
      });
      setStaffList(updated);
      await saveStaffListToIndexedDB(updated);
      return updated.find(s => s.id === id);
    }
  };

  const deleteStaff = async (id) => {
    if (isFirebaseConfigured && !isOffline && db) {
      try {
        await deleteStaffFromFirebase(id);
        setStaffList(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        console.error("Firebase delete error:", err.message);
        throw err;
      }
    } else {
      const updated = staffList.filter(s => s.id !== id);
      setStaffList(updated);
      await saveStaffListToIndexedDB(updated);
    }
  };

  // 2. School Settings Operations
  const updateSchoolSettings = async (settings) => {
    if (isSupabaseConfigured && !isOffline) {
      try {
        const { data, error } = await supabase
          .from('school_settings')
          .upsert({ id: schoolSettings?.id || crypto.randomUUID(), ...settings, updated_at: new Date().toISOString() })
          .select()
          .single();
        if (error) throw error;
        setSchoolSettings(data);
        return data;
      } catch (err) {
        console.error("Supabase settings update error:", err.message);
        throw err;
      }
    } else {
      const logo_url = settings.school_logo_url;
      const stamp_url = settings.school_stamp_url;
      
      const hasBase64Logo = logo_url && logo_url.startsWith('data:image/');
      const hasBase64Stamp = stamp_url && stamp_url.startsWith('data:image/');
      
      if (hasBase64Logo) {
        await setMedia('school_logo', logo_url);
      } else if (!logo_url) {
        await deleteMedia('school_logo');
      }
      
      if (hasBase64Stamp) {
        await setMedia('school_stamp', stamp_url);
      } else if (!stamp_url) {
        await deleteMedia('school_stamp');
      }
      
      const strippedSettings = {
        ...schoolSettings,
        ...settings,
        school_logo_url: logo_url ? (hasBase64Logo || logo_url === 'indexeddb:logo' ? 'indexeddb:logo' : logo_url) : null,
        school_stamp_url: stamp_url ? (hasBase64Stamp || stamp_url === 'indexeddb:stamp' ? 'indexeddb:stamp' : stamp_url) : null,
        updated_at: new Date().toISOString()
      };
      
      setSchoolSettings({
        ...schoolSettings,
        ...settings,
        updated_at: new Date().toISOString()
      });
      
      await setKV('stp_school_settings', strippedSettings);
      return strippedSettings;
    }
  };

  // 3. Card Template Operations
  const updateCardTemplate = async (templateConfig) => {
    if (isSupabaseConfigured && !isOffline) {
      try {
        const { data, error } = await supabase
          .from('card_templates')
          .upsert({ id: cardTemplate?.id || crypto.randomUUID(), ...templateConfig, is_active: true, updated_at: new Date().toISOString() })
          .select()
          .single();
        if (error) throw error;
        setCardTemplate(data);
        return data;
      } catch (err) {
        console.error("Supabase template update error:", err.message);
        throw err;
      }
    } else {
      const updated = { ...cardTemplate, ...templateConfig, updated_at: new Date().toISOString() };
      setCardTemplate(updated);
      await setKV('stp_card_template', updated);
      return updated;
    }
  };

  // 4. Print History Log
  const logPrint = async (staffId) => {
    const printItem = {
      id: crypto.randomUUID(),
      staff_id: staffId,
      printed_by: 'Administrator',
      printed_at: new Date().toISOString(),
      status: 'Success'
    };

    if (isSupabaseConfigured && !isOffline) {
      try {
        const { error } = await supabase
          .from('printing_history')
          .insert(printItem);
        if (error) throw error;
        
        // Refresh history
        const { data: pHistry } = await supabase
          .from('printing_history')
          .select('*, staff(full_name, staff_number)')
          .order('printed_at', { ascending: false });
        setPrintHistory(pHistry || []);
      } catch (err) {
        console.error("Supabase print log error:", err.message);
      }
    } else {
      const staffInfo = staffList.find(s => s.id === staffId);
      const enrichedPrintItem = {
        ...printItem,
        staff: staffInfo ? { full_name: staffInfo.full_name, staff_number: staffInfo.staff_number } : null
      };
      const updated = [enrichedPrintItem, ...printHistory];
      setPrintHistory(updated);
      await setKV('stp_print_history', updated);
    }
  };

  const addDesignation = async (name) => {
    const isDuplicate = designations.some(d => d.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      throw new Error(`Designation "${name}" already exists.`);
    }
    const newDesignation = {
      id: crypto.randomUUID(),
      name,
      status: 'Active',
      created_at: new Date().toISOString()
    };
    
    if (isSupabaseConfigured && !isOffline) {
      try {
        const { data, error } = await supabase
          .from('designations')
          .insert(newDesignation)
          .select()
          .single();
        if (error) throw error;
        setDesignations(prev => [...prev, data]);
        return data;
      } catch (err) {
        console.warn("Supabase designations insert failed, falling back to local:", err.message);
      }
    }
    
    const updated = [...designations, newDesignation];
    setDesignations(updated);
    await setKV('stp_designations', updated);
    return newDesignation;
  };

  const updateDesignation = async (id, updatedData) => {
    if (updatedData.name) {
      const isDuplicate = designations.some(d => d.id !== id && d.name.toLowerCase() === updatedData.name.toLowerCase());
      if (isDuplicate) {
        throw new Error(`Designation "${updatedData.name}" already exists.`);
      }
    }

    if (isSupabaseConfigured && !isOffline) {
      try {
        const { data, error } = await supabase
          .from('designations')
          .update(updatedData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        setDesignations(prev => prev.map(d => d.id === id ? data : d));
        return data;
      } catch (err) {
        console.warn("Supabase designations update failed, falling back to local:", err.message);
      }
    }

    const updated = designations.map(d => d.id === id ? { ...d, ...updatedData } : d);
    setDesignations(updated);
    await setKV('stp_designations', updated);
    return updated.find(d => d.id === id);
  };

  const deleteDesignation = async (id) => {
    if (isSupabaseConfigured && !isOffline) {
      try {
        const { error } = await supabase
          .from('designations')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setDesignations(prev => prev.filter(d => d.id !== id));
        return;
      } catch (err) {
        console.warn("Supabase designations delete failed, falling back to local:", err.message);
      }
    }

    const updated = designations.filter(d => d.id !== id);
    setDesignations(updated);
    await setKV('stp_designations', updated);
  };

  return (
    <DatabaseContext.Provider value={{
      isOffline,
      toggleOfflineMode: () => setIsOffline(prev => !prev),
      staffList,
      schoolSettings,
      cardTemplate,
      printHistory,
      loading,
      addStaff,
      addStaffBulk,
      updateStaff,
      deleteStaff,
      updateSchoolSettings,
      updateCardTemplate,
      logPrint,
      designations,
      addDesignation,
      updateDesignation,
      deleteDesignation
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useDatabase = () => useContext(DatabaseContext);
