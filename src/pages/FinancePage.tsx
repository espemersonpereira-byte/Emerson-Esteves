import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Printer,
  AlertTriangle,
  Receipt,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  Search,
  Plus,
  Trash2,
  MessageCircle,
  X,
  Send,
  Wallet,
} from 'lucide-react';
import { Job, Client, ExpenseRecord, RevenueRecord } from '../types';
import {
  money,
  dateLabel,
  calculatePaid,
  calculateDue,
  calculateDueAll,
  calculateTotal,
  currentMonth,
  today,
  uid,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_REVENUE_CATEGORIES,
  buildWhatsAppUrl,
} from '../utils';

interface FinancePageProps {
  jobs: Job[];
  clients: Client[];
  expenses?: ExpenseRecord[];
  revenues?: RevenueRecord[];
  customExpenseCategories?: string[];
  customRevenueCategories?: string[];
  userName?: string;
  initialTab?: 'overview' | 'received' | 'pending' | 'expenses';
  initialOpenForm?: 'revenue' | 'expense' | null;
  onConsumeOpenForm?: () => void;
  onNavigateHome?: () => void;
  onOpenReportPrint: (month: string) => void;
  onEditJob: (job: Job) => void;
  onViewReceipt: (job: Job) => void;
  onSaveExpense?: (exp: ExpenseRecord) => void;
  onDeleteExpense?: (id: string) => void;
  onSaveRevenue?: (rev: RevenueRecord) => void;
  onDeleteRevenue?: (id: string) => void;
  onAddCustomCategory?: (type: 'expense' | 'revenue', category: string) => void;
}

export const FinancePage: React.FC<FinancePageProps> = ({
  jobs,
  clients,
  expenses = [],
  revenues = [],
  customExpenseCategories = [],
  customRevenueCategories = [],
  userName = 'Profissional',
  initialTab = 'overview',
  initialOpenForm = null,
  onConsumeOpenForm,
  onNavigateHome,
  onOpenReportPrint,
  onEditJob,
  onViewReceipt,
  onSaveExpense,
  onDeleteExpense,
  onSaveRevenue,
  onDeleteRevenue,
  onAddCustomCategory,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'received' | 'expenses' | 'pending'>(
    initialTab
  );
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [searchTerm, setSearchTerm] = useState('');
  const [collectionSubFilter, setCollectionSubFilter] = useState<
    'all' | 'overdue' | 'upcoming' | 'paid'
  >('all');

  // Revenue Form State
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [revForm, setRevForm] = useState<RevenueRecord>({
    id: '',
    description: '',
    amount: 0,
    date: today(),
    category: 'Serviço Avulso',
    paymentMethod: 'Pix',
    status: 'received',
    clientId: '',
    notes: '',
  });
  const [newRevCategory, setNewRevCategory] = useState('');

  // Expense Form State
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expForm, setExpForm] = useState<ExpenseRecord>({
    id: '',
    description: '',
    amount: 0,
    date: today(),
    category: 'Combustível',
    paymentMethod: 'Pix',
    status: 'paid',
    jobId: '',
    notes: '',
  });
  const [newExpCategory, setNewExpCategory] = useState('');

  // WhatsApp Billing Reminder Modal
  const [billingTargetJob, setBillingTargetJob] = useState<Job | null>(null);
  const [billingMessage, setBillingMessage] = useState('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialOpenForm === 'revenue') {
      setActiveTab('received');
      setShowRevenueForm(true);
      if (onConsumeOpenForm) onConsumeOpenForm();
    } else if (initialOpenForm === 'expense') {
      setActiveTab('expenses');
      setShowExpenseForm(true);
      if (onConsumeOpenForm) onConsumeOpenForm();
    }
  }, [initialOpenForm, onConsumeOpenForm]);

  const expenseCategories = useMemo(
    () => Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...customExpenseCategories])),
    [customExpenseCategories]
  );

  const revenueCategories = useMemo(
    () => Array.from(new Set([...DEFAULT_REVENUE_CATEGORIES, ...customRevenueCategories])),
    [customRevenueCategories]
  );

  const getClientName = (id?: string) => {
    if (!id) return '';
    return clients.find((c) => c.id === id)?.name || '';
  };

  // Global Financial Metrics
  const activeJobs = jobs.filter((j) => j.status !== 'cancelled');
  const totalGrossJobs = activeJobs.reduce(
    (s, j) => s + calculateTotal(j) + (Number(j.transport) || 0),
    0
  );
  const totalGrossStandaloneRev = revenues.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalGrossBilling = totalGrossJobs + totalGrossStandaloneRev;

  const totalServicePaid = jobs.reduce((s, j) => s + calculatePaid(j), 0);
  const totalTransportPaid = jobs.reduce(
    (s, j) => s + (j.transportstatus === 'paid' ? Number(j.transport) || 0 : 0),
    0
  );
  const totalStandaloneRevReceived = revenues
    .filter((r) => r.status === 'received')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalReceivedAll = totalServicePaid + totalTransportPaid + totalStandaloneRevReceived;

  const totalPendingJobs = activeJobs.reduce((s, j) => s + calculateDueAll(j), 0);
  const totalPendingStandaloneRev = revenues
    .filter((r) => r.status === 'pending')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalPendingAll = totalPendingJobs + totalPendingStandaloneRev;

  const totalJobExpenses = activeJobs.reduce((s, j) => s + (Number(j.expenses) || 0), 0);
  const totalStandalonePaidExpenses = expenses
    .filter((e) => e.status !== 'planned')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalStandalonePlannedExpenses = expenses
    .filter((e) => e.status === 'planned')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalExpensesPaid = totalJobExpenses + totalStandalonePaidExpenses;

  const globalNetProfit = totalReceivedAll - totalExpensesPaid;

  // Monthly Statement Metrics
  const monthJobs = activeJobs.filter((j) => j.date.startsWith(selectedMonth));
  const monthRevs = revenues.filter((r) => r.date.startsWith(selectedMonth));
  const monthExps = expenses.filter((e) => e.date.startsWith(selectedMonth));

  const monthServicePaid = monthJobs.reduce((s, j) => s + calculatePaid(j), 0);
  const monthTransportPaid = monthJobs.reduce(
    (s, j) => s + (j.transportstatus === 'paid' ? Number(j.transport) || 0 : 0),
    0
  );
  const monthRevReceived = monthRevs
    .filter((r) => r.status === 'received')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const monthTotalReceived = monthServicePaid + monthTransportPaid + monthRevReceived;

  const monthPending =
    monthJobs.reduce((s, j) => s + calculateDueAll(j), 0) +
    monthRevs.filter((r) => r.status === 'pending').reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const monthExpensesPaid =
    monthJobs.reduce((s, j) => s + (Number(j.expenses) || 0), 0) +
    monthExps.filter((e) => e.status !== 'planned').reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const monthNetBalance = monthTotalReceived - monthExpensesPaid;

  // Lists
  const receivedJobs = jobs
    .filter((j) => calculatePaid(j) > 0 || (j.transportstatus === 'paid' && Number(j.transport) > 0))
    .sort((a, b) => (b.paydate || b.date).localeCompare(a.paydate || a.date));

  const pendingJobs = activeJobs
    .filter((j) => calculateDue(j) > 0.009 || (j.transportstatus !== 'paid' && Number(j.transport) > 0))
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

  // Handlers for Standalone Revenue
  const handleSaveRevenueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revForm.description.trim() || Number(revForm.amount) <= 0) return;

    let finalCategory = revForm.category;
    if (newRevCategory.trim()) {
      finalCategory = newRevCategory.trim();
      onAddCustomCategory?.('revenue', finalCategory);
      setNewRevCategory('');
    }

    onSaveRevenue?.({
      ...revForm,
      id: revForm.id || uid(),
      description: revForm.description.trim(),
      amount: Number(revForm.amount) || 0,
      category: finalCategory,
      notes: (revForm.notes || '').trim(),
      createdAt: revForm.createdAt || today(),
    });

    setShowRevenueForm(false);
    setRevForm({
      id: '',
      description: '',
      amount: 0,
      date: today(),
      category: 'Serviço Avulso',
      paymentMethod: 'Pix',
      status: 'received',
      clientId: '',
      notes: '',
    });
  };

  // Handlers for Standalone Expense
  const handleSaveExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expForm.description.trim() || Number(expForm.amount) <= 0) return;

    let finalCategory = expForm.category;
    if (newExpCategory.trim()) {
      finalCategory = newExpCategory.trim();
      onAddCustomCategory?.('expense', finalCategory);
      setNewExpCategory('');
    }

    onSaveExpense?.({
      ...expForm,
      id: expForm.id || uid(),
      description: expForm.description.trim(),
      amount: Number(expForm.amount) || 0,
      category: finalCategory,
      notes: (expForm.notes || '').trim(),
      createdAt: expForm.createdAt || today(),
    });

    setShowExpenseForm(false);
    setExpForm({
      id: '',
      description: '',
      amount: 0,
      date: today(),
      category: 'Combustível',
      paymentMethod: 'Pix',
      status: 'paid',
      jobId: '',
      notes: '',
    });
  };

  const handleOpenBillingReminder = (job: Job) => {
    const cli = clients.find((c) => c.id === job.clientId);
    const dueVal = calculateDueAll(job);
    const cName = cli?.name || job.place || 'Cliente';
    const msg = `Olá, ${cName}! Tudo bem?\nAqui é ${userName}. Passando para lembrar sobre o pagamento referente ao serviço de *${job.profession}* realizado em ${dateLabel(job.date)}, no valor pendente de *${money(dueVal)}*${
      job.dueDate ? ` (vencimento previsto em ${dateLabel(job.dueDate)})` : ''
    }.\n\nQualquer dúvida estou à disposição. Muito obrigado!`;
    setBillingTargetJob(job);
    setBillingMessage(msg);
  };

  const handleSendBillingWhatsApp = () => {
    if (!billingTargetJob) return;
    const cli = clients.find((c) => c.id === billingTargetJob.clientId);
    const phone = cli?.whatsapp || cli?.phone || '';
    if (phone && phone.replace(/\D/g, '').length >= 8) {
      const url = buildWhatsAppUrl(phone, billingMessage);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const encoded = encodeURIComponent(billingMessage);
      window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
    }
    setBillingTargetJob(null);
  };

  const filteredCollectionJobs = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const now = today();
    const source = collectionSubFilter === 'paid' ? receivedJobs : pendingJobs;

    return source.filter((j) => {
      if (collectionSubFilter === 'overdue') {
        if (!j.dueDate || j.dueDate >= now) return false;
      } else if (collectionSubFilter === 'upcoming') {
        if (j.dueDate && j.dueDate < now) return false;
      }
      if (!q) return true;
      const cName = getClientName(j.clientId).toLowerCase();
      return (
        j.profession.toLowerCase().includes(q) ||
        j.place.toLowerCase().includes(q) ||
        cName.includes(q)
      );
    });
  }, [collectionSubFilter, receivedJobs, pendingJobs, searchTerm, clients]);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div>
        {onNavigateHome && (
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] mb-2 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar para o início</span>
          </button>
        )}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
              Gestão Financeira Completa
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5">
              Financeiro &amp; Cobranças
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Controle separado de faturamento, valores efetivamente recebidos, pendentes, despesas e lucro líquido.
            </p>
          </div>

          <div className="flex items-center p-1 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[var(--g)] text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Visão Geral
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('received')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'received'
                  ? 'bg-[#16A36A] text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Receitas ({receivedJobs.length + revenues.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'expenses'
                  ? 'bg-[#DC4545] text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Despesas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-[#F59E0B] text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Cobranças ({pendingJobs.length})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VISÃO GERAL                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 5 Clear Financial Separation Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div
              onClick={() => setActiveTab('received')}
              className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-[#101D32] text-white border border-[#1E3254] shadow-md flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#94A3B8] font-bold uppercase">Efetivamente Recebido</span>
                <DollarSign className="w-4 h-4 text-[#4ADE80]" />
              </div>
              <strong className="text-xl sm:text-2xl font-extrabold font-mono-num my-2 block">
                {money(totalReceivedAll)}
              </strong>
              <span className="text-[10px] text-[#60A5FA]">Em caixa →</span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--muted)] font-bold uppercase">Faturamento Bruto</span>
                <Wallet className="w-4 h-4 text-[var(--g)]" />
              </div>
              <strong className="text-lg sm:text-xl font-extrabold font-mono-num my-2 text-[var(--ink)] block">
                {money(totalGrossBilling)}
              </strong>
              <span className="text-[10px] text-[var(--muted)]">Total produzido</span>
            </div>

            <div
              onClick={() => setActiveTab('pending')}
              className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col justify-between cursor-pointer hover:border-[#F59E0B]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--muted)] font-bold uppercase">A Receber</span>
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <strong className="text-lg sm:text-xl font-extrabold font-mono-num my-2 text-[#F59E0B] block">
                {money(totalPendingAll)}
              </strong>
              <span className="text-[10px] text-[#F59E0B] font-semibold">
                {pendingJobs.length} pendência(s) →
              </span>
            </div>

            <div
              onClick={() => setActiveTab('expenses')}
              className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col justify-between cursor-pointer hover:border-[#DC4545]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--muted)] font-bold uppercase">Despesas Pagas</span>
                <TrendingDown className="w-4 h-4 text-[#DC4545]" />
              </div>
              <strong className="text-lg sm:text-xl font-extrabold font-mono-num my-2 text-[#DC4545] block">
                {money(totalExpensesPaid)}
              </strong>
              <span className="text-[10px] text-[var(--muted)]">
                {totalStandalonePlannedExpenses > 0
                  ? `+ ${money(totalStandalonePlannedExpenses)} previstas`
                  : 'Custos operacionais'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--muted)] font-bold uppercase">Lucro Líquido Real</span>
                <TrendingUp className="w-4 h-4 text-[#16A36A]" />
              </div>
              <strong
                className={`text-lg sm:text-xl font-extrabold font-mono-num my-2 block ${
                  globalNetProfit >= 0 ? 'text-[#16A36A]' : 'text-[#DC4545]'
                }`}
              >
                {money(globalNetProfit)}
              </strong>
              <span className="text-[10px] text-[var(--muted)]">Recebido − Despesas</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('received');
                setShowRevenueForm(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#16A36A] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Receita Avulsa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('expenses');
                setShowExpenseForm(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#DC4545] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Despesa</span>
            </button>
          </div>

          {/* Monthly Statement */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--g)]">
                  Fechamento Mensal
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-[var(--ink)]">
                  Demonstrativo de Resultados do Mês
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-xs font-bold text-[var(--ink)]"
                />
                <button
                  type="button"
                  onClick={() => onOpenReportPrint(selectedMonth)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-xs font-bold text-[var(--g)] hover:bg-[var(--line)] transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-[var(--line)] text-xs">
              <div className="flex justify-between py-2.5">
                <span className="text-[var(--muted)]">Serviços recebidos no mês</span>
                <b className="font-mono-num text-[var(--ink)]">{money(monthServicePaid)}</b>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-[var(--muted)]">Vale-transporte recebido</span>
                <b className="font-mono-num text-[var(--ink)]">{money(monthTransportPaid)}</b>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-[var(--muted)]">Receitas avulsas recebidas</span>
                <b className="font-mono-num text-[var(--ink)]">{money(monthRevReceived)}</b>
              </div>
              <div className="flex justify-between py-2.5 font-bold">
                <span className="text-[var(--ink)]">Total efetivamente recebido no mês</span>
                <b className="font-mono-num text-[#16A36A] text-sm">{money(monthTotalReceived)}</b>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-[var(--muted)]">Valores pendentes do mês</span>
                <b className="font-mono-num text-[#F59E0B]">{money(monthPending)}</b>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-[var(--muted)]">Despesas pagas no mês</span>
                <b className="font-mono-num text-[#DC4545]">- {money(monthExpensesPaid)}</b>
              </div>
              <div className="flex justify-between py-3 font-extrabold bg-[var(--cream)] px-3.5 rounded-xl mt-2">
                <span className="text-[var(--ink)] text-sm">Lucro Líquido do Mês</span>
                <b
                  className={`font-mono-num text-base ${
                    monthNetBalance >= 0 ? 'text-[#16A36A]' : 'text-[#DC4545]'
                  }`}
                >
                  {money(monthNetBalance)}
                </b>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RECEITAS (TRABALHOS + AVULSAS)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'received' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-[var(--ink)]">
                Receitas &amp; Pagamentos Recebidos
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Total recebido: <b className="text-[#16A36A]">{money(totalReceivedAll)}</b>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRevenueForm(!showRevenueForm)}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#16A36A] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {showRevenueForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showRevenueForm ? 'Fechar Formulário' : 'Nova Receita Avulsa'}</span>
            </button>
          </div>

          {showRevenueForm && (
            <form
              onSubmit={handleSaveRevenueSubmit}
              className="p-5 rounded-3xl bg-[var(--paper)] border-2 border-[#16A36A] shadow-md space-y-4 text-xs"
            >
              <h4 className="font-bold text-sm text-[var(--ink)]">Registrar Receita Avulsa</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold mb-1">Descrição *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Consultoria rápida, venda de peça, comissão"
                    value={revForm.description}
                    onChange={(e) => setRevForm({ ...revForm, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={revForm.amount || ''}
                    onChange={(e) => setRevForm({ ...revForm, amount: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={revForm.date}
                    onChange={(e) => setRevForm({ ...revForm, date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Categoria</label>
                  <select
                    value={revForm.category}
                    onChange={(e) => setRevForm({ ...revForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  >
                    {revenueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Criar Nova Categoria (opcional)</label>
                  <input
                    type="text"
                    placeholder="Nome da nova categoria"
                    value={newRevCategory}
                    onChange={(e) => setNewRevCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Forma de Pagamento</label>
                  <select
                    value={revForm.paymentMethod}
                    onChange={(e) => setRevForm({ ...revForm, paymentMethod: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Boleto">Boleto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Status</label>
                  <select
                    value={revForm.status}
                    onChange={(e) =>
                      setRevForm({ ...revForm, status: e.target.value as 'received' | 'pending' })
                    }
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  >
                    <option value="received">Recebido</option>
                    <option value="pending">Pendente (A receber)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Cliente Vinculado</label>
                  <select
                    value={revForm.clientId || ''}
                    onChange={(e) => setRevForm({ ...revForm, clientId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  >
                    <option value="">Nenhum</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRevenueForm(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--line)] text-[var(--muted)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#16A36A] text-white font-bold cursor-pointer"
                >
                  Salvar Receita
                </button>
              </div>
            </form>
          )}

          {/* Standalone Revenues List */}
          {revenues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--g)]">
                Receitas Avulsas Registradas ({revenues.length})
              </h4>
              {revenues.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-[var(--ink)]">{r.description}</strong>
                      <span className="px-2 py-0.5 rounded-md bg-[var(--sage)] text-[var(--g)] text-[10px] font-bold">
                        {r.category}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {dateLabel(r.date)} · {r.paymentMethod} ·{' '}
                      {r.status === 'received' ? 'Recebido' : 'Pendente'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <strong className="font-mono text-sm font-bold text-[#16A36A]">
                      {money(r.amount)}
                    </strong>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Excluir esta receita avulsa?')) {
                          onDeleteRevenue?.(r.id);
                        }
                      }}
                      className="p-1.5 text-[#DC4545] hover:bg-[#DC4545]/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Job Payments List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Pagamentos Recebidos de Trabalhos ({receivedJobs.length})
            </h4>
            {receivedJobs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--muted)]">
                Nenhum pagamento de trabalho registrado ainda.
              </div>
            ) : (
              receivedJobs.map((j) => {
                const paidVal = calculatePaid(j);
                const transportPaid = j.transportstatus === 'paid' ? Number(j.transport) || 0 : 0;
                const cName = getClientName(j.clientId);
                return (
                  <div
                    key={j.id}
                    className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-[var(--ink)]">{j.profession}</strong>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#16A36A]/15 text-[#16A36A]">
                          Pago
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {cName || j.place} · Realizado em {dateLabel(j.date)}
                        {j.paydate ? ` · Pago em ${dateLabel(j.paydate)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <strong className="font-mono text-base font-extrabold text-[#16A36A]">
                        {money(paidVal + transportPaid)}
                      </strong>
                      <button
                        type="button"
                        onClick={() => onViewReceipt(j)}
                        className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-xs font-bold text-[var(--ink)] flex items-center gap-1 cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5 text-[var(--g)]" />
                        <span>Recibo</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DESPESAS (CATEGORIZADAS + TRABALHOS)                               */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-[var(--ink)]">
                Controle de Despesas Profissionais
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Total pago: <b className="text-[#DC4545]">{money(totalExpensesPaid)}</b>
                {totalStandalonePlannedExpenses > 0 &&
                  ` · Previstas: ${money(totalStandalonePlannedExpenses)}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowExpenseForm(!showExpenseForm)}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#DC4545] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {showExpenseForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showExpenseForm ? 'Fechar Formulário' : 'Nova Despesa'}</span>
            </button>
          </div>

          {showExpenseForm && (
            <form
              onSubmit={handleSaveExpenseSubmit}
              className="p-5 rounded-3xl bg-[var(--paper)] border-2 border-[#DC4545] shadow-md space-y-4 text-xs"
            >
              <h4 className="font-bold text-sm text-[var(--ink)]">Registrar Despesa Profissional</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold mb-1">Descrição *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Abastecimento veículo, compra de ferramenta, internet"
                    value={expForm.description}
                    onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={expForm.amount || ''}
                    onChange={(e) => setExpForm({ ...expForm, amount: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={expForm.date}
                    onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Categoria *</label>
                  <select
                    value={expForm.category}
                    onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  >
                    {expenseCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Criar Nova Categoria (opcional)</label>
                  <input
                    type="text"
                    placeholder="Nome da nova categoria"
                    value={newExpCategory}
                    onChange={(e) => setNewExpCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Forma de Pagamento</label>
                  <select
                    value={expForm.paymentMethod}
                    onChange={(e) => setExpForm({ ...expForm, paymentMethod: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Débito Automático">Débito Automático</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Situação da Despesa</label>
                  <select
                    value={expForm.status || 'paid'}
                    onChange={(e) =>
                      setExpForm({ ...expForm, status: e.target.value as 'paid' | 'planned' })
                    }
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  >
                    <option value="paid">Despesa Paga</option>
                    <option value="planned">Despesa Prevista (A pagar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Trabalho Relacionado (opcional)</label>
                  <select
                    value={expForm.jobId || ''}
                    onChange={(e) => setExpForm({ ...expForm, jobId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  >
                    <option value="">Nenhum</option>
                    {jobs.slice(0, 30).map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.profession} - {j.place} ({dateLabel(j.date)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseForm(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--line)] text-[var(--muted)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#DC4545] text-white font-bold cursor-pointer"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          )}

          {/* Standalone Expenses List */}
          <div className="space-y-2.5">
            {expenses.length === 0 && activeJobs.filter((j) => j.expenses > 0).length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--muted)]">
                Nenhuma despesa registrada até o momento.
              </div>
            ) : (
              <>
                {expenses.map((e) => (
                  <div
                    key={e.id}
                    className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-[var(--ink)]">{e.description}</strong>
                        <span className="px-2 py-0.5 rounded-md bg-[#DC4545]/10 text-[#DC4545] text-[10px] font-bold">
                          {e.category}
                        </span>
                        {e.status === 'planned' && (
                          <span className="px-2 py-0.5 rounded-md bg-[#F59E0B]/15 text-[#F59E0B] text-[10px] font-bold">
                            Prevista
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {dateLabel(e.date)} · {e.paymentMethod}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <strong className="font-mono text-sm font-bold text-[#DC4545]">
                        - {money(e.amount)}
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Excluir esta despesa?')) {
                            onDeleteExpense?.(e.id);
                          }
                        }}
                        className="p-1.5 text-[#DC4545] hover:bg-[#DC4545]/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {activeJobs
                  .filter((j) => Number(j.expenses) > 0)
                  .map((j) => (
                    <div
                      key={`job-exp-${j.id}`}
                      className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-[var(--ink)]">
                            {j.expenseNote || `Despesa do serviço: ${j.profession}`}
                          </strong>
                          <span className="px-2 py-0.5 rounded-md bg-[var(--cream)] border border-[var(--line)] text-[10px] font-semibold text-[var(--muted)]">
                            Vinculada ao trabalho
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {dateLabel(j.date)} · Local: {j.place}
                        </p>
                      </div>
                      <strong className="font-mono text-sm font-bold text-[#DC4545]">
                        - {money(j.expenses)}
                      </strong>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONTROLE DE COBRANÇAS (A RECEBER, ATRASADOS, VENCIMENTOS)          */}
      {/* ========================================================================= */}
      {activeTab === 'pending' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Sub-filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: `A Receber (${pendingJobs.length})` },
                {
                  id: 'overdue',
                  label: `Atrasados (${
                    pendingJobs.filter((j) => j.dueDate && j.dueDate < today()).length
                  })`,
                },
                { id: 'upcoming', label: 'Próximos Vencimentos' },
                { id: 'paid', label: `Recebidos (${receivedJobs.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCollectionSubFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    collectionSubFilter === tab.id
                      ? 'bg-[var(--g)] text-white'
                      : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Filtrar por cliente ou local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)]"
              />
              <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-2.5" />
            </div>
          </div>

          {filteredCollectionJobs.length === 0 ? (
            <div className="p-8 text-center rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--muted)]">
              Nenhum registro encontrado para este filtro de cobrança.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredCollectionJobs.map((j) => {
                const dueVal = calculateDueAll(j);
                const isOverdue = j.dueDate && j.dueDate < today() && dueVal > 0.01;
                const cName = getClientName(j.clientId);

                return (
                  <div
                    key={j.id}
                    className={`p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isOverdue ? 'border-[#DC4545]/60' : 'border-[var(--line)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-sm font-bold text-[var(--ink)]">{j.profession}</h5>
                        <span className="text-xs text-[var(--muted)]">· {dateLabel(j.date)}</span>
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded-full bg-[#DC4545]/15 text-[#DC4545] text-[10px] font-bold">
                            Vencido em {dateLabel(j.dueDate!)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-1">
                        Cliente/Local: <b className="text-[var(--ink)]">{cName || j.place}</b>
                        {j.dueDate && !isOverdue ? ` · Vencimento: ${dateLabel(j.dueDate)}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]">
                      <strong className="font-mono text-base font-extrabold text-[#F59E0B]">
                        {money(dueVal > 0 ? dueVal : calculatePaid(j))}
                      </strong>

                      {dueVal > 0.01 && (
                        <button
                          type="button"
                          onClick={() => handleOpenBillingReminder(j)}
                          className="px-3 py-1.5 rounded-xl bg-[#16A36A]/15 text-[#16A36A] hover:bg-[#16A36A] hover:text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Enviar lembrete de cobrança via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Cobrar no WhatsApp</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onEditJob(j)}
                        className="px-3 py-1.5 rounded-xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Dar Baixa</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Collection Reminder Modal */}
      {billingTargetJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 bg-[#16A36A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <h3 className="text-sm font-extrabold">Enviar Lembrete de Cobrança via WhatsApp</h3>
              </div>
              <button
                type="button"
                onClick={() => setBillingTargetJob(null)}
                className="p-1 rounded-lg bg-white/15 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <label className="block font-bold text-[var(--ink)]">
                Mensagem de cobrança (você pode editar antes de enviar):
              </label>
              <textarea
                rows={6}
                value={billingMessage}
                onChange={(e) => setBillingMessage(e.target.value)}
                className="w-full p-3 rounded-xl border border-[var(--line)] bg-[var(--cream)]/50 text-[var(--ink)] leading-relaxed"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBillingTargetJob(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--line)] text-[var(--muted)] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendBillingWhatsApp}
                  className="px-5 py-2 rounded-xl bg-[#16A36A] text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar no WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
