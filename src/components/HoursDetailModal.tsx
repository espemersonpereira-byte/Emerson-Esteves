import React, { useMemo, useState } from 'react';
import {
  X,
  ArrowLeft,
  Clock,
  Calendar,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Receipt,
  Edit2,
  CalendarDays,
  Filter,
} from 'lucide-react';
import { Job, Client } from '../types';
import {
  hlabel,
  dateLabel,
  calculateHours,
  currentMonth,
  today,
} from '../utils';

interface HoursDetailModalProps {
  jobs: Job[];
  clients: Client[];
  onClose: () => void;
  onEditJob: (job: Job) => void;
  onViewReceipt: (job: Job) => void;
}

export const HoursDetailModal: React.FC<HoursDetailModalProps> = ({
  jobs,
  clients,
  onClose,
  onEditJob,
  onViewReceipt,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  // Total accumulated hours
  const totalHoursWorked = useMemo(() => {
    return jobs.reduce(
      (s, j) => s + calculateHours(j) + (Number(j.extraHours) || 0),
      0
    );
  }, [jobs]);

  // Distinct days
  const distinctDays = useMemo(() => {
    return new Set(jobs.map((j) => j.date)).size;
  }, [jobs]);

  // Daily average
  const avgHoursPerDay = distinctDays > 0 ? totalHoursWorked / distinctDays : 0;

  // Current month hours
  const thisMonthKey = currentMonth();
  const currentMonthHours = useMemo(() => {
    return jobs
      .filter((j) => j.date.startsWith(thisMonthKey))
      .reduce((s, j) => s + calculateHours(j) + (Number(j.extraHours) || 0), 0);
  }, [jobs, thisMonthKey]);

  // Week hours (last 7 days from today)
  const currentWeekHours = useMemo(() => {
    const d = new Date();
    const dayOfWeek = d.getDay(); // 0 is Sunday
    // Start of current week (Sunday)
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);
    const sundayStr = sunday.toISOString().slice(0, 10);

    return jobs
      .filter((j) => j.date >= sundayStr && j.date <= today())
      .reduce((s, j) => s + calculateHours(j) + (Number(j.extraHours) || 0), 0);
  }, [jobs]);

  // Grouping hours by month
  const monthlyStats = useMemo(() => {
    const map = new Map<string, { totalHours: number; count: number }>();
    jobs.forEach((j) => {
      const month = j.date.slice(0, 7);
      const h = calculateHours(j) + (Number(j.extraHours) || 0);
      const cur = map.get(month) || { totalHours: 0, count: 0 };
      map.set(month, {
        totalHours: cur.totalHours + h,
        count: cur.count + 1,
      });
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, data]) => ({ month, ...data }));
  }, [jobs]);

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    return jobs
      .filter((j) => (selectedMonth ? j.date.startsWith(selectedMonth) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [jobs, selectedMonth]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[var(--paper)] border border-[var(--line)] rounded-3xl shadow-2xl text-[var(--ink)] flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top bar with back button */}
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--cream)]/60">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar para o início</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Header titles */}
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--g)] text-white flex items-center justify-center shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--copper)] block">
                  Produtividade & Escalas
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
                  Detalhamento de Horas Trabalhadas
                </h2>
              </div>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1.5">
              Resumo cronológico de turnos, jornada diária, semanal e mensal de todos os trabalhos registrados.
            </p>
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Total Accumulated */}
            <div className="p-3.5 rounded-2xl bg-[var(--g)] text-white shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-medium text-emerald-100 flex items-center justify-between">
                Total Geral
                <Clock className="w-3.5 h-3.5 text-emerald-200" />
              </span>
              <strong className="text-lg sm:text-xl font-bold font-mono-num mt-2 mb-0.5 block">
                {hlabel(totalHoursWorked).replace(' 00min', '')}
              </strong>
              <span className="text-[10px] text-emerald-100">
                {distinctDays} dia{distinctDays !== 1 ? 's' : ''} ativo{distinctDays !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Daily Average */}
            <div className="p-3.5 rounded-2xl bg-[var(--cream)] border border-[var(--line)] shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[var(--muted)]">
                Média por Dia
              </span>
              <strong className="text-lg sm:text-xl font-bold font-mono-num mt-2 mb-0.5 text-[var(--ink)] block">
                {hlabel(avgHoursPerDay).replace(' 00min', '')}
              </strong>
              <span className="text-[10px] text-[var(--muted)]">Por dia trabalhado</span>
            </div>

            {/* Weekly Hours */}
            <div className="p-3.5 rounded-2xl bg-[var(--cream)] border border-[var(--line)] shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[var(--muted)]">
                Nesta Semana
              </span>
              <strong className="text-lg sm:text-xl font-bold font-mono-num mt-2 mb-0.5 text-[var(--copper)] block">
                {hlabel(currentWeekHours).replace(' 00min', '')}
              </strong>
              <span className="text-[10px] text-[var(--muted)]">Semana corrente</span>
            </div>

            {/* Monthly Hours */}
            <div className="p-3.5 rounded-2xl bg-[var(--cream)] border border-[var(--line)] shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[var(--muted)]">
                Neste Mês
              </span>
              <strong className="text-lg sm:text-xl font-bold font-mono-num mt-2 mb-0.5 text-[var(--ink)] block">
                {hlabel(currentMonthHours).replace(' 00min', '')}
              </strong>
              <span className="text-[10px] text-[var(--muted)]">{thisMonthKey}</span>
            </div>
          </div>

          {/* Monthly Breakdown Pills */}
          {monthlyStats.length > 1 && (
            <div className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)]">
              <span className="text-[11px] font-bold text-[var(--ink)] mb-2 block">
                Filtrar por Mês:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedMonth('')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    !selectedMonth
                      ? 'bg-[var(--g)] text-white shadow-xs'
                      : 'bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]'
                  }`}
                >
                  Todos ({hlabel(totalHoursWorked).replace(' 00min', '')})
                </button>
                {monthlyStats.map((ms) => (
                  <button
                    key={ms.month}
                    type="button"
                    onClick={() => setSelectedMonth(ms.month)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      selectedMonth === ms.month
                        ? 'bg-[var(--g)] text-white shadow-xs'
                        : 'bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]'
                    }`}
                  >
                    {ms.month} ({hlabel(ms.totalHours).replace(' 00min', '')})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* List of Jobs Contributing to Hours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-[var(--copper)]" />
                Histórico de Trabalhos e Horários ({filteredJobs.length})
              </h3>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--cream)] text-xs text-[var(--muted)]">
                Nenhum trabalho registrado para este período.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredJobs.map((j) => {
                  const netH = calculateHours(j);
                  const extraH = Number(j.extraHours) || 0;
                  const totalH = netH + extraH;
                  const clientName = clientMap.get(j.clientId);

                  return (
                    <div
                      key={j.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs hover:border-[var(--muted)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-[var(--ink)]">
                            {j.profession || 'Trabalho Freelancer'}
                          </span>
                          <span className="text-[11px] text-[var(--muted)]">
                            · {dateLabel(j.date)}
                          </span>
                        </div>

                        <div className="text-xs text-[var(--muted)] mt-1 flex items-center gap-2 flex-wrap">
                          <span>⌖ {j.place || 'Local não informado'}</span>
                          {clientName && <span>· ♙ {clientName}</span>}
                        </div>

                        {/* Schedule detail: start, end, break */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                          <span className="px-2 py-0.5 rounded-lg bg-[var(--cream)] border border-[var(--line)] font-mono text-[11px] text-[var(--ink)] font-medium">
                            🕒 {j.start || '00:00'} às {j.end || '00:00'}
                          </span>
                          {Number(j.break) > 0 && (
                            <span className="text-[11px] text-[var(--muted)]">
                              (Intervalo: {j.break}min)
                            </span>
                          )}
                          {extraH > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                              +{extraH}h extras
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side: total hours badge & actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]">
                        <div className="text-right">
                          <span className="text-sm font-bold font-mono text-[var(--g)] block">
                            {hlabel(totalH).replace(' 00min', '')}
                          </span>
                          <span className="text-[10px] text-[var(--muted)]">
                            {j.ratetype === 'hourly' ? 'Horista' : 'Fixo'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onViewReceipt(j);
                            }}
                            className="p-2 rounded-xl border border-[var(--line)] bg-[var(--cream)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                            title="Ver Comprovante"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onEditJob(j);
                            }}
                            className="p-2 rounded-xl border border-[var(--line)] bg-[var(--cream)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--g)] transition-colors cursor-pointer"
                            title="Editar Horários"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--line)] bg-[var(--cream)]/60 flex items-center justify-between text-xs text-[var(--muted)]">
          <span>FREELAS · Controle preciso de horas</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-xs font-bold hover:bg-[var(--cream)] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
