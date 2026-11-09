import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
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
  PageId,
  AuthState,
  ThemePreference,
} from './types';
import {
  loadDatabase,
  saveDatabase,
  clearUserPhotoCache,
  formatProfessionalId,
  AK,
  SK,
  today,
  uid,
} from './utils';
import { CloudOff, RefreshCw } from 'lucide-react';
import { auth as firebaseAuth } from './firebase';
import {
  loadUserDataWithDetails,
  syncJobToFirestore,
  deleteJobFromFirestore,
  syncClientToFirestore,
  deleteClientFromFirestore,
  syncAppointmentToFirestore,
  deleteAppointmentFromFirestore,
  syncExpenseToFirestore,
  deleteExpenseFromFirestore,
  syncRevenueToFirestore,
  deleteRevenueFromFirestore,
  syncQuoteToFirestore,
  deleteQuoteFromFirestore,
  syncCatalogItemToFirestore,
  deleteCatalogItemFromFirestore,
  syncPrefsToFirestore,
  syncFullDatabaseToFirestore,
} from './utils/firestoreSync';
import { logoutFirebase } from './utils/firebaseAuth';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { ReceiptModal } from './components/ReceiptModal';
import { ReportPrintModal } from './components/ReportPrintModal';
import { ProfileModal } from './components/ProfileModal';
import { HoursDetailModal } from './components/HoursDetailModal';
import { HomePage } from './pages/HomePage';
import { JobFormPage } from './pages/JobFormPage';
import { JobsListPage } from './pages/JobsListPage';
import { CalendarPage } from './pages/CalendarPage';
import { ClientsPage } from './pages/ClientsPage';
import { FinancePage } from './pages/FinancePage';
import { BusinessPage } from './pages/BusinessPage';
import { QuotesPage } from './pages/QuotesPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { CatalogPage } from './pages/CatalogPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage, computeAppNotifications } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { SplashScreen } from './components/SplashScreen';

export default function App() {
  // Auth & Session
  const [auth, setAuth] = useState<AuthState | null>(() => {
    try {
      const raw = localStorage.getItem(AK);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const session = localStorage.getItem(SK);
      const raw = localStorage.getItem(AK);
      return Boolean(session === '1' && raw);
    } catch {
      return false;
    }
  });

  // Animated Splash Screen on initial app boot
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Desktop Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('freelas_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('freelas_sidebar_collapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  // Load local database with user isolation
  const [db, setDb] = useState<Database>(() => loadDatabase(auth?.uid || auth?.username));

  // Current page
  const [currentPage, setCurrentPage] = useState<PageId>('home');

  // Sub-navigation state for interactive cards & Quick Actions
  const [financeTab, setFinanceTab] = useState<'overview' | 'received' | 'pending' | 'expenses'>(
    'overview'
  );
  const [financeOpenForm, setFinanceOpenForm] = useState<'revenue' | 'expense' | null>(null);
  const [openNewClientOnLoad, setOpenNewClientOnLoad] = useState(false);
  const [openNewQuoteOnLoad, setOpenNewQuoteOnLoad] = useState(false);
  const [openNewApptOnLoad, setOpenNewApptOnLoad] = useState(false);

  const [jobsSituation, setJobsSituation] = useState<
    'all' | 'completed' | 'in_progress' | 'future' | 'pending'
  >('all');
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);

  // Job currently being edited in JobFormPage
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Modals
  const [selectedReceiptJob, setSelectedReceiptJob] = useState<Job | null>(null);
  const [reportMonthToPrint, setReportMonthToPrint] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme Hook: Handles 'auto', 'light', 'dark' + real-time matchMedia listener
  const { themePreference, setThemePreference, isDark, systemIsDark } = useTheme(
    db.prefs.theme || 'auto'
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  }, []);

  // Save DB helper with functional state update, user isolation, and immediate LocalStorage persistence
  const updateDb = useCallback(
    (updater: Database | ((prev: Database) => Database)) => {
      const userKey = auth?.uid || auth?.username;
      setDb((prevDb) => {
        const nextDb = typeof updater === 'function' ? updater(prevDb) : updater;
        saveDatabase(nextDb, userKey);
        return nextDb;
      });
    },
    [auth?.uid, auth?.username]
  );

  // Sync theme changes with db.prefs
  const handleThemeChange = (newTheme: ThemePreference) => {
    setThemePreference(newTheme);
    updateDb((prevDb) => {
      const updatedPrefs: Prefs = {
        ...prevDb.prefs,
        theme: newTheme,
      };
      if (auth?.uid) {
        syncPrefsToFirestore(auth.uid, updatedPrefs).catch(console.warn);
      }
      return {
        ...prevDb,
        prefs: updatedPrefs,
      };
    });
    const label =
      newTheme === 'auto'
        ? `Tema Automático (agora modo ${systemIsDark ? 'escuro' : 'claro'})`
        : newTheme === 'dark'
        ? 'Modo Escuro ativado'
        : 'Modo Claro ativado';
    showToast(label);
  };

  // Sync state management with ref lock to prevent re-subscription loops
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'synced' | 'cached' | 'offline'>(
    'idle'
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);

  // Safe sync helper: pulls from cloud when available, merges with in-memory state by ID so no consecutive record is ever lost
  const syncUserData = useCallback(
    async (userId: string, isManual = false) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setIsSyncing(true);

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncStatus('offline');
        isSyncingRef.current = false;
        setIsSyncing(false);
        if (isManual) {
          showToast('Você está sem conexão com a internet. Usando dados salvos no aparelho.');
        }
        return;
      }

      try {
        const res = await loadUserDataWithDetails(userId);
        const mergeById = <T extends { id: string }>(cloudArr: T[], memArr: T[]): T[] => {
          const map = new Map<string, T>();
          for (const item of cloudArr || []) {
            if (item && item.id) map.set(item.id, item);
          }
          for (const item of memArr || []) {
            if (item && item.id && !map.has(item.id)) {
              map.set(item.id, item);
            }
          }
          return Array.from(map.values());
        };

        if (res.source === 'cloud') {
          setDb((prevDb) => {
            const merged: Database = {
              jobs: mergeById(res.db.jobs, prevDb.jobs),
              clients: mergeById(res.db.clients, prevDb.clients),
              appointments: mergeById(res.db.appointments, prevDb.appointments),
              expenses: mergeById(res.db.expenses || [], prevDb.expenses || []),
              revenues: mergeById(res.db.revenues || [], prevDb.revenues || []),
              quotes: mergeById(res.db.quotes || [], prevDb.quotes || []),
              catalog: mergeById(res.db.catalog || [], prevDb.catalog || []),
              prefs: {
                ...prevDb.prefs,
                ...res.db.prefs,
                photo:
                  (res.db.prefs?.photo && res.db.prefs.photo.trim()) ||
                  (prevDb.prefs?.photo && prevDb.prefs.photo.trim()) ||
                  firebaseAuth.currentUser?.photoURL ||
                  '',
              },
            };
            saveDatabase(merged, userId);
            return merged;
          });
          setSyncStatus('synced');
          if (isManual) {
            showToast('Dados sincronizados com a nuvem com sucesso!');
          }
        } else {
          setDb((prevDb) => {
            if (prevDb.jobs.length === 0 && res.db.jobs.length > 0) {
              return res.db;
            }
            return prevDb;
          });
          setSyncStatus('cached');
          if (isManual) {
            showToast('Nuvem temporariamente lenta. Seus dados locais continuam seguros.');
          }
        }

        if (res.db.prefs?.theme) {
          setThemePreference(res.db.prefs.theme);
        }
      } catch (err) {
        console.warn('Sync error:', err);
        setSyncStatus('cached');
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [setThemePreference, showToast]
  );

  // Listen to Firebase Auth state for automatic session restore and cross-device sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        const newAuth: AuthState = {
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          email: firebaseUser.email || '',
          uid: firebaseUser.uid,
        };
        setAuth(newAuth);
        setIsLoggedIn(true);
        localStorage.setItem(AK, JSON.stringify(newAuth));
        localStorage.setItem(SK, '1');

        await syncUserData(firebaseUser.uid, false);
      }
    });

    return () => unsubscribe();
  }, [syncUserData]);

  // Listen for online status & app visibility to auto-resync
  useEffect(() => {
    const handleOnline = () => {
      if (auth?.uid) syncUserData(auth.uid, false);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && auth?.uid) {
        syncUserData(auth.uid, false);
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [auth?.uid, syncUserData]);

  // Login handler
  const handleLoginSuccess = async (newAuth: AuthState) => {
    localStorage.setItem(AK, JSON.stringify(newAuth));
    localStorage.setItem(SK, '1');
    setAuth(newAuth);
    setIsLoggedIn(true);

    if (newAuth.uid) {
      await syncUserData(newAuth.uid, false);
    } else {
      const userDb = loadDatabase(newAuth.username);
      setDb(userDb);
    }

    showToast(`Bem-vindo, ${newAuth.username}!`);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logoutFirebase();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    localStorage.removeItem(SK);
    setIsLoggedIn(false);
    setAuth(null);
    showToast('Sessão encerrada com segurança.');
  };

  // Change password
  const handleChangePassword = (): boolean => {
    return true;
  };

  // Navigation helper
  const handleNavigate = (page: PageId) => {
    if (page === 'new') setEditingJob(null);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Job Actions (Functional state updates to guarantee consecutive jobs never overwrite)
  const handleSaveJob = (job: Job) => {
    const finalJob: Job = {
      ...job,
      id: job.id || uid(),
    };

    let isUpdating = false;
    updateDb((prevDb) => {
      const existingIndex = prevDb.jobs.findIndex((j) => j.id === finalJob.id);
      let updatedJobs: Job[];
      if (existingIndex >= 0) {
        isUpdating = true;
        updatedJobs = [...prevDb.jobs];
        updatedJobs[existingIndex] = finalJob;
      } else {
        updatedJobs = [finalJob, ...prevDb.jobs];
      }
      return {
        ...prevDb,
        jobs: updatedJobs,
      };
    });

    showToast(isUpdating ? 'Trabalho atualizado com sucesso!' : 'Trabalho registrado com sucesso!');

    if (auth?.uid) {
      syncJobToFirestore(auth.uid, finalJob).catch(console.warn);
    }
    setEditingJob(null);
    setCurrentPage('jobs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickUpdateJob = (job: Job) => {
    updateDb((prevDb) => {
      const existingIndex = prevDb.jobs.findIndex((j) => j.id === job.id);
      if (existingIndex < 0) return prevDb;
      const updatedJobs = [...prevDb.jobs];
      updatedJobs[existingIndex] = job;
      return {
        ...prevDb,
        jobs: updatedJobs,
      };
    });
    if (auth?.uid) {
      syncJobToFirestore(auth.uid, job).catch(console.warn);
    }
    showToast(
      job.status === 'cancelled'
        ? 'Trabalho marcado como Cancelado.'
        : job.status === 'completed'
        ? 'Trabalho concluído com sucesso!'
        : 'Trabalho atualizado!'
    );
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setCurrentPage('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicateJob = (job: Job) => {
    const duplicated: Job = {
      ...job,
      id: uid(),
      date: today(),
      paid: 0,
      paydate: '',
      method: '',
      transportstatus: 'pending',
      transportDate: '',
      transportMethod: '',
      dueDate: '',
    };
    setEditingJob(duplicated);
    setCurrentPage('new');
    showToast('Confira os dados e salve como novo trabalho.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteJob = (id: string) => {
    const job = db.jobs.find((j) => j.id === id);
    if (!job) return;
    if (confirm(`Excluir o trabalho de "${job.profession}" em ${job.date}?`)) {
      updateDb((prevDb) => ({
        ...prevDb,
        jobs: prevDb.jobs.filter((j) => j.id !== id),
      }));
      if (auth?.uid) {
        deleteJobFromFirestore(auth.uid, id).catch(console.warn);
      }
      showToast('Registro de trabalho excluído.');
    }
  };

  // Client Actions
  const handleSaveClient = (client: Client) => {
    const finalClient: Client = {
      ...client,
      id: client.id || uid(),
    };
    let isUpdate = false;
    updateDb((prevDb) => {
      const existingIndex = prevDb.clients.findIndex((c) => c.id === finalClient.id);
      let updatedClients: Client[];
      if (existingIndex >= 0) {
        isUpdate = true;
        updatedClients = [...prevDb.clients];
        updatedClients[existingIndex] = finalClient;
      } else {
        updatedClients = [...prevDb.clients, finalClient];
      }
      return {
        ...prevDb,
        clients: updatedClients,
      };
    });
    showToast(isUpdate ? 'Cliente atualizado!' : 'Cliente cadastrado com sucesso!');
    if (auth?.uid) {
      syncClientToFirestore(auth.uid, finalClient).catch(console.warn);
    }
  };

  const handleDeleteClient = (id: string) => {
    updateDb((prevDb) => ({
      ...prevDb,
      clients: prevDb.clients.filter((c) => c.id !== id),
    }));
    if (auth?.uid) {
      deleteClientFromFirestore(auth.uid, id).catch(console.warn);
    }
    showToast('Cliente excluído.');
  };

  // Appointment Actions
  const handleSaveAppointment = (appt: Appointment) => {
    const finalAppt: Appointment = {
      ...appt,
      id: appt.id || uid(),
    };
    let isUpdate = false;
    updateDb((prevDb) => {
      const existingIndex = prevDb.appointments.findIndex((a) => a.id === finalAppt.id);
      let updatedAppts: Appointment[];
      if (existingIndex >= 0) {
        isUpdate = true;
        updatedAppts = [...prevDb.appointments];
        updatedAppts[existingIndex] = finalAppt;
      } else {
        updatedAppts = [...prevDb.appointments, finalAppt];
      }
      return {
        ...prevDb,
        appointments: updatedAppts,
      };
    });
    showToast(isUpdate ? 'Agendamento atualizado!' : 'Novo agendamento salvo!');
    if (auth?.uid) {
      syncAppointmentToFirestore(auth.uid, finalAppt).catch(console.warn);
    }
  };

  const handleDeleteAppointment = (id: string) => {
    updateDb((prevDb) => ({
      ...prevDb,
      appointments: prevDb.appointments.filter((a) => a.id !== id),
    }));
    if (auth?.uid) {
      deleteAppointmentFromFirestore(auth.uid, id).catch(console.warn);
    }
    showToast('Agendamento excluído.');
  };

  // Standalone Expense Actions
  const handleSaveExpense = (exp: ExpenseRecord) => {
    const finalExp: ExpenseRecord = {
      ...exp,
      id: exp.id || uid(),
    };
    let isUpdate = false;
    updateDb((prevDb) => {
      const list = prevDb.expenses || [];
      const existingIndex = list.findIndex((e) => e.id === finalExp.id);
      let updated: ExpenseRecord[];
      if (existingIndex >= 0) {
        isUpdate = true;
        updated = [...list];
        updated[existingIndex] = finalExp;
      } else {
        updated = [finalExp, ...list];
      }
      return {
        ...prevDb,
        expenses: updated,
      };
    });
    showToast(isUpdate ? 'Despesa atualizada!' : 'Despesa registrada!');
    if (auth?.uid) {
      syncExpenseToFirestore(auth.uid, finalExp).catch(console.warn);
    }
  };

  const handleDeleteExpense = (id: string) => {
    updateDb((prevDb) => ({
      ...prevDb,
      expenses: (prevDb.expenses || []).filter((e) => e.id !== id),
    }));
    if (auth?.uid) {
      deleteExpenseFromFirestore(auth.uid, id).catch(console.warn);
    }
    showToast('Despesa removida.');
  };

  // Standalone Revenue Actions
  const handleSaveRevenue = (rev: RevenueRecord) => {
    const finalRev: RevenueRecord = {
      ...rev,
      id: rev.id || uid(),
    };
    let isUpdate = false;
    updateDb((prevDb) => {
      const list = prevDb.revenues || [];
      const existingIndex = list.findIndex((r) => r.id === finalRev.id);
      let updated: RevenueRecord[];
      if (existingIndex >= 0) {
        isUpdate = true;
        updated = [...list];
        updated[existingIndex] = finalRev;
      } else {
        updated = [finalRev, ...list];
      }
      return {
        ...prevDb,
        revenues: updated,
      };
    });
    showToast(isUpdate ? 'Receita atualizada!' : 'Receita avulsa registrada!');
    if (auth?.uid) {
      syncRevenueToFirestore(auth.uid, finalRev).catch(console.warn);
    }
  };

  const handleDeleteRevenue = (id: string) => {
    updateDb((prevDb) => ({
      ...prevDb,
      revenues: (prevDb.revenues || []).filter((r) => r.id !== id),
    }));
    if (auth?.uid) {
      deleteRevenueFromFirestore(auth.uid, id).catch(console.warn);
    }
    showToast('Receita removida.');
  };

  const handleAddCustomCategory = (type: 'expense' | 'revenue', category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    if (type === 'expense') {
      const existing = db.prefs.customExpenseCategories || [];
      if (!existing.includes(trimmed)) {
        const nextPrefs = {
          ...db.prefs,
          customExpenseCategories: [...existing, trimmed],
        };
        handleSavePrefs(nextPrefs);
        showToast(`Categoria "${trimmed}" adicionada!`);
      }
    } else {
      const existing = db.prefs.customRevenueCategories || [];
      if (!existing.includes(trimmed)) {
        const nextPrefs = {
          ...db.prefs,
          customRevenueCategories: [...existing, trimmed],
        };
        handleSavePrefs(nextPrefs);
        showToast(`Categoria "${trimmed}" adicionada!`);
      }
    }
  };

  // Quote Actions
  const handleSaveQuote = (quote: Quote) => {
    const finalQuote: Quote = {
      ...quote,
      id: quote.id || uid(),
    };
    let isUpdate = false;
    updateDb((prevDb) => {
      const list = prevDb.quotes || [];
      const existingIndex = list.findIndex((q) => q.id === finalQuote.id);
      let updated: Quote[];
      if (existingIndex >= 0) {
        isUpdate = true;
        updated = [...list];
        updated[existingIndex] = finalQuote;
      } else {
        updated = [finalQuote, ...list];
      }
      return {
        ...prevDb,
        quotes: updated,
      };
    });
    showToast(isUpdate ? 'Orçamento atualizado!' : 'Orçamento salvo com sucesso!');
    if (auth?.uid) {
      syncQuoteToFirestore(auth.uid, finalQuote).catch(console.warn);
    }
  };

  const handleDeleteQuote = (id: string) => {
    updateDb((prevDb) => ({
      ...prevDb,
      quotes: (prevDb.quotes || []).filter((q) => q.id !== id),
    }));
    if (auth?.uid) {
      deleteQuoteFromFirestore(auth.uid, id).catch(console.warn);
    }
    showToast('Orçamento excluído.');
  };

  const handleConvertQuoteToJob = (quote: Quote) => {
    const subtotal = (quote.items || []).reduce(
      (s, it) => s + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
      0
    );
    const total = Math.max(0, subtotal - (Number(quote.discount) || 0));
    const client = db.clients.find((c) => c.id === quote.clientId);

    const newJob: Job = {
      id: uid(),
      date: today(),
      profession: quote.title || quote.items[0]?.name || 'Serviço Aprovado',
      place: client?.name || quote.clientName || 'Local do Cliente',
      task: quote.items
        .map((it) => `${it.quantity}x ${it.name}`)
        .filter(Boolean)
        .join(', '),
      clientId: quote.clientId || '',
      start: '08:00',
      end: '17:00',
      break: 60,
      ratetype: 'fixed',
      rate: 0,
      fixed: total,
      extraHours: 0,
      extraRate: 0,
      paid: 0,
      transport: 0,
      transportstatus: 'pending',
      transportDate: '',
      transportMethod: '',
      paydate: '',
      dueDate: '',
      method: '',
      expenses: 0,
      expenseNote: '',
      notes: quote.notes || `Convertido do orçamento "${quote.title}"`,
      status: 'scheduled',
    };

    const updatedQuote: Quote = {
      ...quote,
      status: 'approved',
      convertedJobId: newJob.id,
    };

    updateDb((prevDb) => ({
      ...prevDb,
      quotes: (prevDb.quotes || []).map((q) => (q.id === quote.id ? updatedQuote : q)),
      jobs: [newJob, ...prevDb.jobs],
    }));

    if (auth?.uid) {
      syncQuoteToFirestore(auth.uid, updatedQuote).catch(console.warn);
      syncJobToFirestore(auth.uid, newJob).catch(console.warn);
    }

    showToast('Orçamento convertido em trabalho com sucesso!');
    setEditingJob(newJob);
    setCurrentPage('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Service Catalog Actions
  const handleSaveCatalogItem = (item: ServiceCatalogItem) => {
    const finalItem: ServiceCatalogItem = {
      ...item,
      id: item.id || uid(),
    };
    let isUpdate = false;
    updateDb((prevDb) => {
      const list = prevDb.catalog || [];
      const existingIndex = list.findIndex((i) => i.id === finalItem.id);
      let updated: ServiceCatalogItem[];
      if (existingIndex >= 0) {
        isUpdate = true;
        updated = [...list];
        updated[existingIndex] = finalItem;
      } else {
        updated = [finalItem, ...list];
      }
      return {
        ...prevDb,
        catalog: updated,
      };
    });
    showToast(
      isUpdate ? 'Serviço do catálogo atualizado!' : 'Serviço adicionado ao catálogo!'
    );
    if (auth?.uid) {
      syncCatalogItemToFirestore(auth.uid, finalItem).catch(console.warn);
    }
  };

  const handleDeleteCatalogItem = (id: string) => {
    updateDb((prevDb) => ({
      ...prevDb,
      catalog: (prevDb.catalog || []).filter((i) => i.id !== id),
    }));
    if (auth?.uid) {
      deleteCatalogItemFromFirestore(auth.uid, id).catch(console.warn);
    }
    showToast('Serviço removido do catálogo.');
  };

  // Prefs Actions
  const handleSavePrefs = (newPrefs: Prefs) => {
    if (!newPrefs.photo) {
      clearUserPhotoCache(auth?.uid || auth?.username);
    }
    const computedProfessionalId = formatProfessionalId(newPrefs);
    const finalPrefs: Prefs = {
      ...newPrefs,
      professionalId: computedProfessionalId,
    };
    updateDb((prevDb) => ({
      ...prevDb,
      prefs: finalPrefs,
    }));
    if (auth?.uid) {
      syncPrefsToFirestore(auth.uid, finalPrefs).catch(console.warn);
    }
  };

  const handleUpdatePhoto = (photoBase64: string) => {
    updateDb((prevDb) => {
      const newPrefs = {
        ...prevDb.prefs,
        photo: photoBase64,
      };
      if (auth?.uid) {
        syncPrefsToFirestore(auth.uid, newPrefs).catch(console.warn);
      }
      return {
        ...prevDb,
        prefs: newPrefs,
      };
    });
    showToast('Foto de perfil atualizada!');
  };

  const handleDeletePhoto = () => {
    clearUserPhotoCache(auth?.uid || auth?.username);
    updateDb((prevDb) => {
      const newPrefs = {
        ...prevDb.prefs,
        photo: '',
      };
      if (auth?.uid) {
        syncPrefsToFirestore(auth.uid, newPrefs).catch(console.warn);
      }
      return {
        ...prevDb,
        prefs: newPrefs,
      };
    });
    showToast('Foto de perfil removida.');
  };

  // Manual cloud synchronization
  const handleManualCloudSync = async () => {
    if (!auth?.uid) {
      showToast('Entre com sua conta para sincronizar na nuvem.');
      return;
    }
    try {
      await syncFullDatabaseToFirestore(auth.uid, db);
      showToast('Sincronizado com o Cloud Firestore com sucesso!');
    } catch {
      showToast('Erro ao sincronizar. Verifique a conexão.');
    }
  };

  // Restore & Clear
  const handleRestoreBackup = (newDb: Database) => {
    updateDb(newDb);
    if (newDb.prefs?.theme) {
      setThemePreference(newDb.prefs.theme);
    }
    if (auth?.uid) {
      syncFullDatabaseToFirestore(auth.uid, newDb).catch(console.warn);
    }
    setCurrentPage('home');
  };

  const handleClearAllData = () => {
    updateDb((prevDb) => ({
      jobs: [],
      clients: [],
      appointments: [],
      expenses: [],
      revenues: [],
      quotes: [],
      catalog: [],
      prefs: prevDb.prefs,
    }));
    showToast('Os registros locais foram limpos.');
    setCurrentPage('home');
  };

  const distinctProfessions = useMemo(() => {
    const fromJobs = db.jobs.map((j) => j.profession).filter(Boolean);
    const fromCatalog = (db.catalog || []).map((c) => c.name).filter(Boolean);
    return Array.from(new Set([...fromJobs, ...fromCatalog])).sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
  }, [db.jobs, db.catalog]);

  // Compute unread notifications count
  const unreadNotificationsCount = useMemo(() => {
    if (db.prefs.notificationsEnabled === false) return 0;
    const all = computeAppNotifications(db);
    const readIds = new Set(db.prefs.readNotificationIds || []);
    return all.filter((n) => !readIds.has(n.id)).length;
  }, [db]);

  const displayName =
    db.prefs.displayName || db.prefs.name || auth?.username || 'Meu perfil';
  const professionalId = formatProfessionalId(db.prefs);

  // Animated Splash Screen during app boot (1.8s)
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // If user is not authenticated or needs initial setup
  if (!isLoggedIn) {
    return (
      <LoginPage
        existingAuth={auth}
        onLoginSuccess={handleLoginSuccess}
        theme={themePreference}
        onThemeChange={handleThemeChange}
        isDark={isDark}
        systemIsDark={systemIsDark}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--ink)] flex transition-colors selection:bg-[var(--sage)]">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        unreadNotificationsCount={unreadNotificationsCount}
        displayName={displayName}
        professionalId={professionalId}
        photo={db.prefs.photo}
        onLogout={handleLogout}
      />

      {/* Right Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          displayName={displayName}
          photo={db.prefs.photo}
          professionalId={professionalId}
          profession={db.prefs.profession}
          theme={themePreference}
          onThemeChange={handleThemeChange}
          isDark={isDark}
          systemIsDark={systemIsDark}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onNavigate={handleNavigate}
          unreadNotificationsCount={unreadNotificationsCount}
          onLogout={handleLogout}
        />

        {/* Offline / Cached Data Notification Banner */}
        {(syncStatus === 'cached' || syncStatus === 'offline') && (
          <div className="bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs px-4 py-2 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <CloudOff className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate text-[11px] sm:text-xs">
                {syncStatus === 'offline'
                  ? 'Modo Offline: exibindo dados salvos no aparelho.'
                  : 'Exibindo dados locais do aparelho. Sincronização em segundo plano.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => auth?.uid && syncUserData(auth.uid, true)}
              disabled={isSyncing}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Tentar Sincronizar</span>
            </button>
          </div>
        )}

        {/* Main Content Viewport with Safe Area Clearance for Mobile Bottom Bar */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-main-safe">
          {currentPage === 'home' && (
            <HomePage
              db={db}
              onNavigate={handleNavigate}
              onEditJob={handleEditJob}
              onDuplicateJob={handleDuplicateJob}
              onDeleteJob={handleDeleteJob}
              onQuickUpdateJob={handleQuickUpdateJob}
              onViewReceipt={(j: Job) => setSelectedReceiptJob(j)}
              onOpenReceived={() => {
                setFinanceTab('received');
                handleNavigate('finance');
              }}
              onOpenPending={() => {
                setFinanceTab('pending');
                handleNavigate('finance');
              }}
              onOpenExpenses={() => {
                setFinanceTab('expenses');
                handleNavigate('finance');
              }}
              onOpenHours={() => setIsHoursModalOpen(true)}
              onOpenJobs={() => {
                setJobsSituation('all');
                handleNavigate('jobs');
              }}
              onOpenJobsFiltered={(sit) => {
                if (sit === 'in_progress') setJobsSituation('in_progress');
                else if (sit === 'completed') setJobsSituation('completed');
                else if (sit === 'scheduled') setJobsSituation('future');
                else setJobsSituation('all');
                handleNavigate('jobs');
              }}
              onQuickNewJob={() => {
                setEditingJob(null);
                handleNavigate('new');
              }}
              onQuickNewClient={() => {
                setOpenNewClientOnLoad(true);
                handleNavigate('clients');
              }}
              onQuickNewRevenue={() => {
                setFinanceTab('received');
                setFinanceOpenForm('revenue');
                handleNavigate('finance');
              }}
              onQuickNewExpense={() => {
                setFinanceTab('expenses');
                setFinanceOpenForm('expense');
                handleNavigate('finance');
              }}
              onQuickNewQuote={() => {
                setOpenNewQuoteOnLoad(true);
                handleNavigate('quotes');
              }}
              onQuickNewAppointment={() => {
                setOpenNewApptOnLoad(true);
                handleNavigate('calendar');
              }}
            />
          )}

          {currentPage === 'new' && (
            <JobFormPage
              initialJob={editingJob}
              clients={db.clients}
              catalog={db.catalog || []}
              distinctProfessions={distinctProfessions}
              onSaveJob={handleSaveJob}
              onCancel={() => {
                setEditingJob(null);
                handleNavigate('jobs');
              }}
            />
          )}

          {currentPage === 'jobs' && (
            <JobsListPage
              jobs={db.jobs}
              clients={db.clients}
              initialSituation={jobsSituation}
              onNavigate={handleNavigate}
              onNavigateHome={() => handleNavigate('home')}
              onEditJob={handleEditJob}
              onDuplicateJob={handleDuplicateJob}
              onDeleteJob={handleDeleteJob}
              onViewReceipt={(j: Job) => setSelectedReceiptJob(j)}
            />
          )}

          {currentPage === 'calendar' && (
            <CalendarPage
              jobs={db.jobs}
              appointments={db.appointments}
              clients={db.clients}
              initialOpenNew={openNewApptOnLoad}
              onConsumeOpenNew={() => setOpenNewApptOnLoad(false)}
              onSaveAppointment={handleSaveAppointment}
              onDeleteAppointment={handleDeleteAppointment}
              onEditJob={handleEditJob}
            />
          )}

          {currentPage === 'clients' && (
            <ClientsPage
              clients={db.clients}
              jobs={db.jobs}
              quotes={db.quotes || []}
              initialOpenNew={openNewClientOnLoad}
              onConsumeOpenNew={() => setOpenNewClientOnLoad(false)}
              onSaveClient={handleSaveClient}
              onDeleteClient={handleDeleteClient}
              onShowToast={showToast}
            />
          )}

          {currentPage === 'finance' && (
            <FinancePage
              jobs={db.jobs}
              clients={db.clients}
              expenses={db.expenses || []}
              revenues={db.revenues || []}
              customExpenseCategories={db.prefs.customExpenseCategories || []}
              customRevenueCategories={db.prefs.customRevenueCategories || []}
              userName={displayName}
              initialTab={financeTab}
              initialOpenForm={financeOpenForm}
              onConsumeOpenForm={() => setFinanceOpenForm(null)}
              onNavigateHome={() => handleNavigate('home')}
              onOpenReportPrint={(month: string) => setReportMonthToPrint(month)}
              onEditJob={handleEditJob}
              onViewReceipt={(j: Job) => setSelectedReceiptJob(j)}
              onSaveExpense={handleSaveExpense}
              onDeleteExpense={handleDeleteExpense}
              onSaveRevenue={handleSaveRevenue}
              onDeleteRevenue={handleDeleteRevenue}
              onAddCustomCategory={handleAddCustomCategory}
            />
          )}

          {currentPage === 'business' && (
            <BusinessPage
              db={db}
              onSavePrefs={handleSavePrefs}
              onShowToast={showToast}
            />
          )}

          {currentPage === 'quotes' && (
            <QuotesPage
              quotes={db.quotes || []}
              clients={db.clients}
              catalog={db.catalog || []}
              prefs={db.prefs}
              initialOpenNew={openNewQuoteOnLoad}
              onConsumeOpenNew={() => setOpenNewQuoteOnLoad(false)}
              onSaveQuote={handleSaveQuote}
              onDeleteQuote={handleDeleteQuote}
              onConvertQuoteToJob={handleConvertQuoteToJob}
            />
          )}

          {currentPage === 'receipts' && (
            <ReceiptsPage
              jobs={db.jobs}
              clients={db.clients}
              onViewReceipt={(j: Job) => setSelectedReceiptJob(j)}
            />
          )}

          {currentPage === 'catalog' && (
            <CatalogPage
              catalog={db.catalog || []}
              onSaveCatalogItem={handleSaveCatalogItem}
              onDeleteCatalogItem={handleDeleteCatalogItem}
            />
          )}

          {currentPage === 'reports' && (
            <ReportsPage
              jobs={db.jobs}
              clients={db.clients}
              expenses={db.expenses || []}
              revenues={db.revenues || []}
              onOpenReportPrint={(month) => setReportMonthToPrint(month)}
            />
          )}

          {currentPage === 'notifications' && (
            <NotificationsPage
              db={db}
              onNavigate={handleNavigate}
              onSavePrefs={handleSavePrefs}
            />
          )}

          {currentPage === 'profile' && (
            <ProfilePage
              prefs={db.prefs}
              userEmail={auth?.email}
              onSavePrefs={handleSavePrefs}
              onShowToast={showToast}
            />
          )}

          {currentPage === 'settings' && (
            <SettingsPage
              db={db}
              username={auth?.username || 'Usuário'}
              userEmail={auth?.email}
              themePreference={themePreference}
              onThemeChange={handleThemeChange}
              isDark={isDark}
              systemIsDark={systemIsDark}
              onSavePrefs={handleSavePrefs}
              onChangePassword={handleChangePassword}
              onRestoreBackup={handleRestoreBackup}
              onClearAllData={handleClearAllData}
              onShowToast={showToast}
              onManualSync={handleManualCloudSync}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation + Full Menu Drawer */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Hours Detail Modal */}
      {isHoursModalOpen && (
        <HoursDetailModal
          jobs={db.jobs}
          clients={db.clients}
          onClose={() => setIsHoursModalOpen(false)}
          onEditJob={handleEditJob}
          onViewReceipt={(j) => setSelectedReceiptJob(j)}
        />
      )}

      {/* Receipt Modal */}
      {selectedReceiptJob && (
        <ReceiptModal
          job={selectedReceiptJob}
          client={db.clients.find((c) => c.id === selectedReceiptJob.clientId)}
          onClose={() => setSelectedReceiptJob(null)}
          userName={displayName}
          crf={professionalId}
        />
      )}

      {/* Monthly Report Print Modal */}
      {reportMonthToPrint && (
        <ReportPrintModal
          monthStr={reportMonthToPrint}
          jobs={db.jobs}
          clients={db.clients}
          userName={displayName}
          crf={professionalId}
          professionalId={professionalId}
          onClose={() => setReportMonthToPrint(null)}
        />
      )}

      {/* Profile / Avatar Modal */}
      {isProfileModalOpen && (
        <ProfileModal
          displayName={displayName}
          professionalId={professionalId}
          photo={db.prefs.photo}
          onUpdatePhoto={handleUpdatePhoto}
          onDeletePhoto={handleDeletePhoto}
          onOpenFullProfile={() => handleNavigate('profile')}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[var(--ink)] text-[var(--paper)] text-xs font-semibold shadow-xl border border-[var(--line)] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
