import {
  Database,
  Job,
  Client,
  Appointment,
  ExpenseRecord,
  RevenueRecord,
  Quote,
  ServiceCatalogItem,
  ThemePreference,
} from './types';

export const DK = 'calculos_data_v2';
export const OLD = 'calculos_data_v1';
export const AK = 'calculos_auth_v1';
export const SK = 'calculos_session_v1';

export function today(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function currentMonth(): string {
  return today().slice(0, 7);
}

export function currentYear(): string {
  return today().slice(0, 4);
}

export function money(n: number | string | undefined | null): string {
  const num = typeof n === 'number' ? n : Number(n) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

export function dateLabel(s?: string): string {
  if (!s) return '—';
  const parts = s.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0])) return s;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

export function hlabel(h: number | string | undefined): string {
  const totalMin = Math.round((Number(h) || 0) * 60);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}min`;
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return String(Date.now()) + Math.random().toString(16).slice(2);
}

export function calculateHours(j: Pick<Job, 'start' | 'end' | 'break'> & { status?: string }): number {
  if (j.status === 'cancelled') return 0;
  if (!j.start || !j.end) return 0;
  const [a, b] = j.start.split(':').map(Number);
  const [c, d] = j.end.split(':').map(Number);
  if (isNaN(a) || isNaN(b) || isNaN(c) || isNaN(d)) return 0;
  let m = c * 60 + d - (a * 60 + b);
  if (m < 0) m += 1440; // Shift crossed midnight (e.g. 22:00 to 06:00)
  return Math.max(0, m - (Number(j.break) || 0)) / 60;
}

export function calculateTotal(j: Job): number {
  if (j.status === 'cancelled') {
    return Math.max(0, Number(j.paid) || 0);
  }
  const base =
    j.ratetype === 'fixed'
      ? Math.max(0, Number(j.fixed) || 0)
      : calculateHours(j) * Math.max(0, Number(j.rate) || 0);
  const extras = Math.max(0, Number(j.extraHours) || 0) * Math.max(0, Number(j.extraRate) || 0);
  return base + extras;
}

export function calculatePaid(j: Job): number {
  return Math.min(calculateTotal(j), Math.max(0, Number(j.paid) || 0));
}

export function calculateDue(j: Job): number {
  if (j.status === 'cancelled') return 0;
  return Math.max(0, calculateTotal(j) - calculatePaid(j));
}

export function getServiceStatus(j: Job): 'paid' | 'partial' | 'pending' | 'cancelled' {
  if (j.status === 'cancelled') return 'cancelled';
  const totalVal = calculateTotal(j);
  const dueVal = calculateDue(j);
  if (dueVal < 0.01 && totalVal > 0) return 'paid';
  if (calculatePaid(j) > 0) return 'partial';
  return 'pending';
}

export function calculateReceived(j: Job): number {
  const transportPaid = j.transportstatus === 'paid' ? Number(j.transport) || 0 : 0;
  return calculatePaid(j) + transportPaid;
}

export function calculateDueAll(j: Job): number {
  if (j.status === 'cancelled') return 0;
  const transportDue = j.transportstatus === 'paid' ? 0 : Number(j.transport) || 0;
  return calculateDue(j) + transportDue;
}

/**
 * Calculates received payments for a specific month (YYYY-MM),
 * strictly respecting payment date (paydate / transportDate), partial amounts,
 * and excluding cancelled non-paid jobs.
 */
export function calculatePaymentForMonth(
  j: Job,
  monthStr: string
): { servicePaid: number; transportPaid: number; totalReceived: number } {
  if (j.status === 'cancelled' && (Number(j.paid) || 0) <= 0 && j.transportstatus !== 'paid') {
    return { servicePaid: 0, transportPaid: 0, totalReceived: 0 };
  }

  let servicePaid = 0;
  const actualPaid = calculatePaid(j);
  if (actualPaid > 0) {
    const sDate = j.paydate || j.date;
    if (sDate.startsWith(monthStr)) {
      servicePaid = actualPaid;
    }
  }

  let transportPaid = 0;
  if (j.transportstatus === 'paid' && (Number(j.transport) || 0) > 0) {
    const tDate = j.transportDate || j.paydate || j.date;
    if (tDate.startsWith(monthStr)) {
      transportPaid = Number(j.transport) || 0;
    }
  }

  return {
    servicePaid,
    transportPaid,
    totalReceived: servicePaid + transportPaid,
  };
}

export function calculateMonthReceivedTotal(jobs: Job[], monthStr: string): number {
  return jobs.reduce((sum, j) => sum + calculatePaymentForMonth(j, monthStr).totalReceived, 0);
}

export function addDays(s: string, n: number): string {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Formats a client's full address from structured or legacy address fields.
 */
export function formatClientFullAddress(c?: Partial<Client> | null): string {
  if (!c) return '';
  const parts: string[] = [];
  if (c.street) {
    let line1 = c.street.trim();
    if (c.number) line1 += `, ${c.number.trim()}`;
    if (c.complement) line1 += ` (${c.complement.trim()})`;
    parts.push(line1);
  }
  if (c.neighborhood) parts.push(c.neighborhood.trim());
  if (c.city || c.state) {
    const cityState = [c.city?.trim(), c.state?.trim()].filter(Boolean).join(' - ');
    if (cityState) parts.push(cityState);
  }
  if (c.cep) parts.push(`CEP ${c.cep.trim()}`);

  const structured = parts.join(', ');
  if (structured) return structured;
  return (c.address || '').trim();
}

/**
 * Builds an official, cross-platform Google Maps search URL.
 */
export function buildGoogleMapsSearchUrl(input?: string | Partial<Client> | null): string {
  if (!input) return '';
  const address = typeof input === 'string' ? input : formatClientFullAddress(input);
  const clean = (address || '').trim();
  if (!clean) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
}

/**
 * Builds an official WhatsApp click-to-chat URL with normalized Brazilian or international phone numbers.
 */
export function buildWhatsAppUrl(phoneRaw?: string, message?: string): string {
  const digits = (phoneRaw || '').replace(/\D/g, '');
  if (!digits) return '';
  const fullNumber = digits.length >= 10 && digits.length <= 11 && !digits.startsWith('55')
    ? `55${digits}`
    : digits;
  const base = `https://wa.me/${fullNumber}`;
  if (message && message.trim()) {
    return `${base}?text=${encodeURIComponent(message.trim())}`;
  }
  return base;
}

/**
 * Builds a clean tel: link for mobile/desktop dialers.
 */
export function buildTelUrl(phoneRaw?: string): string {
  const digits = (phoneRaw || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  return `tel:${digits}`;
}

/**
 * Checks if a candidate appointment overlaps with any existing active appointments on the same date.
 */
export function checkAppointmentConflict(
  appointments: Appointment[],
  candidate: { id?: string; date: string; time: string; durationMinutes?: number },
): Appointment | null {
  if (!candidate.date || !candidate.time) return null;
  const [ch, cm] = candidate.time.split(':').map(Number);
  if (isNaN(ch) || isNaN(cm)) return null;
  const startMin = ch * 60 + cm;
  const dur = Number(candidate.durationMinutes) || 60;
  const endMin = startMin + dur;

  for (const appt of appointments) {
    if (appt.id === candidate.id) continue;
    if (appt.status === 'cancelled') continue;
    if (appt.date !== candidate.date || !appt.time) continue;
    const [ah, am] = appt.time.split(':').map(Number);
    if (isNaN(ah) || isNaN(am)) continue;
    const aStart = ah * 60 + am;
    const aDur = Number(appt.durationMinutes) || 60;
    const aEnd = aStart + aDur;

    if (startMin < aEnd && endMin > aStart) {
      return appt;
    }
  }
  return null;
}

export const BRAZIL_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export interface CouncilItem {
  value: string;
  label: string;
  profession: string;
}

export const OFFICIAL_COUNCILS: CouncilItem[] = [
  { value: 'CRF', label: 'CRF — Conselho Regional de Farmácia', profession: 'Farmacêutico' },
  { value: 'CRM', label: 'CRM — Conselho Regional de Medicina', profession: 'Médico' },
  { value: 'CRO', label: 'CRO — Conselho Regional de Odontologia', profession: 'Dentista' },
  { value: 'CRP', label: 'CRP — Conselho Regional de Psicologia', profession: 'Psicólogo' },
  { value: 'CREA', label: 'CREA — Engenharia e Agronomia', profession: 'Engenheiro' },
  { value: 'CAU', label: 'CAU — Arquitetura e Urbanismo', profession: 'Arquiteto e Urbanista' },
  { value: 'OAB', label: 'OAB — Ordem dos Advogados do Brasil', profession: 'Advogado' },
  { value: 'CREFITO', label: 'CREFITO — Fisioterapia e Terapia Ocupacional', profession: 'Fisioterapeuta' },
  { value: 'CREF', label: 'CREF — Conselho Regional de Educação Física', profession: 'Profissional de Educação Física' },
  { value: 'CORE', label: 'CORE — Conselho Regional dos Representantes Comerciais', profession: 'Representante Comercial' },
  { value: 'Outros', label: 'Outros — Outro Conselho / Órgão Profissional', profession: '' },
];

export const AUTONOMOUS_PROFESSION_EXAMPLES = [
  'Eletricista',
  'Encanador',
  'Pedreiro',
  'Pintor',
  'Diarista',
  'Motorista',
  'Designer',
  'Desenvolvedor',
  'Fotógrafo',
  'Cabeleireiro',
  'Manicure',
  'Consultor',
  'Mecânico',
  'Marceneiro',
  'Jardineiro',
];

export const COUNCIL_OPTIONS = [
  { value: 'none', label: 'Não possuo conselho profissional' },
  { value: 'CRF', label: 'CRF — Farmácia' },
  { value: 'CRM', label: 'CRM — Medicina' },
  { value: 'CRO', label: 'CRO — Odontologia' },
  { value: 'CRP', label: 'CRP — Psicologia' },
  { value: 'CREA', label: 'CREA — Engenharia e Agronomia' },
  { value: 'CAU', label: 'CAU — Arquitetura e Urbanismo' },
  { value: 'OAB', label: 'OAB — Advocacia' },
  { value: 'CREFITO', label: 'CREFITO — Fisioterapia e T.O.' },
  { value: 'CREF', label: 'CREF — Educação Física' },
  { value: 'CORE', label: 'CORE — Representação Comercial' },
  { value: 'Outros', label: 'Outros (digitar sigla)' },
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Transporte & Combustível',
  'Alimentação',
  'Materiais & Insumos',
  'Equipamentos & Ferramentas',
  'Impostos & Taxas (MEI/ISS)',
  'Software & Assinaturas',
  'Marketing & Divulgação',
  'Educação & Cursos',
  'Outros',
];

export const DEFAULT_REVENUE_CATEGORIES = [
  'Prestação de Serviço',
  'Plantão / Diária',
  'Consultoria',
  'Projeto Fechado',
  'Reembolso de Despesas',
  'Outros',
];

export function formatProfessionalId(prefs?: Partial<Database['prefs']>): string {
  if (!prefs) return '';

  const isAutonomo =
    prefs.activityType === 'autonomo' ||
    (!prefs.activityType && (prefs.councilType === 'none' || !prefs.councilType) && !prefs.crf && !prefs.councilNumber);

  if (isAutonomo) {
    return '';
  }

  // Registration mode: preserve manual number verbatim (ex.: "CRF/SP 122577")
  const num = (prefs.councilNumber || '').trim();
  if (num) {
    return num;
  }

  if (prefs.crf && prefs.crf.trim()) {
    return prefs.crf.trim();
  }

  const council = (prefs.councilType || '').trim();
  if (council && council !== 'none' && council !== 'Outros' && council !== 'outro') {
    return council;
  }

  if (prefs.councilOther && prefs.councilOther.trim()) {
    return prefs.councilOther.trim().toUpperCase();
  }

  return '';
}

export function getDefaultDatabase(): Database {
  return {
    jobs: [],
    clients: [],
    appointments: [],
    expenses: [],
    revenues: [],
    quotes: [],
    catalog: [],
    prefs: {
      goal: 0,
      goalMonth: currentMonth(),
      annualGoal: 0,
      displayName: '',
      phone: '',
      email: '',
      activityType: 'autonomo',
      profession: '',
      bio: '',
      companyName: '',
      cnpj: '',
      pixKey: '',
      businessAddress: '',
      city: '',
      state: '',
      crf: '',
      councilType: 'none',
      councilOther: '',
      councilNumber: '',
      councilUf: '',
      professionalId: '',
      theme: 'auto',
      photo: '',
      notificationsEnabled: true,
      notifyAppointments: true,
      notifyOverdue: true,
      notifyQuotes: true,
      notifyGoals: true,
      readNotificationIds: [],
      customExpenseCategories: [],
      customRevenueCategories: [],
    },
  };
}

export function getUserStorageKey(username?: string): string {
  if (!username) return DK;
  return `${DK}_${username.trim().toLowerCase()}`;
}

export function getUserPhotoKey(username?: string): string {
  if (!username) return `${DK}_photo`;
  return `${DK}_photo_${username.trim().toLowerCase()}`;
}

export function clearUserPhotoCache(username?: string): void {
  try {
    localStorage.removeItem(getUserPhotoKey(username));
    localStorage.removeItem(`${DK}_photo`);
  } catch {}
}

export function loadDatabase(username?: string): Database {
  try {
    const userKey = getUserStorageKey(username);
    let raw = localStorage.getItem(userKey);

    if (!raw) {
      const akRaw = localStorage.getItem(AK);
      if (akRaw) {
        try {
          const auth = JSON.parse(akRaw);
          if (!username || (auth.username && auth.username.toLowerCase() === username.toLowerCase())) {
            raw = localStorage.getItem(DK);
          }
        } catch {}
      } else if (!username) {
        raw = localStorage.getItem(DK);
      }
    }

    let parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) {
      const oldRaw = localStorage.getItem(OLD);
      if (oldRaw) {
        parsed = JSON.parse(oldRaw);
      }
    }

    const cachedPhoto =
      localStorage.getItem(getUserPhotoKey(username)) ||
      localStorage.getItem(`${DK}_photo`) ||
      '';

    if (!parsed) {
      const def = getDefaultDatabase();
      if (cachedPhoto) {
        def.prefs.photo = cachedPhoto;
      }
      return def;
    }

    const jobs: Job[] = Array.isArray(parsed.jobs)
      ? parsed.jobs.map((j: Partial<Job>) => ({
          id: j.id || uid(),
          date: j.date || today(),
          createdAt: j.createdAt || j.date || today(),
          completedAt: j.completedAt || '',
          profession: j.profession || '',
          place: j.place || '',
          task: j.task || '',
          clientId: j.clientId || '',
          start: j.start || '08:00',
          end: j.end || '17:00',
          break: Number(j.break ?? 60),
          ratetype: j.ratetype === 'fixed' ? 'fixed' : 'hourly',
          rate: Number(j.rate || 0),
          fixed: Number(j.fixed || 0),
          extraHours: Number(j.extraHours || 0),
          extraRate: Number(j.extraRate || 0),
          paid: Number(j.paid || 0),
          transport: Number(j.transport || 0),
          transportstatus: j.transportstatus === 'paid' ? 'paid' : 'pending',
          transportDate: j.transportDate || '',
          transportMethod: j.transportMethod || '',
          paydate: j.paydate || '',
          dueDate: j.dueDate || '',
          method: j.method || '',
          expenses: Number(j.expenses || 0),
          expenseNote: j.expenseNote || '',
          materials: j.materials || '',
          address: j.address || '',
          notes: j.notes || '',
          status: j.status,
          serviceCatalogId: j.serviceCatalogId || '',
          quoteId: j.quoteId || '',
        }))
      : [];

    const clients: Client[] = Array.isArray(parsed.clients)
      ? parsed.clients.map((c: Partial<Client>) => ({
          id: c.id || uid(),
          name: c.name || '',
          phone: c.phone || '',
          whatsapp: c.whatsapp || c.phone || '',
          email: c.email || '',
          document: c.document || '',
          cep: c.cep || '',
          state: c.state || '',
          city: c.city || '',
          neighborhood: c.neighborhood || '',
          street: c.street || '',
          number: c.number || '',
          complement: c.complement || '',
          reference: c.reference || '',
          address: c.address || formatClientFullAddress(c),
          notes: c.notes || '',
          createdAt: c.createdAt || today(),
        }))
      : [];

    const appointments: Appointment[] = Array.isArray(parsed.appointments)
      ? parsed.appointments
      : [];

    const expenses: ExpenseRecord[] = Array.isArray(parsed.expenses)
      ? parsed.expenses
      : [];

    const revenues: RevenueRecord[] = Array.isArray(parsed.revenues)
      ? parsed.revenues
      : [];

    const quotes: Quote[] = Array.isArray(parsed.quotes)
      ? parsed.quotes
      : [];

    const catalog: ServiceCatalogItem[] = Array.isArray(parsed.catalog)
      ? parsed.catalog
      : [];

    return {
      jobs,
      clients,
      appointments,
      expenses,
      revenues,
      quotes,
      catalog,
      prefs: {
        goal: Number(parsed.prefs?.goal || 0),
        goalMonth: parsed.prefs?.goalMonth || currentMonth(),
        annualGoal: Number(parsed.prefs?.annualGoal || 0),
        displayName: parsed.prefs?.displayName || parsed.prefs?.name || '',
        name: parsed.prefs?.name || parsed.prefs?.displayName || '',
        phone: parsed.prefs?.phone || '',
        whatsapp: parsed.prefs?.whatsapp || '',
        email: parsed.prefs?.email || '',
        document: parsed.prefs?.document || '',
        address: parsed.prefs?.address || '',
        specialties: parsed.prefs?.specialties || '',
        profession: parsed.prefs?.profession || '',
        bio: parsed.prefs?.bio || '',
        companyName: parsed.prefs?.companyName || '',
        cnpj: parsed.prefs?.cnpj || '',
        pixKey: parsed.prefs?.pixKey || '',
        businessAddress: parsed.prefs?.businessAddress || '',
        city: parsed.prefs?.city || '',
        state: parsed.prefs?.state || '',
        crf: parsed.prefs?.crf || '',
        councilType: parsed.prefs?.councilType || (parsed.prefs?.crf ? 'CRF' : 'none'),
        councilOther: parsed.prefs?.councilOther || '',
        councilNumber: parsed.prefs?.councilNumber || '',
        councilUf: parsed.prefs?.councilUf || '',
        professionalId:
          parsed.prefs?.professionalId || formatProfessionalId(parsed.prefs || {}),
        theme: (['auto', 'light', 'dark'].includes(parsed.prefs?.theme)
          ? parsed.prefs.theme
          : 'auto') as ThemePreference,
        photo: parsed.prefs?.photo || cachedPhoto || '',
        notificationsEnabled: parsed.prefs?.notificationsEnabled ?? true,
        notifyAppointments: parsed.prefs?.notifyAppointments ?? true,
        notifyOverdue: parsed.prefs?.notifyOverdue ?? true,
        notifyQuotes: parsed.prefs?.notifyQuotes ?? true,
        notifyGoals: parsed.prefs?.notifyGoals ?? true,
        readNotificationIds: Array.isArray(parsed.prefs?.readNotificationIds)
          ? parsed.prefs.readNotificationIds
          : [],
        customExpenseCategories: Array.isArray(parsed.prefs?.customExpenseCategories)
          ? parsed.prefs.customExpenseCategories
          : [],
        customRevenueCategories: Array.isArray(parsed.prefs?.customRevenueCategories)
          ? parsed.prefs.customRevenueCategories
          : [],
      },
    };
  } catch (e) {
    console.error('Error loading database', e);
    return getDefaultDatabase();
  }
}

export function saveDatabase(db: Database, username?: string): void {
  try {
    const userKey = getUserStorageKey(username);
    localStorage.setItem(userKey, JSON.stringify(db));
    localStorage.setItem(DK, JSON.stringify(db));
    if (db.prefs?.photo && db.prefs.photo.trim().length > 0) {
      localStorage.setItem(getUserPhotoKey(username), db.prefs.photo);
      localStorage.setItem(`${DK}_photo`, db.prefs.photo);
    }
  } catch (e) {
    console.error('Error saving database', e);
  }
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function converterGrupo(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;
  const partes: string[] = [];
  if (c > 0) partes.push(centenas[c]);
  if (d === 1) {
    partes.push(especiais[u]);
  } else {
    if (d > 1) partes.push(dezenas[d]);
    if (u > 0) partes.push(unidades[u]);
  }
  return partes.join(' e ');
}

export function valorPorExtenso(valor: number): string {
  const num = Math.abs(valor);
  const inteiro = Math.floor(num);
  const centavos = Math.round((num - inteiro) * 100);

  if (inteiro === 0 && centavos === 0) return 'zero reais';

  const partesTexto: string[] = [];

  if (inteiro > 0) {
    const milhares = Math.floor(inteiro / 1000);
    const resto = inteiro % 1000;

    if (milhares > 0) {
      if (milhares === 1) {
        partesTexto.push('um mil');
      } else {
        partesTexto.push(`${converterGrupo(milhares)} mil`);
      }
    }

    if (resto > 0) {
      partesTexto.push(converterGrupo(resto));
    }

    const textoReais = partesTexto.join(resto > 0 && resto <= 100 ? ' e ' : ' e ');
    const moeda = inteiro === 1 ? 'real' : 'reais';
    partesTexto.length = 0;
    partesTexto.push(`${textoReais} ${moeda}`);
  }

  if (centavos > 0) {
    const centavosTexto = converterGrupo(centavos);
    const moedaCentavo = centavos === 1 ? 'centavo' : 'centavos';
    if (inteiro > 0) {
      partesTexto.push(` e ${centavosTexto} ${moedaCentavo}`);
    } else {
      partesTexto.push(`${centavosTexto} ${moedaCentavo}`);
    }
  }

  return partesTexto.join('').trim();
}
