import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  Calendar,
  Layers,
  ChevronRight,
  CheckCircle2,
  DollarSign,
  Car,
} from 'lucide-react';
import { Job, Client } from '../types';
import {
  money,
  dateLabel,
  currentMonth,
  calculatePaymentForMonth,
  calculatePaid,
} from '../utils';

export type ReceivedPeriodTab = 'current' | 'custom' | 'all';

interface TotalReceivedModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  clients: Client[];
  onOpenJob?: (job: Job) => void;
}

export const TotalReceivedModal: React.FC<TotalReceivedModalProps> = ({
  isOpen,
  onClose,
  jobs,
  clients,
  onOpenJob,
}) => {
  const [activeTab, setActiveTab] = useState<ReceivedPeriodTab>('current');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentMonth());

  const getClientName = (id?: string) => {
    if (!id) return '';
    return clients.find((c) => c.id === id)?.name || '';
  };

  // Build month options for selector (last 24 months + future months with data)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonth());

    jobs.forEach((j) => {
      if (j.paydate) monthsSet.add(j.paydate.slice(0, 7));
      if (j.transportDate) monthsSet.add(j.transportDate.slice(0, 7));
      if (j.date) monthsSet.add(j.date.slice(0, 7));
    });

    return Array.from(monthsSet).sort().reverse();
  }, [jobs]);

  // Compute records and totals based on active tab
  const analysis = useMemo(() => {
    const thisMonth = currentMonth();
    const targetMonth = activeTab === 'current' ? thisMonth : selectedMonth;

    if (activeTab === 'current' || activeTab === 'custom') {
      const breakdown = jobs
        .map((j) => {
          const { servicePaid, transportPaid, totalReceived } = calculatePaymentForMonth(
            j,
            targetMonth
          );
          return {
            job: j,
            servicePaid,
            transportPaid,
            totalReceived,
            effectiveDate: j.paydate || j.transportDate || j.date,
          };
        })
        .filter((item) => item.totalReceived > 0)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

      const totalService = breakdown.reduce((sum, i) => sum + i.servicePaid, 0);
      const totalTransport = breakdown.reduce((sum, i) => sum + i.transportPaid, 0);
      const grandTotal = totalService + totalTransport;

      return {
        items: breakdown,
        totalService,
        totalTransport,
        grandTotal,
        count: breakdown.length,
        label:
          activeTab === 'current'
            ? `Mês Atual (${formatMonthLabel(thisMonth)})`
            : `Mês Selecionado (${formatMonthLabel(selectedMonth)})`,
      };
    }

    // Tab 'all' - Todo o período
    const breakdown = jobs
      .map((j) => {
        // Exclude completely cancelled jobs with 0 paid
        if (j.status === 'cancelled' && (Number(j.paid) || 0) <= 0 && j.transportstatus !== 'paid') {
          return { job: j, servicePaid: 0, transportPaid: 0, totalReceived: 0, effectiveDate: j.date };
        }
        const servicePaid = calculatePaid(j);
        const transportPaid = j.transportstatus === 'paid' ? Number(j.transport) || 0 : 0;
        const totalReceived = servicePaid + transportPaid;
        return {
          job: j,
          servicePaid,
          transportPaid,
          totalReceived,
          effectiveDate: j.paydate || j.transportDate || j.date,
        };
      })
      .filter((item) => item.totalReceived > 0)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

    const totalService = breakdown.reduce((sum, i) => sum + i.servicePaid, 0);
    const totalTransport = breakdown.reduce((sum, i) => sum + i.transportPaid, 0);
    const grandTotal = totalService + totalTransport;

    return {
      items: breakdown,
      totalService,
      totalTransport,
      grandTotal,
      count: breakdown.length,
      label: 'Todo o Período Histórico',
    };
  }, [jobs, activeTab, selectedMonth]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[var(--g)] text-white flex items-center justify-center shadow-xs shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-[var(--ink)] tracking-tight">
                Total Recebido
              </h3>
              <p className="text-[11px] text-[var(--muted)] truncate">
                Consulta financeira e extrato de recebimentos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--cream)] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: 1. Mês Atual, 2. Escolher Mês, 3. Todo o Período */}
        <div className="p-3 sm:px-5 border-b border-[var(--line)] bg-[var(--cream)]/40 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('current')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-[var(--g)] text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Mês Atual</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-[var(--g)] text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Escolher Mês</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[var(--g)] text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Todo o Período</span>
            </button>
          </div>

          {/* If 'custom' is active, show the month picker dropdown */}
          {activeTab === 'custom' && (
            <div className="mt-2.5 flex items-center gap-2">
              <label htmlFor="custom-month-select" className="text-[11px] font-bold text-[var(--ink)] shrink-0">
                Selecionar Mês:
              </label>
              <select
                id="custom-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold focus:outline-hidden focus:border-[var(--copper)]"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Main Grand Total Banner */}
          <div className="p-4 rounded-2xl bg-[var(--g)] text-white shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between text-xs text-emerald-100 mb-1">
                <span className="font-medium">{analysis.label}</span>
                <span className="font-semibold bg-emerald-950/40 px-2 py-0.5 rounded-full text-[10px]">
                  {analysis.count} {analysis.count === 1 ? 'recebimento' : 'recebimentos'}
                </span>
              </div>
              <strong className="text-2xl sm:text-3xl font-bold font-mono-num tracking-tight block my-1">
                {money(analysis.grandTotal)}
              </strong>
              <div className="pt-2 mt-2 border-t border-emerald-500/30 grid grid-cols-2 gap-2 text-[11px] text-emerald-100">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>Serviços: <strong>{money(analysis.totalService)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>Transporte: <strong>{money(analysis.totalTransport)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* List of Payments */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
              Extrato detalhado de recebimentos
            </h4>

            {analysis.items.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--cream)]/30">
                <p className="text-xs text-[var(--muted)]">
                  Nenhum pagamento registrado com data de recebimento neste período.
                </p>
                <p className="text-[11px] text-[var(--muted)]/70 mt-1">
                  Valores marcados como 'A receber' ou pendentes aparecem na aba Financeiro.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {analysis.items.map(({ job, servicePaid, transportPaid, totalReceived, effectiveDate }) => {
                  const clientName = getClientName(job.clientId);
                  return (
                    <div
                      key={job.id}
                      onClick={() => onOpenJob && onOpenJob(job)}
                      className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--copper)]/70 transition-all flex items-center justify-between gap-3 text-xs shadow-2xs cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--ink)] truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{job.profession}</span>
                          {clientName && (
                            <span className="text-[11px] font-normal text-[var(--muted)] truncate">
                              · {clientName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--muted)] mt-0.5">
                          <span>Pago em: {dateLabel(effectiveDate)}</span>
                          {job.method && (
                            <span className="px-1.5 py-0.2 rounded-md bg-[var(--cream)] border border-[var(--line)] font-medium">
                              {job.method}
                            </span>
                          )}
                        </div>
                        {(servicePaid > 0 && transportPaid > 0) && (
                          <div className="text-[10px] text-[var(--muted)] mt-0.5">
                            Serviço: {money(servicePaid)} · Transporte: {money(transportPaid)}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <strong className="text-sm font-bold font-mono-num text-emerald-700 dark:text-emerald-400 block">
                          {money(totalReceived)}
                        </strong>
                        <span className="text-[10px] text-[var(--muted)] group-hover:text-[var(--copper)] flex items-center justify-end gap-0.5">
                          Ver trabalho <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-5 border-t border-[var(--line)] bg-[var(--paper)] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--cream)] border border-[var(--line)] text-[var(--ink)] text-xs font-bold hover:bg-[var(--line)] transition-colors cursor-pointer"
          >
            Fechar visualização
          </button>
        </div>
      </div>
    </div>
  );
};

function formatMonthLabel(yearMonth: string): string {
  if (!yearMonth || !yearMonth.includes('-')) return yearMonth;
  const [y, m] = yearMonth.split('-').map(Number);
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${months[m - 1] || ''} de ${y}`;
}
