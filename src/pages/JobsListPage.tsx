import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  Edit2,
  Copy,
  Receipt,
  Trash2,
  Briefcase,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { Job, Client, PageId } from '../types';
import {
  money,
  dateLabel,
  calculateHours,
  calculateTotal,
  calculatePaid,
  calculateDue,
  getServiceStatus,
  hlabel,
  today,
} from '../utils';

interface JobsListPageProps {
  jobs: Job[];
  clients: Client[];
  initialSituation?: 'all' | 'completed' | 'in_progress' | 'future' | 'pending' | 'cancelled';
  onNavigateHome?: () => void;
  onNavigate: (page: PageId) => void;
  onEditJob: (job: Job) => void;
  onDuplicateJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onViewReceipt: (job: Job) => void;
}

export const JobsListPage: React.FC<JobsListPageProps> = ({
  jobs,
  clients,
  initialSituation = 'all',
  onNavigateHome,
  onNavigate,
  onEditJob,
  onDuplicateJob,
  onDeleteJob,
  onViewReceipt,
}) => {
  const [situationFilter, setSituationFilter] = useState<
    'all' | 'completed' | 'in_progress' | 'future' | 'pending' | 'cancelled'
  >(initialSituation);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [professionFilter, setProfessionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');

  useEffect(() => {
    if (initialSituation) {
      setSituationFilter(initialSituation);
    }
  }, [initialSituation]);

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const distinctProfessions = useMemo(() => {
    return Array.from(new Set(jobs.map((j) => j.profession).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
  }, [jobs]);

  const counts = useMemo(() => {
    const now = today();
    const completed = jobs.filter(
      (j) =>
        j.status === 'completed' ||
        (!j.status && calculateDue(j) < 0.01 && (j.transportstatus === 'paid' || Number(j.transport) === 0))
    ).length;
    const future = jobs.filter((j) => j.status === 'scheduled' || j.date > now).length;
    const inProgress = jobs.filter(
      (j) =>
        j.status === 'in_progress' ||
        j.status === 'waiting_approval' ||
        j.status === 'quote' ||
        (!j.status && j.date <= now && (calculateDue(j) > 0.009 || j.transportstatus !== 'paid'))
    ).length;
    const pending = jobs.filter(
      (j) =>
        j.status !== 'cancelled' &&
        (calculateDue(j) > 0.009 || (j.transportstatus !== 'paid' && Number(j.transport) > 0))
    ).length;
    const cancelled = jobs.filter((j) => j.status === 'cancelled').length;
    return { all: jobs.length, completed, future, inProgress, pending, cancelled };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = search.toLowerCase().trim();
    const now = today();

    return jobs
      .filter((j) => {
        if (situationFilter === 'completed') {
          const isComp =
            j.status === 'completed' ||
            (!j.status && calculateDue(j) < 0.01 && (j.transportstatus === 'paid' || Number(j.transport) === 0));
          if (!isComp) return false;
        } else if (situationFilter === 'in_progress') {
          const inProg =
            j.status === 'in_progress' ||
            j.status === 'waiting_approval' ||
            j.status === 'quote' ||
            (!j.status && j.date <= now && (calculateDue(j) > 0.009 || j.transportstatus !== 'paid'));
          if (!inProg) return false;
        } else if (situationFilter === 'future') {
          if (j.status !== 'scheduled' && j.date <= now) return false;
        } else if (situationFilter === 'pending') {
          const hasDue =
            j.status !== 'cancelled' &&
            (calculateDue(j) > 0.009 || (j.transportstatus !== 'paid' && Number(j.transport) > 0));
          if (!hasDue) return false;
        } else if (situationFilter === 'cancelled') {
          if (j.status !== 'cancelled') return false;
        }

        if (monthFilter && !j.date.startsWith(monthFilter)) return false;
        if (professionFilter && j.profession !== professionFilter) return false;
        if (statusFilter !== 'all') {
          const st = getServiceStatus(j);
          if (st !== statusFilter) return false;
        }
        if (q) {
          const clientName = clientMap.get(j.clientId) || '';
          const haystack = `${j.profession} ${j.place} ${j.task} ${clientName} ${j.notes} ${j.materials || ''}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [jobs, search, monthFilter, professionFilter, statusFilter, situationFilter, clientMap]);

  const summary = useMemo(() => {
    const count = filteredJobs.length;
    const totalHours = filteredJobs.reduce(
      (s, j) => s + calculateHours(j) + (Number(j.extraHours) || 0),
      0
    );
    const sumService = filteredJobs.reduce((s, j) => s + calculateTotal(j), 0);
    const sumPaid = filteredJobs.reduce((s, j) => s + calculatePaid(j), 0);
    const sumTransportPaid = filteredJobs.reduce(
      (s, j) => s + (j.transportstatus === 'paid' ? Number(j.transport) || 0 : 0),
      0
    );
    const sumTransportDue = filteredJobs.reduce(
      (s, j) => s + (j.transportstatus === 'paid' ? 0 : Number(j.transport) || 0),
      0
    );

    return {
      count,
      totalHours,
      sumService,
      sumPaid,
      sumTransportPaid,
      sumTransportDue,
    };
  }, [filteredJobs]);

  const handleClearFilters = () => {
    setSearch('');
    setMonthFilter('');
    setProfessionFilter('');
    setStatusFilter('all');
    setSituationFilter('all');
  };

  const hasActiveFilters = Boolean(
    search || monthFilter || professionFilter || statusFilter !== 'all' || situationFilter !== 'all'
  );

  const getWorkflowBadge = (status?: Job['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
            ✓ Concluído
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
            ● Em andamento
          </span>
        );
      case 'scheduled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
            📅 Agendado
          </span>
        );
      case 'waiting_approval':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
            ⏳ Aguardando aprovação
          </span>
        );
      case 'quote':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">
            📄 Orçamento
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
            ✕ Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
              Gestão Operacional
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5">
              Trabalhos e Serviços
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Acompanhe todos os serviços, status de execução, horas trabalhadas, valores e recibos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('new')}
            className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Trabalho</span>
          </button>
        </div>
      </div>

      {/* Situation Quick Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setSituationFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            situationFilter === 'all'
              ? 'bg-[var(--g)] text-white shadow-xs'
              : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          Todos ({counts.all})
        </button>
        <button
          type="button"
          onClick={() => setSituationFilter('completed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            situationFilter === 'completed'
              ? 'bg-[#16A36A] text-white shadow-xs'
              : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          ✓ Concluídos ({counts.completed})
        </button>
        <button
          type="button"
          onClick={() => setSituationFilter('in_progress')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            situationFilter === 'in_progress'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          ● Em andamento ({counts.inProgress})
        </button>
        <button
          type="button"
          onClick={() => setSituationFilter('future')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            situationFilter === 'future'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          📅 Agendados ({counts.future})
        </button>
        <button
          type="button"
          onClick={() => setSituationFilter('pending')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            situationFilter === 'pending'
              ? 'bg-[#F59E0B] text-white shadow-xs'
              : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          ⚠️ Pagto Pendente ({counts.pending})
        </button>
        {counts.cancelled > 0 && (
          <button
            type="button"
            onClick={() => setSituationFilter('cancelled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              situationFilter === 'cancelled'
                ? 'bg-[#DC4545] text-white shadow-xs'
                : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            ✕ Cancelados ({counts.cancelled})
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">Buscar</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cliente, local, serviço, material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
              <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">Mês</label>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">Serviço / Profissão</label>
            <select
              value={professionFilter}
              onChange={(e) => setProfessionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
            >
              <option value="">Todos os serviços</option>
              {distinctProfessions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">Situação Financeira</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'partial' | 'paid')}
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendente</option>
              <option value="partial">Parcial</option>
              <option value="paid">Pago</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[#DC4545] font-semibold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar todos os filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary Line */}
      <div className="p-3.5 rounded-2xl bg-[var(--cream)] border border-[var(--line)] text-xs text-[var(--muted)] flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-[var(--ink)]">
          {summary.count} serviço{summary.count !== 1 ? 's' : ''} · {hlabel(summary.totalHours)}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            Faturado: <strong className="font-mono-num text-[var(--ink)]">{money(summary.sumService)}</strong>
          </span>
          <span>
            Recebido: <strong className="font-mono-num text-[#16A36A]">{money(summary.sumPaid)}</strong>
          </span>
          <span>
            Transporte: <strong className="font-mono-num text-[var(--ink)]">{money(summary.sumTransportPaid + summary.sumTransportDue)}</strong>
          </span>
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)]">
          <Briefcase className="w-12 h-12 mx-auto mb-3 text-[var(--muted)] opacity-50" />
          <h4 className="text-base font-bold text-[var(--ink)] mb-1">Nenhum trabalho encontrado</h4>
          <p className="text-xs text-[var(--muted)] max-w-sm mx-auto mb-4">
            Ajuste os filtros acima ou cadastre um novo trabalho.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-xs font-bold text-[var(--g)] cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredJobs.map((j) => {
            const status = getServiceStatus(j);
            const totalVal = calculateTotal(j);
            const paidVal = calculatePaid(j);
            const dueVal = calculateDue(j);
            const netHours = calculateHours(j) + (Number(j.extraHours) || 0);
            const clientName = clientMap.get(j.clientId);
            const isOverdue = j.dueDate && dueVal > 0.01 && j.dueDate < today();

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
                      {getWorkflowBadge(j.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)] mt-1">
                      <span>⌖ {j.place}</span>
                      {clientName && <span>♙ {clientName}</span>}
                      <span>◷ {hlabel(netHours)}</span>
                      {j.task && <span className="truncate max-w-[240px]">✦ {j.task}</span>}
                    </div>
                    {j.materials && (
                      <div className="text-[11px] text-[var(--muted)] mt-1">
                        🔧 Materiais: {j.materials}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <strong className="text-base font-bold font-mono-num text-[var(--ink)] block">
                      {money(totalVal)}
                    </strong>
                    <span className="text-[10px] text-[var(--muted)]">serviço</span>
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
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {status === 'paid' ? 'Pago' : status === 'partial' ? 'Parcial' : 'Pendente'}
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">
                        Serviço: {money(paidVal)} pago · {money(dueVal)} pendente
                      </span>
                    </div>

                    <div className="text-[11px] text-[var(--muted)] mt-1">
                      Transporte: {money(j.transport)} ({j.transportstatus === 'paid' ? 'recebido' : 'pendente'})
                      {j.expenses > 0 && ` · Despesas: ${money(j.expenses)}`}
                      {j.dueDate && dueVal > 0.01 && (
                        <span className={isOverdue ? 'font-bold text-[#DC4545] ml-2' : 'ml-2'}>
                          · Vence: {dateLabel(j.dueDate)} {isOverdue ? '(ATRASADO)' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => onEditJob(j)}
                      className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--cream)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateJob(j)}
                      className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--cream)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Duplicar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewReceipt(j)}
                      className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--g)] hover:bg-[var(--sage)] text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Recibo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteJob(j.id)}
                      className="p-1.5 sm:px-2 sm:py-1 rounded-lg border border-transparent text-[#DC4545] hover:bg-[#DC4545]/10 text-xs cursor-pointer"
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
  );
};
