/**
 * Data structures and types for FREELAS — Autônomos & Freelancers
 * Strictly backward-compatible with all existing Firestore & LocalStorage records.
 */

export type ThemePreference = 'auto' | 'light' | 'dark';

export type JobStatus =
  | 'quote'
  | 'waiting_approval'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'pending';

export type JobWorkflowStatus = JobStatus;

export interface Job {
  id: string;
  date: string; // YYYY-MM-DD (Data agendada / realização)
  createdAt?: string; // YYYY-MM-DD
  completedAt?: string; // YYYY-MM-DD
  profession: string; // Nome do serviço / profissão
  place: string; // Local / Empresa
  task: string; // Descrição da atividade
  clientId: string;
  start: string; // HH:mm
  end: string; // HH:mm
  break: number; // minutes
  ratetype: 'hourly' | 'fixed';
  rate: number;
  fixed: number;
  extraHours: number;
  extraRate: number;
  paid: number;
  transport: number;
  transportstatus: 'pending' | 'paid';
  transportDate: string;
  transportMethod: string;
  paydate: string;
  dueDate: string;
  method: string;
  expenses: number;
  expenseNote: string;
  materials?: string;
  materialsCost?: number;
  address?: string;
  notes: string;
  status?: JobStatus;
  serviceCatalogId?: string;
  quoteId?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  document?: string; // CPF ou CNPJ
  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
  reference?: string;
  address: string; // Endereço completo consolidado (mantido para compatibilidade total)
  notes: string;
  createdAt?: string;
}

export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime?: string; // HH:mm
  durationMinutes?: number;
  clientId?: string;
  jobId?: string;
  title?: string;
  place: string;
  address?: string;
  task: string;
  value: number;
  reminder: 'none' | 'day' | 'week';
  status?: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
}

export interface ExpenseRecord {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  status: 'paid' | 'pending' | 'planned';
  jobId?: string;
  clientId?: string;
  receiptNote?: string;
  notes?: string;
  createdAt?: string;
}

export interface RevenueRecord {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  method?: string;
  status: 'received' | 'pending';
  clientId?: string;
  jobId?: string;
  notes?: string;
  createdAt?: string;
}

export interface QuoteItem {
  id: string;
  serviceId?: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface Quote {
  id: string;
  number?: string;
  title: string;
  clientId: string;
  clientName: string;
  date?: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  items: QuoteItem[];
  discount: number;
  paymentTerms: string;
  notes: string;
  status: QuoteStatus;
  convertedJobId?: string;
  createdAt: string;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string;
  suggestedPrice: number;
  priceType: 'fixed' | 'hourly';
  estimatedDuration?: string;
  estimatedDurationMinutes?: number;
  category: string;
  materials: string;
  notes: string;
  createdAt?: string;
}

export type ActivityType = 'autonomo' | 'registro';

export interface Prefs {
  goal: number;
  goalMonth: string; // YYYY-MM
  annualGoal?: number;
  annualGoalYear?: string;
  displayName: string;
  name?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  activityType?: ActivityType; // 'autonomo' | 'registro'
  profession?: string;
  specialties?: string;
  bio?: string;
  companyName?: string;
  cnpj?: string;
  document?: string;
  pixKey?: string;
  businessAddress?: string;
  address?: string;
  city?: string;
  state?: string;
  crf: string; // legacy field for backward compatibility
  councilType?: string;
  councilOther?: string;
  councilNumber?: string;
  councilUf?: string;
  professionalId?: string;
  theme: ThemePreference;
  photo: string; // Base64 data URL
  notificationsEnabled?: boolean;
  notifyAppointments?: boolean;
  notifyOverdue?: boolean;
  notifyQuotes?: boolean;
  notifyGoals?: boolean;
  readNotificationIds?: string[];
  customExpenseCategories?: string[];
  customRevenueCategories?: string[];
}

export interface Database {
  jobs: Job[];
  clients: Client[];
  appointments: Appointment[];
  expenses?: ExpenseRecord[];
  revenues?: RevenueRecord[];
  quotes?: Quote[];
  catalog?: ServiceCatalogItem[];
  prefs: Prefs;
}

export interface AuthState {
  username: string;
  email?: string;
  password?: string;
  uid?: string;
}

export type PageId =
  | 'home'
  | 'clients'
  | 'jobs'
  | 'new'
  | 'calendar'
  | 'finance'
  | 'business'
  | 'quotes'
  | 'receipts'
  | 'catalog'
  | 'reports'
  | 'notifications'
  | 'profile'
  | 'settings';
