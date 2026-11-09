import {
  Database,
  Job,
  Client,
  Appointment,
  Prefs,
  ExpenseRecord,
  RevenueRecord,
  Quote,
  ServiceCatalogItem,
} from '../types';
import {
  today,
  dateLabel,
  money,
  calculateTotal,
  calculatePaid,
  calculateDue,
  loadDatabase,
} from '../utils';
import { jsPDF } from 'jspdf';

export interface BackupStats {
  jobsCount: number;
  clientsCount: number;
  appointmentsCount: number;
  expensesCount?: number;
  revenuesCount?: number;
  quotesCount?: number;
  catalogCount?: number;
  totalEarnings: number;
  totalPending: number;
}

export interface BackupMetadata {
  appName: string;
  formatVersion: string;
  exportDate: string;
  owner: string;
  crf: string;
  stats: BackupStats;
}

export interface BackupPayload {
  appName: string;
  formatVersion: string;
  exportDate: string;
  owner: string;
  crf: string;
  stats: BackupStats;
  data: {
    jobs: Job[];
    clients: Client[];
    appointments: Appointment[];
    expenses?: ExpenseRecord[];
    revenues?: RevenueRecord[];
    quotes?: Quote[];
    catalog?: ServiceCatalogItem[];
    prefs: Prefs;
    pixKey?: string;
    receiptTemplate?: string;
  };
}

export interface LastBackupRecord {
  timestamp: string;
  formattedDate: string;
  jobsCount: number;
  clientsCount: number;
  fileName: string;
  success: boolean;
}

const LAST_BACKUP_KEY = 'calculos_last_backup_record';

/**
 * Cria o pacote completo de backup com todos os dados e metadados estruturados.
 */
export function buildBackupPayload(db: Database): BackupPayload {
  const pixKey = localStorage.getItem('calculos_pix_key') || '';
  const receiptTemplate = localStorage.getItem('calculos_receipt_template') || 'cupom';

  const totalEarnings = db.jobs.reduce((sum, j) => sum + calculateTotal(j), 0);
  const totalPending = db.jobs.reduce((sum, j) => sum + calculateDue(j), 0);

  const stats: BackupStats = {
    jobsCount: db.jobs.length,
    clientsCount: db.clients.length,
    appointmentsCount: db.appointments.length,
    expensesCount: (db.expenses || []).length,
    revenuesCount: (db.revenues || []).length,
    quotesCount: (db.quotes || []).length,
    catalogCount: (db.catalog || []).length,
    totalEarnings,
    totalPending,
  };

  return {
    appName: 'FREELAS — AUTÔNOMOS & FREELANCERS',
    formatVersion: '2.0',
    exportDate: new Date().toISOString(),
    owner: db.prefs.displayName || 'Profissional',
    crf: db.prefs.crf || '',
    stats,
    data: {
      jobs: db.jobs,
      clients: db.clients,
      appointments: db.appointments,
      expenses: db.expenses || [],
      revenues: db.revenues || [],
      quotes: db.quotes || [],
      catalog: db.catalog || [],
      prefs: {
        ...db.prefs,
      },
      pixKey,
      receiptTemplate,
    },
  };
}

/**
 * Exporta o arquivo de backup no formato JSON com suporte a download e compartilhamento nativo.
 */
export async function exportBackup(db: Database): Promise<{
  success: boolean;
  fileName: string;
  stats: BackupStats;
  shared?: boolean;
}> {
  const payload = buildBackupPayload(db);
  const dateStr = today();
  const fileName = `freelas_backup_${dateStr}.json`;
  const jsonContent = JSON.stringify(payload, null, 2);

  const blob = new Blob([jsonContent], { type: 'application/json' });
  const file = new File([blob], fileName, { type: 'application/json' });

  const now = new Date();
  const record: LastBackupRecord = {
    timestamp: now.toISOString(),
    formattedDate: `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    jobsCount: db.jobs.length,
    clientsCount: db.clients.length,
    fileName,
    success: true,
  };
  saveLastBackupRecord(record);

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Backup dos Meus Dados - FREELAS',
        text: `Backup completo do aplicativo FREELAS gerado em ${record.formattedDate}`,
      });
      return { success: true, fileName, stats: payload.stats, shared: true };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: true, fileName, stats: payload.stats, shared: false };
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { success: true, fileName, stats: payload.stats, shared: false };
}

export function saveLastBackupRecord(record: LastBackupRecord) {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify(record));
  } catch {}
}

export function getLastBackupRecord(): LastBackupRecord | null {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  parsedDb?: Database;
  pixKey?: string;
  receiptTemplate?: string;
  metadata?: {
    formatVersion: string;
    exportDate?: string;
    owner?: string;
    crf?: string;
    jobsCount: number;
    clientsCount: number;
    appointmentsCount: number;
  };
}

/**
 * Valida a integridade, compatibilidade e estrutura do arquivo de backup antes de restaurar.
 */
export function validateBackupContent(rawText: string): ValidationResult {
  try {
    const parsed = JSON.parse(rawText);

    let dataRoot: any = null;
    let pixKey = '';
    let receiptTemplate = '';
    const formatVersion = parsed.formatVersion || (parsed.version ? String(parsed.version) : '1.0');
    const exportDate = parsed.exportDate || parsed.exportedAt || '';
    let owner = parsed.owner || '';
    let crf = parsed.crf || '';

    if (parsed.data && typeof parsed.data === 'object') {
      dataRoot = parsed.data;
      pixKey = parsed.data.pixKey || '';
      receiptTemplate = parsed.data.receiptTemplate || '';
    } else if (parsed.db && typeof parsed.db === 'object') {
      dataRoot = parsed.db;
    } else if (Array.isArray(parsed.jobs)) {
      dataRoot = parsed;
    } else {
      return {
        valid: false,
        error: 'O arquivo selecionado não contém a estrutura de dados reconhecida pelo aplicativo FREELAS.',
      };
    }

    if (!Array.isArray(dataRoot.jobs)) {
      return {
        valid: false,
        error: 'A lista de trabalhos (jobs) no arquivo de backup está corrompida ou ausente.',
      };
    }

    // Use a chaveta temporária para sanitizar via loadDatabase ou mapeamento completo
    const tempKey = '__backup_validation_temp__';
    localStorage.setItem(`calculos_pro_v2_db_${tempKey}`, JSON.stringify(dataRoot));
    const parsedDb = loadDatabase(tempKey);
    localStorage.removeItem(`calculos_pro_v2_db_${tempKey}`);

    if (!owner && parsedDb.prefs?.displayName) owner = parsedDb.prefs.displayName;
    if (!crf && parsedDb.prefs?.crf) crf = parsedDb.prefs.crf;

    return {
      valid: true,
      parsedDb,
      pixKey,
      receiptTemplate,
      metadata: {
        formatVersion,
        exportDate,
        owner: parsedDb.prefs.displayName || owner,
        crf: parsedDb.prefs.crf || crf,
        jobsCount: parsedDb.jobs.length,
        clientsCount: parsedDb.clients.length,
        appointmentsCount: parsedDb.appointments.length,
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Falha ao processar o arquivo JSON: ${err?.message || 'Arquivo corrompido ou formato inválido'}`,
    };
  }
}

/**
 * Exporta um relatório geral em PDF com o sumário completo de todos os dados do aplicativo.
 */
export async function exportDataSummaryPDF(
  db: Database
): Promise<{ success: boolean; error?: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [16, 29, 50]; // #101D32 Corporate Navy
    const textColor = [23, 43, 77];
    const lightGray = [241, 245, 249];

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('FREELAS — RELATÓRIO GERAL DO SISTEMA', 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const dateFormatted = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString(
      'pt-BR',
      { hour: '2-digit', minute: '2-digit' }
    )}`;
    doc.text(`Autônomos & Freelancers · Gerado em: ${dateFormatted}`, 14, 23);

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. DADOS DO PROPRIETÁRIO & CONFIGURAÇÕES', 14, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Profissional: ${db.prefs.displayName || 'Não informado'}`, 14, 48);
    doc.text(`Registro Profissional: ${db.prefs.professionalId || db.prefs.crf || 'Não informado'}`, 14, 54);
    doc.text(`Meta Mensal Cadastrada: ${money(db.prefs.goal)} (${db.prefs.goalMonth || 'Geral'})`, 14, 60);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('2. RESUMO GERAL DAS INFORMAÇÕES', 14, 72);

    const totalEarned = db.jobs.reduce((s, j) => s + calculateTotal(j), 0);
    const totalPaid = db.jobs.reduce((s, j) => s + calculatePaid(j), 0);
    const totalDue = db.jobs.reduce((s, j) => s + calculateDue(j), 0);

    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(14, 76, 182, 28, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`• Total de Trabalhos Cadastrados: ${db.jobs.length}`, 18, 83);
    doc.text(`• Total de Clientes Cadastrados: ${db.clients.length}`, 18, 90);
    doc.text(`• Total de Agendamentos: ${db.appointments.length}`, 18, 97);

    doc.text(`• Faturamento Total Registrado: ${money(totalEarned)}`, 110, 83);
    doc.text(`• Total Efetivamente Recebido: ${money(totalPaid)}`, 110, 90);
    doc.text(`• Saldo Total Pendente: ${money(totalDue)}`, 110, 97);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. ÚLTIMOS TRABALHOS REGISTRADOS NO SISTEMA', 14, 116);

    let y = 124;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DATA', 14, y);
    doc.text('SERVIÇO / FUNÇÃO', 38, y);
    doc.text('LOCAL / CLIENTE', 85, y);
    doc.text('VALOR', 150, y);
    doc.text('STATUS', 180, y);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, y + 2, 196, y + 2);
    y += 7;

    const recentJobs = [...db.jobs]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 18);

    doc.setFont('helvetica', 'normal');
    for (const job of recentJobs) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(dateLabel(job.date), 14, y);
      doc.text((job.profession || 'Serviço').slice(0, 24), 38, y);
      doc.text((job.place || '—').slice(0, 32), 85, y);
      doc.text(money(calculateTotal(job)), 150, y);
      const isPaid = calculateDue(job) < 0.01;
      doc.text(isPaid ? 'Pago' : 'Pendente', 180, y);
      y += 6;
    }

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Documento de conferência de dados gerado pelo aplicativo FREELAS — Autônomos & Freelancers.',
      14,
      288
    );

    const pdfBlob = doc.output('blob');
    const fileName = `relatorio_geral_freelas_${today()}.pdf`;
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Relatório Geral do Sistema - FREELAS',
          text: `Relatório de conferência gerado em ${dateFormatted}`,
        });
        return { success: true };
      } catch (err: any) {
        if (err?.name === 'AbortError') return { success: true };
      }
    }

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao gerar relatório PDF:', err);
    return { success: false, error: err?.message || 'Falha ao gerar relatório' };
  }
}
