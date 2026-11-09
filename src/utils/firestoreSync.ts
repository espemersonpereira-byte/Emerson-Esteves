import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Database,
  Job,
  Client,
  Appointment,
  ExpenseRecord,
  RevenueRecord,
  Quote,
  ServiceCatalogItem,
  Prefs,
} from '../types';
import { getDefaultDatabase, saveDatabase, loadDatabase } from '../utils';

export interface SyncLoadResult {
  db: Database;
  source: 'cloud' | 'cache';
  error?: string;
}

function mergeRecordsById<T extends { id: string }>(
  cloudItems: T[],
  localItems: T[]
): { merged: T[]; localOnly: T[] } {
  const map = new Map<string, T>();
  const cloudIds = new Set<string>();

  for (const item of cloudItems) {
    if (item && item.id) {
      map.set(item.id, item);
      cloudIds.add(item.id);
    }
  }

  const localOnly: T[] = [];
  for (const localItem of localItems || []) {
    if (!localItem || !localItem.id) continue;
    if (!cloudIds.has(localItem.id)) {
      map.set(localItem.id, localItem);
      localOnly.push(localItem);
    } else {
      const cloudItem = map.get(localItem.id) as T & { updatedAt?: string };
      const localWithTs = localItem as T & { updatedAt?: string };
      if (
        localWithTs.updatedAt &&
        cloudItem?.updatedAt &&
        localWithTs.updatedAt > cloudItem.updatedAt
      ) {
        map.set(localItem.id, localItem);
        localOnly.push(localItem);
      }
    }
  }

  return { merged: Array.from(map.values()), localOnly };
}

/**
 * Loads user data from Firestore with robust local fallback and ID-level union merging.
 * Guarantees that local cached jobs, clients, quotes, catalog, expenses, and receipts
 * are NEVER wiped even if Firestore is slow, unreachable, or encounters network drops.
 */
export async function loadUserDataWithDetails(userId: string): Promise<SyncLoadResult> {
  const localCache = loadDatabase(userId);
  const defaultDb = getDefaultDatabase();

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      db:
        localCache.jobs.length > 0 ||
        localCache.clients.length > 0 ||
        (localCache.quotes?.length || 0) > 0
          ? localCache
          : defaultDb,
      source: 'cache',
      error: 'Sem conexão com a internet',
    };
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    let userSnap;
    try {
      userSnap = await getDoc(userDocRef);
    } catch (err) {
      console.warn('Could not fetch user profile from Firestore:', err);
    }

    let prefs: Prefs = localCache.prefs || defaultDb.prefs;
    if (userSnap && userSnap.exists()) {
      const data = userSnap.data();
      if (data.prefs || data.photo || data.displayName) {
        const resolvedPhoto =
          (data.prefs?.photo && String(data.prefs.photo).trim()) ||
          (typeof data.photo === 'string' && data.photo.trim()) ||
          (localCache.prefs?.photo && String(localCache.prefs.photo).trim()) ||
          defaultDb.prefs.photo ||
          '';

        prefs = {
          ...defaultDb.prefs,
          ...localCache.prefs,
          ...(data.prefs || {}),
          displayName:
            data.prefs?.displayName ||
            data.displayName ||
            localCache.prefs.displayName ||
            defaultDb.prefs.displayName,
          photo: resolvedPhoto,
        };

        if (resolvedPhoto && (!data.prefs?.photo || !String(data.prefs.photo).trim())) {
          syncPrefsToFirestore(userId, prefs).catch(console.warn);
        }
      }
    }

    // Load jobs subcollection
    const jobsRef = collection(db, 'users', userId, 'jobs');
    let jobsSnap;
    try {
      jobsSnap = await getDocs(jobsRef);
    } catch (err) {
      console.warn('Could not fetch jobs subcollection:', err);
      return {
        db: localCache,
        source: 'cache',
        error: 'Instabilidade ao carregar trabalhos da nuvem',
      };
    }

    const jobs: Job[] = [];
    if (jobsSnap && !jobsSnap.empty) {
      jobsSnap.forEach((docItem) => {
        const item = docItem.data() as Job;
        jobs.push({
          ...item,
          id: docItem.id || item.id,
        });
      });
    }

    // Load clients subcollection
    const clientsRef = collection(db, 'users', userId, 'clients');
    let clientsSnap;
    try {
      clientsSnap = await getDocs(clientsRef);
    } catch (err) {
      console.warn('Could not fetch clients subcollection:', err);
    }

    const clients: Client[] = [];
    if (clientsSnap && !clientsSnap.empty) {
      clientsSnap.forEach((docItem) => {
        const item = docItem.data() as Client;
        clients.push({
          ...item,
          id: docItem.id || item.id,
        });
      });
    }

    // Load appointments subcollection
    const apptsRef = collection(db, 'users', userId, 'appointments');
    let apptsSnap;
    try {
      apptsSnap = await getDocs(apptsRef);
    } catch (err) {
      console.warn('Could not fetch appointments subcollection:', err);
    }

    const appointments: Appointment[] = [];
    if (apptsSnap && !apptsSnap.empty) {
      apptsSnap.forEach((docItem) => {
        const item = docItem.data() as Appointment;
        appointments.push({
          ...item,
          id: docItem.id || item.id,
        });
      });
    }

    // Load expenses subcollection
    const expensesRef = collection(db, 'users', userId, 'expenses');
    let expensesSnap;
    try {
      expensesSnap = await getDocs(expensesRef);
    } catch (err) {
      console.warn('Could not fetch expenses subcollection:', err);
    }

    const expenses: ExpenseRecord[] = [];
    if (expensesSnap && !expensesSnap.empty) {
      expensesSnap.forEach((docItem) => {
        const item = docItem.data() as ExpenseRecord;
        expenses.push({
          ...item,
          id: docItem.id || item.id,
        });
      });
    }

    // Load revenues subcollection
    const revenuesRef = collection(db, 'users', userId, 'revenues');
    let revenuesSnap;
    try {
      revenuesSnap = await getDocs(revenuesRef);
    } catch (err) {
      console.warn('Could not fetch revenues subcollection:', err);
    }

    const revenues: RevenueRecord[] = [];
    if (revenuesSnap && !revenuesSnap.empty) {
      revenuesSnap.forEach((docItem) => {
        const item = docItem.data() as RevenueRecord;
        revenues.push({
          ...item,
          id: docItem.id || item.id,
        });
      });
    }

    // Load quotes subcollection
    const quotesRef = collection(db, 'users', userId, 'quotes');
    let quotesSnap;
    try {
      quotesSnap = await getDocs(quotesRef);
    } catch (err) {
      console.warn('Could not fetch quotes subcollection:', err);
    }

    const quotes: Quote[] = [];
    if (quotesSnap && !quotesSnap.empty) {
      quotesSnap.forEach((docItem) => {
        const item = docItem.data() as Quote;
        quotes.push({
          ...item,
          id: docItem.id || item.id,
        });
      });
    }

    // Load catalog subcollection
    const catalogRef = collection(db, 'users', userId, 'catalog');
    let catalogSnap;
    try {
      catalogSnap = await getDocs(catalogRef);
    } catch (err) {
      console.warn('Could not fetch catalog subcollection:', err);
    }

    const catalog: ServiceCatalogItem[] = [];
    if (catalogSnap && !catalogSnap.empty) {
      catalogSnap.forEach((docItem) => {
        const item = docItem.data() as ServiceCatalogItem;
        catalog.push({
          ...item,
          id: docItem.id || item.id,
        });
      });
    }

    // Union merge cloud records with local cache records by ID so no newly created record is ever lost
    const mergedJobs = mergeRecordsById(jobs, localCache.jobs || []);
    const mergedClients = mergeRecordsById(clients, localCache.clients || []);
    const mergedAppts = mergeRecordsById(appointments, localCache.appointments || []);
    const mergedExpenses = mergeRecordsById(expenses, localCache.expenses || []);
    const mergedRevenues = mergeRecordsById(revenues, localCache.revenues || []);
    const mergedQuotes = mergeRecordsById(quotes, localCache.quotes || []);
    const mergedCatalog = mergeRecordsById(catalog, localCache.catalog || []);

    const hasAnyData =
      mergedJobs.merged.length > 0 ||
      mergedClients.merged.length > 0 ||
      mergedAppts.merged.length > 0 ||
      mergedExpenses.merged.length > 0 ||
      mergedRevenues.merged.length > 0 ||
      mergedQuotes.merged.length > 0 ||
      mergedCatalog.merged.length > 0 ||
      (userSnap && userSnap.exists());

    if (hasAnyData) {
      const assembledDb: Database = {
        jobs: mergedJobs.merged,
        clients: mergedClients.merged,
        appointments: mergedAppts.merged,
        expenses: mergedExpenses.merged,
        revenues: mergedRevenues.merged,
        quotes: mergedQuotes.merged,
        catalog: mergedCatalog.merged,
        prefs,
      };
      saveDatabase(assembledDb, userId);

      // Push any local-only unsynced records to Firestore in background
      for (const j of mergedJobs.localOnly) syncJobToFirestore(userId, j).catch(console.warn);
      for (const c of mergedClients.localOnly) syncClientToFirestore(userId, c).catch(console.warn);
      for (const a of mergedAppts.localOnly) syncAppointmentToFirestore(userId, a).catch(console.warn);
      for (const e of mergedExpenses.localOnly) syncExpenseToFirestore(userId, e).catch(console.warn);
      for (const r of mergedRevenues.localOnly) syncRevenueToFirestore(userId, r).catch(console.warn);
      for (const q of mergedQuotes.localOnly) syncQuoteToFirestore(userId, q).catch(console.warn);
      for (const cat of mergedCatalog.localOnly) syncCatalogItemToFirestore(userId, cat).catch(console.warn);

      return { db: assembledDb, source: 'cloud' };
    }

    return { db: defaultDb, source: 'cloud' };
  } catch (error) {
    console.warn('Error loading from Firestore, falling back safely to local cache:', error);
    return {
      db: localCache,
      source: 'cache',
      error: error instanceof Error ? error.message : 'Falha na conexão',
    };
  }
}

export async function loadUserDataFromFirestore(userId: string): Promise<Database> {
  const result = await loadUserDataWithDetails(userId);
  return result.db;
}

export async function syncJobToFirestore(userId: string, job: Job): Promise<void> {
  if (!userId || !job.id) return;
  try {
    const jobDocRef = doc(db, 'users', userId, 'jobs', job.id);
    await setDoc(
      jobDocRef,
      {
        ...job,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync job to Firestore:', err);
  }
}

export async function deleteJobFromFirestore(userId: string, jobId: string): Promise<void> {
  if (!userId || !jobId) return;
  try {
    const jobDocRef = doc(db, 'users', userId, 'jobs', jobId);
    await deleteDoc(jobDocRef);
  } catch (err) {
    console.warn('Failed to delete job from Firestore:', err);
  }
}

export async function syncClientToFirestore(userId: string, client: Client): Promise<void> {
  if (!userId || !client.id) return;
  try {
    const clientDocRef = doc(db, 'users', userId, 'clients', client.id);
    await setDoc(
      clientDocRef,
      {
        ...client,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync client to Firestore:', err);
  }
}

export async function deleteClientFromFirestore(userId: string, clientId: string): Promise<void> {
  if (!userId || !clientId) return;
  try {
    const clientDocRef = doc(db, 'users', userId, 'clients', clientId);
    await deleteDoc(clientDocRef);
  } catch (err) {
    console.warn('Failed to delete client from Firestore:', err);
  }
}

export async function syncAppointmentToFirestore(userId: string, appt: Appointment): Promise<void> {
  if (!userId || !appt.id) return;
  try {
    const apptDocRef = doc(db, 'users', userId, 'appointments', appt.id);
    await setDoc(
      apptDocRef,
      {
        ...appt,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync appointment to Firestore:', err);
  }
}

export async function deleteAppointmentFromFirestore(userId: string, apptId: string): Promise<void> {
  if (!userId || !apptId) return;
  try {
    const apptDocRef = doc(db, 'users', userId, 'appointments', apptId);
    await deleteDoc(apptDocRef);
  } catch (err) {
    console.warn('Failed to delete appointment from Firestore:', err);
  }
}

export async function syncExpenseToFirestore(userId: string, expense: ExpenseRecord): Promise<void> {
  if (!userId || !expense.id) return;
  try {
    const ref = doc(db, 'users', userId, 'expenses', expense.id);
    await setDoc(
      ref,
      {
        ...expense,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync expense to Firestore:', err);
  }
}

export async function deleteExpenseFromFirestore(userId: string, expenseId: string): Promise<void> {
  if (!userId || !expenseId) return;
  try {
    const ref = doc(db, 'users', userId, 'expenses', expenseId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Failed to delete expense from Firestore:', err);
  }
}

export async function syncRevenueToFirestore(userId: string, revenue: RevenueRecord): Promise<void> {
  if (!userId || !revenue.id) return;
  try {
    const ref = doc(db, 'users', userId, 'revenues', revenue.id);
    await setDoc(
      ref,
      {
        ...revenue,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync revenue to Firestore:', err);
  }
}

export async function deleteRevenueFromFirestore(userId: string, revenueId: string): Promise<void> {
  if (!userId || !revenueId) return;
  try {
    const ref = doc(db, 'users', userId, 'revenues', revenueId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Failed to delete revenue from Firestore:', err);
  }
}

export async function syncQuoteToFirestore(userId: string, quote: Quote): Promise<void> {
  if (!userId || !quote.id) return;
  try {
    const ref = doc(db, 'users', userId, 'quotes', quote.id);
    await setDoc(
      ref,
      {
        ...quote,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync quote to Firestore:', err);
  }
}

export async function deleteQuoteFromFirestore(userId: string, quoteId: string): Promise<void> {
  if (!userId || !quoteId) return;
  try {
    const ref = doc(db, 'users', userId, 'quotes', quoteId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Failed to delete quote from Firestore:', err);
  }
}

export async function syncCatalogItemToFirestore(
  userId: string,
  item: ServiceCatalogItem
): Promise<void> {
  if (!userId || !item.id) return;
  try {
    const ref = doc(db, 'users', userId, 'catalog', item.id);
    await setDoc(
      ref,
      {
        ...item,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync catalog item to Firestore:', err);
  }
}

export async function deleteCatalogItemFromFirestore(userId: string, itemId: string): Promise<void> {
  if (!userId || !itemId) return;
  try {
    const ref = doc(db, 'users', userId, 'catalog', itemId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Failed to delete catalog item from Firestore:', err);
  }
}

export async function syncPrefsToFirestore(userId: string, prefs: Prefs): Promise<void> {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        prefs,
        photo: prefs.photo || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync preferences to Firestore:', err);
  }
}

export async function syncFullDatabaseToFirestore(
  userId: string,
  database: Database
): Promise<void> {
  if (!userId) return;

  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        uid: userId,
        prefs: database.prefs,
        photo: database.prefs?.photo || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const batch = writeBatch(db);
    let opCount = 0;

    for (const job of database.jobs) {
      if (job.id) {
        const jobRef = doc(db, 'users', userId, 'jobs', job.id);
        batch.set(jobRef, { ...job, userId, updatedAt: new Date().toISOString() }, { merge: true });
        opCount++;
      }
    }

    for (const client of database.clients) {
      if (client.id) {
        const clientRef = doc(db, 'users', userId, 'clients', client.id);
        batch.set(
          clientRef,
          { ...client, userId, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        opCount++;
      }
    }

    for (const appt of database.appointments) {
      if (appt.id) {
        const apptRef = doc(db, 'users', userId, 'appointments', appt.id);
        batch.set(apptRef, { ...appt, userId, updatedAt: new Date().toISOString() }, { merge: true });
        opCount++;
      }
    }

    for (const exp of database.expenses || []) {
      if (exp.id) {
        const expRef = doc(db, 'users', userId, 'expenses', exp.id);
        batch.set(expRef, { ...exp, userId, updatedAt: new Date().toISOString() }, { merge: true });
        opCount++;
      }
    }

    for (const rev of database.revenues || []) {
      if (rev.id) {
        const revRef = doc(db, 'users', userId, 'revenues', rev.id);
        batch.set(revRef, { ...rev, userId, updatedAt: new Date().toISOString() }, { merge: true });
        opCount++;
      }
    }

    for (const quote of database.quotes || []) {
      if (quote.id) {
        const qRef = doc(db, 'users', userId, 'quotes', quote.id);
        batch.set(qRef, { ...quote, userId, updatedAt: new Date().toISOString() }, { merge: true });
        opCount++;
      }
    }

    for (const cat of database.catalog || []) {
      if (cat.id) {
        const cRef = doc(db, 'users', userId, 'catalog', cat.id);
        batch.set(cRef, { ...cat, userId, updatedAt: new Date().toISOString() }, { merge: true });
        opCount++;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Error during full database sync to Firestore:', err);
  }
}
