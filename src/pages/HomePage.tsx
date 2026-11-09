import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  Briefcase,
  AlertTriangle,
  CalendarCheck,
  Plus,
  ArrowRight,
  Receipt,
  Copy,
  Edit2,
  Trash2,
  Check,
  X,
  Users,
  DollarSign,
  TrendingDown,
  FileText,
  CalendarPlus,
  UserPlus,
  Wallet,
  Target,
  CheckCircle2,
  PlayCircle,
  Calendar,
} from 'lucide-react';
import { Database, Job, PageId } from '../types';
import {
  today,
  currentMonth,
  money,
  dateLabel,
  hlabel,
  calculateHours,
  calculateTotal,
  calculatePaid,
  calculateDue,
  calculateReceived,
  calculateDueAll,
  getServiceStatus,
  calculateMonthReceivedTotal,
  addDays,
} from '../utils';
import { TotalReceivedModal } from '../components/TotalReceivedModal';
import { QuickJobStatusModal, QuickStatusMode } from '../components/QuickJobStatusModal';

interface HomePageProps {
  db: Database;
  onNavigate: (page: PageId) => void;
  onEditJob: (job: Job) => void;
  onDuplicateJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onViewReceipt: (job: Job) => void;
  onQuickUpdateJob?: (job: Job) => void;
  onOpenReceived?: () => void;
  onOpenPending?: () => void;
  onOpenExpenses?: () => void;
  onOpenHours?: () => void;
  onOpenJobs?: () => void;
  onOpenJobsFiltered?: (situation: 'all' | 'in_progress' | 'completed' | 'scheduled') => void;
  onQuickNewJob?: () => void;
  onQuickNewClient?: () => void;
  onQuickNewRevenue?: () => void;
  onQuickNewExpense?: () => void;
  onQuickNewQuote?: () => void;
  onQuickNewAppointment?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  db,
  onNavigate,
  onEditJob,
  onDuplicateJob,
  onDeleteJob,
  onViewReceipt,
  onQuickUpdateJob,
  onOpenPending,
  onOpenExpenses,
  onOpenHours,
  onOpenJobs,
  onOpenJobsFiltered,
  onQuickNewJob,
  onQuickNewClient,
  onQuickNewRevenue,
  onQuickNewExpense,
  onQuickNewQuote,
  onQuickNewAppointment,
}) => {
  const jobs = db.jobs || [];
  const clients = db.clients || [];
  const appointments = db.appointments || [];
  const expenses = db.expenses || [];
  const revenues = db.revenues || [];
  const prefs = db.prefs;

  const currentMonthStr = currentMonth();

  // Modals state
  const [isTotalReceivedModalOpen, setIsTotalReceivedModalOpen] = useState(false);
  const [quickStatusJob, setQuickStatusJob] = useState<Job | null>(null);
  const [quickStatusMode, setQuickStatusMode] = useState<QuickStatusMode>('complete');

  // Financial Metrics for Current Month
  const monthJobs = useMemo(
    () => jobs.filter((j) => j.date.startsWith(currentMonthStr) && j.status !== 'cancelled'),
    [jobs, currentMonthStr]
  );

  const monthStandaloneRevenues = useMemo(
    () => revenues.filter((r) => r.date.startsWith(currentMonthStr)),
    [revenues, currentMonthStr]
  );

  const monthStandaloneExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(currentMonthStr)),
    [expenses, currentMonthStr]
  );

  // 1. Faturamento do mês (gross billed in the month: jobs + standalone revenues)
  const monthGrossBilling = useMemo(() => {
    const jobsGross = monthJobs.reduce((s, j) => s + calculateTotal(j) + (Number(j.transport) || 0), 0);
    const revGross = monthStandaloneRevenues.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return jobsGross + revGross;
  }, [monthJobs, monthStandaloneRevenues]);

  // 2. Total efetivamente recebido no mês
  const currentMonthReceived = useMemo(() => {
    const jobsRec = calculateMonthReceivedTotal(jobs, currentMonthStr);
    const revRec = monthStandaloneRevenues
      .filter((r) => r.status === 'received')
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return jobsRec + revRec;
  }, [jobs, monthStandaloneRevenues, currentMonthStr]);

  // 3. Valores pendentes (a receber geral)
  const totalPending = useMemo(() => {
    const jobsPend = jobs.reduce((s, j) => s + calculateDueAll(j), 0);
    const revPend = revenues
      .filter((r) => r.status === 'pending')
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return jobsPend + revPend;
  }, [jobs, revenues]);

  // 4. Despesas do mês (job expenses + standalone expenses)
  const monthExpensesTotal = useMemo(() => {
    const jobExp = monthJobs.reduce((s, j) => s + (Number(j.expenses) || 0), 0);
    const standExp = monthStandaloneExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return jobExp + standExp;
  }, [monthJobs, monthStandaloneExpenses]);

  // 5. Lucro líquido do mês (Total Recebido - Despesas do mês)
  const monthNetProfit = currentMonthReceived - monthExpensesTotal;

  // Operational Indicators
  const jobsInProgressCount = jobs.filter((j) => j.status === 'in_progress').length;
  const jobsCompletedCount = jobs.filter(
    (j) => j.status === 'completed' || (!j.status && getServiceStatus(j) === 'paid')
  ).length;
  const jobsScheduledCount =
    jobs.filter((j) => j.status === 'scheduled' || (j.date >= today() && j.status !== 'cancelled' && j.status !== 'completed')).length +
    appointments.filter((a) => a.date >= today() && a.status !== 'cancelled' && a.status !== 'completed').length;
  const clientsCount = clients.length;

  const totalHoursWorked = jobs.reduce(
    (s, j) => s + calculateHours(j) + (Number(j.extraHours) || 0),
    0
  );

  // Monthly Goal
  const targetMonth = prefs.goalMonth || currentMonthStr;
  const goalTarget = Number(prefs.goal) || 0;
  const monthReceivedForGoal = useMemo(() => {
    const jRec = jobs
      .filter((j) => j.date.startsWith(targetMonth))
      .reduce((s, j) => s + calculateReceived(j), 0);
    const rRec = revenues
      .filter((r) => r.date.startsWith(targetMonth) && r.status === 'received')
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return jRec + rRec;
  }, [jobs, revenues, targetMonth]);

  const goalPercent = goalTarget > 0 ? Math.min(100, Math.round((monthReceivedForGoal / goalTarget) * 100)) : 0;
  const remainingGoal = Math.max(0, goalTarget - monthReceivedForGoal);

  // 6-Month Evolution Chart Data (strictly real data)
  const last6MonthsData = useMemo(() => {
    const result: { monthKey: string; label: string; received: number; expenses: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const shortMonth = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      const jRec = calculateMonthReceivedTotal(jobs, ym);
      const rRec = revenues
        .filter((r) => r.date.startsWith(ym) && r.status === 'received')
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const jExp = jobs
        .filter((j) => j.date.startsWith(ym) && j.status !== 'cancelled')
        .reduce((s, j) => s + (Number(j.expenses) || 0), 0);
      const sExp = expenses
        .filter((e) => e.date.startsWith(ym))
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
      result.push({
        monthKey: ym,
        label: shortMonth.charAt(0).toUpperCase() + shortMonth.slice(1),
        received: jRec + rRec,
        expenses: jExp + sExp,
      });
    }
    return result;
  }, [jobs, revenues, expenses]);

  const maxChartValue = Math.max(
    100,
    ...last6MonthsData.map((d) => Math.max(d.received, d.expenses))
  );

  // Alerts & Lists
  const overdueJobs = jobs.filter(
    (j) =>
      j.status !== 'cancelled' &&
      ((calculateDue(j) > 0.009 && j.dueDate && j.dueDate < today()) ||
        (j.transportstatus !== 'paid' && Number(j.transport) > 0 && j.dueDate && j.dueDate < today()))
  );

  const pendingJobsList = jobs
    .filter((j) => j.status !== 'cancelled' && calculateDueAll(j) > 0.009)
    .sort((a, b) => (a.dueDate || a.date).localeCompare(b.dueDate || b.date))
    .slice(0, 4);

  const upcomingAppointments = appointments
    .filter((a) => a.date >= today() && a.status !== 'cancelled')
    .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`))
    .slice(0, 4);

  const recentJobs = [...jobs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  const getClientName = (id?: string) => {
    if (!id) return '';
    return clients.find((c) => c.id === id)?.name || '';
  };

  const firstName = (prefs.displayName || prefs.name || 'Profissional').trim().split(' ')[0];

  const quickActions = [
    {
      label: 'Novo Trabalho',
      icon: <Briefcase className="w-4 h-4 text-[#2563EB]" />,
      onClick: () => (onQuickNewJob ? onQuickNewJob() : onNavigate('new')),
      bg: 'bg-[#2563EB]/10 border-[#2563EB]/20 hover:border-[#2563EB]',
    },
    {
      label: 'Novo Cliente',
      icon: <UserPlus className="w-4 h-4 text-[#3B82F6]" />,
      onClick: () => (onQuickNewClient ? onQuickNewClient() : onNavigate('clients')),
      bg: 'bg-[#3B82F6]/10 border-[#3B82F6]/20 hover:border-[#3B82F6]',
    },
    {
      label: 'Registrar Receita',
      icon: <TrendingUp className="w-4 h-4 text-[#16A36A]" />,
      onClick: () => (onQuickNewRevenue ? onQuickNewRevenue() : onNavigate('finance')),
      bg: 'bg-[#16A36A]/10 border-[#16A36A]/20 hover:border-[#16A36A]',
    },
    {
      label: 'Registrar Despesa',
      icon: <TrendingDown className="w-4 h-4 text-[#DC4545]" />,
      onClick: () => (onQuickNewExpense ? onQuickNewExpense() : onNavigate('finance')),
      bg: 'bg-[#DC4545]/10 border-[#DC4545]/20 hover:border-[#DC4545]',
    },
    {
      label: 'Criar Orçamento',
      icon: <FileText className="w-4 h-4 text-indigo-500" />,
      onClick: () => (onQuickNewQuote ? onQuickNewQuote() : onNavigate('quotes')),
      bg: 'bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500',
    },
    {
      label: 'Novo Agendamento',
      icon: <CalendarPlus className="w-4 h-4 text-amber-500" />,
      onClick: () => (onQuickNewAppointment ? onQuickNewAppointment() : onNavigate('calendar')),
      bg: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1">
        <div className="min-w-0">
          <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)] block">
            Painel Executivo · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5 leading-snug">
            Olá, {firstName}. <span className="text-[var(--muted)] font-semibold">Aqui está o seu negócio.</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => (onQuickNewQuote ? onQuickNewQuote() : onNavigate('quotes'))}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--cream)] text-[var(--ink)] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
          >
            <FileText className="w-3.5 h-3.5 text-[var(--g)] shrink-0" />
            <span>Orçamento</span>
          </button>
          <button
            type="button"
            onClick={() => (onQuickNewJob ? onQuickNewJob() : onNavigate('new'))}
            className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Novo Trabalho</span>
          </button>
        </div>
      </div>

      {/* 6 Quick Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {quickActions.map((act) => (
          <button
            key={act.label}
            type="button"
            onClick={act.onClick}
            className="flex items-center gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--g)] shadow-2xs transition-all text-left cursor-pointer active:scale-[0.98] group min-h-[56px]"
          >
            <div className={`p-2 rounded-xl border ${act.bg} transition-transform group-hover:scale-105 shrink-0`}>
              {act.icon}
            </div>
            <span className="text-xs font-bold text-[var(--ink)] leading-tight line-clamp-2">
              {act.label}
            </span>
          </button>
        ))}
      </div>

      {/* 5 Financial KPIs Row */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Indicadores Financeiros (Mês Atual)
          </span>
          <button
            type="button"
            onClick={() => onNavigate('finance')}
            className="text-xs font-bold text-[var(--g)] hover:underline cursor-pointer shrink-0 py-0.5"
          >
            Abrir Financeiro →
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Total Recebido (Primary Highlight - Green semantic indicator) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsTotalReceivedModalOpen(true)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsTotalReceivedModalOpen(true)}
            className="col-span-2 lg:col-span-1 p-4 sm:p-4.5 rounded-2xl bg-[#101D32] text-white border border-[#1E3254] shadow-md flex flex-col justify-between min-h-[118px] cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider truncate">
                Total Recebido
              </span>
              <span className="p-1.5 rounded-lg bg-[#16A36A]/20 text-[#4ADE80] shrink-0">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="my-2">
              <strong className="text-xl sm:text-2xl font-extrabold font-mono-num tracking-tight text-[#4ADE80] block leading-tight">
                {money(currentMonthReceived)}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-1 border-t border-white/10">
              <span className="truncate">Caixa efetivo no mês</span>
              <span className="font-bold text-[#60A5FA] group-hover:translate-x-0.5 transition-transform shrink-0 ml-1">
                Filtrar →
              </span>
            </div>
          </div>

          {/* Card 2: Faturamento do Mês (Blue semantic indicator) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('business')}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigate('business')}
            className="p-4 sm:p-4.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col justify-between min-h-[116px] cursor-pointer hover:border-[#2563EB] active:scale-[0.99] transition-all"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider truncate">
                Faturamento
              </span>
              <span className="p-1.5 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="my-2">
              <strong className="text-base sm:text-xl font-extrabold font-mono-num tracking-tight text-[#2563EB] dark:text-[#60A5FA] block leading-tight">
                {money(monthGrossBilling)}
              </strong>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[var(--muted)] truncate block">
              Total bruto produzido
            </span>
          </div>

          {/* Card 3: Valores Pendentes / A Receber (Orange semantic indicator) */}
          <div
            role="button"
            tabIndex={0}
            onClick={onOpenPending || (() => onNavigate('finance'))}
            onKeyDown={(e) =>
              (e.key === 'Enter' || e.key === ' ') &&
              (onOpenPending ? onOpenPending() : onNavigate('finance'))
            }
            className="p-4 sm:p-4.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col justify-between min-h-[116px] cursor-pointer hover:border-[#F59E0B] active:scale-[0.99] transition-all"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider truncate">
                A Receber
              </span>
              <span className="p-1.5 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="my-2">
              <strong className="text-base sm:text-xl font-extrabold font-mono-num tracking-tight text-[#F59E0B] block leading-tight">
                {money(totalPending)}
              </strong>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[var(--muted)] truncate block">
              Cobranças em aberto
            </span>
          </div>

          {/* Card 4: Despesas do Mês (Red semantic indicator) */}
          <div
            role="button"
            tabIndex={0}
            onClick={onOpenExpenses || (() => onNavigate('finance'))}
            onKeyDown={(e) =>
              (e.key === 'Enter' || e.key === ' ') &&
              (onOpenExpenses ? onOpenExpenses() : onNavigate('finance'))
            }
            className="p-4 sm:p-4.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col justify-between min-h-[116px] cursor-pointer hover:border-[#DC4545] active:scale-[0.99] transition-all"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider truncate">
                Despesas
              </span>
              <span className="p-1.5 rounded-lg bg-[#DC4545]/10 text-[#DC4545] shrink-0">
                <TrendingDown className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="my-2">
              <strong className="text-base sm:text-xl font-extrabold font-mono-num tracking-tight text-[#DC4545] block leading-tight">
                {money(monthExpensesTotal)}
              </strong>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[var(--muted)] truncate block">
              Custos do mês atual
            </span>
          </div>

          {/* Card 5: Lucro Líquido (Green semantic indicator) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('business')}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigate('business')}
            className="p-4 sm:p-4.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col justify-between min-h-[116px] cursor-pointer hover:border-[#16A36A] active:scale-[0.99] transition-all"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider truncate">
                Lucro Líquido
              </span>
              <span className="p-1.5 rounded-lg bg-[#16A36A]/10 text-[#16A36A] shrink-0">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="my-2">
              <strong
                className={`text-base sm:text-xl font-extrabold font-mono-num tracking-tight block leading-tight ${
                  monthNetProfit >= 0 ? 'text-[#16A36A]' : 'text-[#DC4545]'
                }`}
              >
                {money(monthNetProfit)}
              </strong>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[var(--muted)] truncate block">
              Recebido − Despesas
            </span>
          </div>
        </div>
      </div>

      {/* 4 Operational KPIs Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            onOpenJobsFiltered
              ? onOpenJobsFiltered('in_progress')
              : onOpenJobs
              ? onOpenJobs()
              : onNavigate('jobs')
          }
          className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-2 cursor-pointer hover:border-[var(--g)] active:scale-[0.99] transition-all"
        >
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-[var(--muted)] block truncate">
              Em Andamento
            </span>
            <strong className="text-xl font-extrabold font-mono-num text-[var(--ink)]">
              {jobsInProgressCount}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#2563EB]/10 text-[#2563EB] shrink-0">
            <PlayCircle className="w-5 h-5" />
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            onOpenJobsFiltered
              ? onOpenJobsFiltered('completed')
              : onOpenJobs
              ? onOpenJobs()
              : onNavigate('jobs')
          }
          className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-2 cursor-pointer hover:border-[#16A36A] active:scale-[0.99] transition-all"
        >
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-[var(--muted)] block truncate">
              Concluídos
            </span>
            <strong className="text-xl font-extrabold font-mono-num text-[var(--ink)]">
              {jobsCompletedCount}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#16A36A]/10 text-[#16A36A] shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('calendar')}
          className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-2 cursor-pointer hover:border-[#F59E0B] active:scale-[0.99] transition-all"
        >
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-[var(--muted)] block truncate">
              Agendados
            </span>
            <strong className="text-xl font-extrabold font-mono-num text-[var(--ink)]">
              {jobsScheduledCount}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('clients')}
          className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-2 cursor-pointer hover:border-[var(--g)] active:scale-[0.99] transition-all"
        >
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-[var(--muted)] block truncate">
              Clientes
            </span>
            <strong className="text-xl font-extrabold font-mono-num text-[var(--ink)]">
              {clientsCount}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Evolution Chart & Monthly Goal Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 6-Month Evolution Chart */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--g)]">
                Desempenho Financeiro Real
              </span>
              <h3 className="text-base font-bold text-[var(--ink)]">
                Evolução Mensal (Últimos 6 Meses)
              </h3>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-[var(--ink)]">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]" /> Recebido
              </span>
              <span className="flex items-center gap-1.5 text-[var(--muted)]">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#DC4545]" /> Despesas
              </span>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-40 pt-4 px-2 border-b border-[var(--line)]">
            {last6MonthsData.map((item) => {
              const recHeight = Math.max(4, Math.round((item.received / maxChartValue) * 120));
              const expHeight = Math.max(4, Math.round((item.expenses / maxChartValue) * 120));
              return (
                <div key={item.monthKey} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-32">
                    <div
                      className="w-3 sm:w-5 bg-[#2563EB] hover:bg-[#3B82F6] rounded-t-md transition-all relative"
                      style={{ height: `${recHeight}px` }}
                      title={`${item.label} Recebido: ${money(item.received)}`}
                    />
                    <div
                      className="w-3 sm:w-5 bg-[#DC4545]/80 hover:bg-[#DC4545] rounded-t-md transition-all relative"
                      style={{ height: `${expHeight}px` }}
                      title={`${item.label} Despesas: ${money(item.expenses)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-6 gap-2 text-center mt-2">
            {last6MonthsData.map((item) => (
              <div key={item.monthKey} className="text-[10px] font-bold text-[var(--muted)]">
                <div>{item.label}</div>
                <div className="font-mono text-[9px] text-[var(--ink)] truncate">
                  {item.received > 0 ? money(item.received).replace('R$', '').trim() : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Goal & Hours Summary Card */}
        <div className="p-5 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[var(--sage)] text-[var(--g)]">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--g)] block">
                    Meta Financeira ({targetMonth})
                  </span>
                  <h3 className="text-sm font-bold text-[var(--ink)]">
                    {goalTarget > 0 ? `Meta: ${money(goalTarget)}` : 'Definir meta mensal'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('business')}
                className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--cream)] text-[11px] font-bold text-[var(--g)] hover:bg-[var(--line)] transition-colors cursor-pointer"
              >
                Metas
              </button>
            </div>

            <div className="h-3 w-full bg-[var(--cream)] rounded-full overflow-hidden border border-[var(--line)] my-3">
              <div
                className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] rounded-full transition-all duration-500"
                style={{ width: `${goalPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>
                <b className="text-[var(--ink)]">{money(monthReceivedForGoal)}</b> recebidos
              </span>
              <span className="font-extrabold text-[var(--g)]">{goalPercent}%</span>
            </div>
            {goalTarget > 0 && (
              <p className="text-[11px] text-[var(--muted)] mt-1">
                {remainingGoal > 0
                  ? `Faltam ${money(remainingGoal)} para atingir sua meta mensal.`
                  : 'Parabéns! Meta mensal atingida com sucesso!'}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] block">
                Jornada Acumulada
              </span>
              <strong className="text-base font-extrabold font-mono-num text-[var(--ink)]">
                {hlabel(totalHoursWorked).replace(' 00min', '')}
              </strong>
            </div>
            <button
              type="button"
              onClick={onOpenHours}
              className="px-3 py-1.5 rounded-xl bg-[var(--cream)] hover:bg-[var(--line)] text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-[var(--g)]" />
              <span>Ver Horas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments & Pending Collections Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Próximos Compromissos */}
        <div className="p-5 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[var(--g)]" />
              <h3 className="text-sm font-bold text-[var(--ink)]">Próximos Compromissos</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="text-xs font-bold text-[var(--g)] hover:underline cursor-pointer"
            >
              Ver Agenda →
            </button>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--line)] rounded-2xl">
              Nenhum compromisso futuro agendado.
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => (onQuickNewAppointment ? onQuickNewAppointment() : onNavigate('calendar'))}
                  className="text-[var(--g)] font-bold hover:underline cursor-pointer"
                >
                  + Agendar compromisso
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingAppointments.map((app) => (
                <div
                  key={app.id}
                  onClick={() => onNavigate('calendar')}
                  className="p-3 rounded-2xl bg-[var(--cream)]/60 border border-[var(--line)] flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--g)] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[var(--ink)] truncate">
                      {app.title || app.task || 'Compromisso agendado'}
                    </div>
                    <div className="text-[11px] text-[var(--muted)] truncate">
                      {dateLabel(app.date)} {app.time ? `às ${app.time}` : ''} · {app.place || 'Local a definir'}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-[var(--sage)] text-[var(--g)] text-[10px] font-bold shrink-0">
                    {app.date === today() ? 'Hoje' : dateLabel(app.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cobranças Pendentes */}
        <div className="p-5 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              <h3 className="text-sm font-bold text-[var(--ink)]">
                Cobranças Pendentes ({overdueJobs.length > 0 ? `${overdueJobs.length} em atraso` : 'A receber'})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('finance')}
              className="text-xs font-bold text-[var(--g)] hover:underline cursor-pointer"
            >
              Ver Cobranças →
            </button>
          </div>

          {pendingJobsList.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--line)] rounded-2xl">
              Nenhuma cobrança pendente no momento. Tudo em dia!
            </div>
          ) : (
            <div className="space-y-2">
              {pendingJobsList.map((j) => {
                const dueAmount = calculateDueAll(j);
                const isLate = j.dueDate && j.dueDate < today();
                return (
                  <div
                    key={j.id}
                    onClick={() => onEditJob(j)}
                    className="p-3 rounded-2xl bg-[var(--cream)]/60 border border-[var(--line)] flex items-center justify-between gap-3 cursor-pointer hover:border-[#F59E0B] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[var(--ink)] truncate">
                        {j.profession} · {getClientName(j.clientId) || j.place}
                      </div>
                      <div className="text-[11px] text-[var(--muted)]">
                        Realizado em {dateLabel(j.date)}
                        {j.dueDate ? ` · Venc: ${dateLabel(j.dueDate)}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-[#F59E0B]">
                        {money(dueAmount)}
                      </div>
                      {isLate && (
                        <span className="text-[9px] font-bold uppercase text-[#DC4545]">
                          Atrasado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Jobs Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--g)]">
              Histórico Operacional
            </span>
            <h3 className="text-lg font-bold text-[var(--ink)]">Trabalhos Recentes</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('jobs')}
            className="flex items-center gap-1 text-xs font-bold text-[var(--g)] hover:underline cursor-pointer"
          >
            Ver todos ({jobs.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)]">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[var(--sage)] text-[var(--g)] flex items-center justify-center font-bold text-xl">
              <Briefcase className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[var(--ink)] mb-1">
              Nenhum trabalho registrado ainda
            </h4>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto mb-5">
              Registre seus serviços para calcular automaticamente horas, valores, emitir recibos e acompanhar seus recebimentos.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] transition-colors shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar meu primeiro trabalho</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {recentJobs.map((j) => {
              const status = getServiceStatus(j);
              const totalVal = calculateTotal(j);
              const paidVal = calculatePaid(j);
              const dueVal = calculateDue(j);
              const netHours = calculateHours(j) + (Number(j.extraHours) || 0);
              const cName = getClientName(j.clientId);

              return (
                <article
                  key={j.id}
                  className={`p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border shadow-2xs transition-all ${
                    j.status === 'cancelled'
                      ? 'border-rose-300/60 dark:border-rose-900/40 opacity-80'
                      : 'border-[var(--line)] hover:border-[var(--g)]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`text-sm font-bold text-[var(--ink)] truncate ${
                            j.status === 'cancelled' ? 'line-through opacity-70' : ''
                          }`}
                        >
                          {j.profession} ·{' '}
                          <span className="font-normal text-[var(--muted)]">{dateLabel(j.date)}</span>
                        </h4>
                        {j.status === 'completed' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 shrink-0">
                            ✓ Concluído
                          </span>
                        )}
                        {j.status === 'in_progress' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 shrink-0">
                            ● Em andamento
                          </span>
                        )}
                        {j.status === 'scheduled' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 shrink-0">
                            ◷ Agendado
                          </span>
                        )}
                        {j.status === 'cancelled' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 shrink-0">
                            ✕ Cancelado
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)] mt-1">
                        <span>⌖ {j.place}</span>
                        {cName && <span>♙ {cName}</span>}
                        <span>◷ {hlabel(netHours)}</span>
                        {j.task && <span className="truncate max-w-[220px]">✦ {j.task}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <strong
                        className={`text-base font-bold font-mono-num text-[var(--ink)] block ${
                          j.status === 'cancelled' && (Number(j.paid) || 0) <= 0
                            ? 'line-through opacity-50'
                            : ''
                        }`}
                      >
                        {money(totalVal)}
                      </strong>
                      <span className="text-[10px] text-[var(--muted)]">
                        {j.status === 'cancelled' ? 'não faturado' : 'serviço'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : status === 'partial'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {status === 'paid'
                            ? 'Pago'
                            : status === 'partial'
                            ? 'Parcial'
                            : status === 'cancelled'
                            ? 'Cancelado'
                            : 'Pendente'}
                        </span>
                        <span className="text-[11px] text-[var(--muted)]">
                          Serviço: {money(paidVal)} pago · {money(dueVal)} pendente
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickStatusJob(j);
                          setQuickStatusMode('complete');
                        }}
                        className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                          j.status === 'completed'
                            ? 'bg-[#16A36A] text-white hover:opacity-95'
                            : 'border border-[#16A36A]/60 bg-[#16A36A]/10 text-[#16A36A] hover:bg-[#16A36A]/20'
                        }`}
                        title="Marcar como Concluído"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Concluído</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQuickStatusJob(j);
                          setQuickStatusMode('cancel');
                        }}
                        className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                          j.status === 'cancelled'
                            ? 'bg-[#DC4545] text-white hover:opacity-95'
                            : 'border border-[#DC4545]/60 bg-[#DC4545]/10 text-[#DC4545] hover:bg-[#DC4545]/20'
                        }`}
                        title="Marcar como Cancelado"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancelar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onViewReceipt(j)}
                        className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--g)] hover:bg-[var(--sage)] text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Ver recibo / imprimir"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Recibo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditJob(j)}
                        className="p-1.5 sm:px-2 sm:py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--cream)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Editar trabalho"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDuplicateJob(j)}
                        className="p-1.5 sm:px-2 sm:py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--cream)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Duplicar para hoje"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteJob(j.id)}
                        className="p-1.5 sm:px-2 sm:py-1 rounded-lg border border-transparent text-[#DC4545] hover:bg-[#DC4545]/10 text-xs cursor-pointer"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Total Received Modal */}
      <TotalReceivedModal
        isOpen={isTotalReceivedModalOpen}
        onClose={() => setIsTotalReceivedModalOpen(false)}
        jobs={jobs}
        clients={clients}
        onOpenJob={(j) => onEditJob(j)}
      />

      {/* Quick Job Status Modal */}
      <QuickJobStatusModal
        isOpen={Boolean(quickStatusJob)}
        onClose={() => setQuickStatusJob(null)}
        job={quickStatusJob}
        initialMode={quickStatusMode}
        onSaveJob={(updatedJob) => {
          if (onQuickUpdateJob) {
            onQuickUpdateJob(updatedJob);
          } else {
            onEditJob(updatedJob);
          }
        }}
      />
    </div>
  );
};
