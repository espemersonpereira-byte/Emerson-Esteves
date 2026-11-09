import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Target,
  Award,
  Users,
  DollarSign,
  TrendingDown,
  BarChart3,
  Save,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Database, Prefs } from '../types';
import {
  money,
  currentMonth,
  calculateTotal,
  calculateMonthReceivedTotal,
} from '../utils';

interface BusinessPageProps {
  db: Database;
  onSavePrefs: (prefs: Prefs) => void;
  onShowToast?: (msg: string) => void;
}

export const BusinessPage: React.FC<BusinessPageProps> = ({
  db,
  onSavePrefs,
  onShowToast,
}) => {
  const jobs = (db.jobs || []).filter((j) => j.status !== 'cancelled');
  const revenues = db.revenues || [];
  const expenses = db.expenses || [];
  const prefs = db.prefs;

  const currentYear = String(new Date().getFullYear());
  const currentMonthStr = currentMonth();

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [monthlyGoalInput, setMonthlyGoalInput] = useState<number>(Number(prefs.goal) || 0);
  const [annualGoalInput, setAnnualGoalInput] = useState<number>(Number(prefs.annualGoal) || 0);

  // Previous month string for period comparison
  const prevMonthStr = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  // Helper to compute metrics for a given YYYY-MM or YYYY prefix
  const computePeriodMetrics = (prefix: string) => {
    const pJobs = jobs.filter((j) => j.date.startsWith(prefix));
    const pRevs = revenues.filter((r) => r.date.startsWith(prefix));
    const pExps = expenses.filter((e) => e.date.startsWith(prefix) && e.status !== 'planned');

    const grossBilling =
      pJobs.reduce((s, j) => s + calculateTotal(j) + (Number(j.transport) || 0), 0) +
      pRevs.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    // Strictly received amounts
    const receivedFromJobs =
      prefix.length === 7
        ? calculateMonthReceivedTotal(jobs, prefix)
        : pJobs.reduce(
            (s, j) =>
              s +
              (Number(j.paid) || 0) +
              (j.transportstatus === 'paid' ? Number(j.transport) || 0 : 0),
            0
          );

    const receivedFromRevs = pRevs
      .filter((r) => r.status === 'received')
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const totalReceived = receivedFromJobs + receivedFromRevs;

    const totalExpenses =
      pJobs.reduce((s, j) => s + (Number(j.expenses) || 0), 0) +
      pExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const netProfit = totalReceived - totalExpenses;
    const servicesCount = pJobs.length;
    const avgTicket = servicesCount > 0 ? grossBilling / servicesCount : 0;

    const uniqueClients = new Set(
      pJobs.map((j) => j.clientId || j.place).filter(Boolean)
    ).size;

    return {
      grossBilling,
      totalReceived,
      totalExpenses,
      netProfit,
      servicesCount,
      avgTicket,
      uniqueClients,
    };
  };

  const monthMetrics = useMemo(() => computePeriodMetrics(selectedMonth), [jobs, revenues, expenses, selectedMonth]);
  const prevMonthMetrics = useMemo(() => computePeriodMetrics(prevMonthStr), [jobs, revenues, expenses, prevMonthStr]);
  const yearMetrics = useMemo(() => computePeriodMetrics(currentYear), [jobs, revenues, expenses, currentYear]);

  // Top Services Ranking
  const topServices = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>();
    jobs.forEach((j) => {
      const key = (j.profession || 'Serviço').trim();
      const cur = map.get(key) || { name: key, count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += calculateTotal(j);
      map.set(key, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [jobs]);

  // Goals Progress (Strictly based on received amounts)
  const monthlyGoalPct =
    monthlyGoalInput > 0
      ? Math.min(100, Math.round((monthMetrics.totalReceived / monthlyGoalInput) * 100))
      : 0;
  const monthlyRemaining = Math.max(0, monthlyGoalInput - monthMetrics.totalReceived);

  const annualGoalPct =
    annualGoalInput > 0
      ? Math.min(100, Math.round((yearMetrics.totalReceived / annualGoalInput) * 100))
      : 0;
  const annualRemaining = Math.max(0, annualGoalInput - yearMetrics.totalReceived);

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePrefs({
      ...prefs,
      goal: Number(monthlyGoalInput) || 0,
      goalMonth: selectedMonth,
      annualGoal: Number(annualGoalInput) || 0,
      annualGoalYear: currentYear,
    });
    onShowToast?.('Metas financeiras salvas com sucesso!');
  };

  const growthPct =
    prevMonthMetrics.totalReceived > 0
      ? Math.round(
          ((monthMetrics.totalReceived - prevMonthMetrics.totalReceived) /
            prevMonthMetrics.totalReceived) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
            Inteligência e Crescimento
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5">
            Meu Negócio &amp; Metas
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Acompanhe faturamento mensal e anual, lucro líquido, ticket médio, ranking de serviços e metas financeiras.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="text-xs font-bold text-[var(--muted)]">Mês de Análise:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)]"
          />
        </div>
      </div>

      {/* Executive Summary Cards (Monthly vs Annual) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-5 rounded-2xl bg-[#101D32] text-white border border-[#1E3254] shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
            Recebido no Mês ({selectedMonth})
          </span>
          <strong className="text-2xl font-extrabold font-mono text-white my-1.5 block">
            {money(monthMetrics.totalReceived)}
          </strong>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#60A5FA]">Bruto: {money(monthMetrics.grossBilling)}</span>
            {prevMonthMetrics.totalReceived > 0 && (
              <span
                className={`inline-flex items-center font-bold ${
                  growthPct >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'
                }`}
              >
                {growthPct >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {Math.abs(growthPct)}% vs mês ant.
              </span>
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">
            Lucro Líquido Mensal
          </span>
          <strong
            className={`text-2xl font-extrabold font-mono my-1.5 block ${
              monthMetrics.netProfit >= 0 ? 'text-[#16A36A]' : 'text-[#DC4545]'
            }`}
          >
            {money(monthMetrics.netProfit)}
          </strong>
          <span className="text-[11px] text-[var(--muted)]">
            Despesas do mês: {money(monthMetrics.totalExpenses)}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">
            Ticket Médio por Serviço
          </span>
          <strong className="text-2xl font-extrabold font-mono text-[var(--ink)] my-1.5 block">
            {money(monthMetrics.avgTicket)}
          </strong>
          <span className="text-[11px] text-[var(--muted)]">
            {monthMetrics.servicesCount} serviço(s) · {monthMetrics.uniqueClients} cliente(s)
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--g)] block">
            Acumulado Anual ({currentYear})
          </span>
          <strong className="text-2xl font-extrabold font-mono text-[var(--ink)] my-1.5 block">
            {money(yearMetrics.totalReceived)}
          </strong>
          <span className="text-[11px] text-[#16A36A] font-semibold">
            Lucro Anual: {money(yearMetrics.netProfit)}
          </span>
        </div>
      </div>

      {/* Financial Goals Module (Monthly & Annual) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs space-y-5">
        <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3">
          <Target className="w-5 h-5 text-[var(--g)]" />
          <div>
            <h3 className="text-base font-extrabold text-[var(--ink)]">
              Metas Financeiras (Baseadas em Valores Efetivamente Recebidos)
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Defina suas metas de recebimento mensal e anual e acompanhe sua evolução real.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Goal Progress */}
          <div className="p-4 rounded-2xl bg-[var(--cream)]/60 border border-[var(--line)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink)]">
                Meta Mensal ({selectedMonth})
              </span>
              <span className="text-sm font-extrabold text-[var(--g)]">{monthlyGoalPct}%</span>
            </div>

            <div className="h-3.5 w-full bg-[var(--paper)] rounded-full overflow-hidden border border-[var(--line)]">
              <div
                className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] rounded-full transition-all duration-500"
                style={{ width: `${monthlyGoalPct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Meta Definida</span>
                <strong className="font-mono text-[var(--ink)]">{money(monthlyGoalInput)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Valor Atingido</span>
                <strong className="font-mono text-[#16A36A]">{money(monthMetrics.totalReceived)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Valor Restante</span>
                <strong className="font-mono text-[var(--g)]">{money(monthlyRemaining)}</strong>
              </div>
            </div>
          </div>

          {/* Annual Goal Progress */}
          <div className="p-4 rounded-2xl bg-[var(--cream)]/60 border border-[var(--line)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink)]">
                Meta Anual ({currentYear})
              </span>
              <span className="text-sm font-extrabold text-[#16A36A]">{annualGoalPct}%</span>
            </div>

            <div className="h-3.5 w-full bg-[var(--paper)] rounded-full overflow-hidden border border-[var(--line)]">
              <div
                className="h-full bg-gradient-to-r from-[#16A36A] to-[#4ADE80] rounded-full transition-all duration-500"
                style={{ width: `${annualGoalPct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Meta Anual</span>
                <strong className="font-mono text-[var(--ink)]">{money(annualGoalInput)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Recebido no Ano</span>
                <strong className="font-mono text-[#16A36A]">{money(yearMetrics.totalReceived)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Valor Restante</span>
                <strong className="font-mono text-[var(--g)]">{money(annualRemaining)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Form to Update Goals */}
        <form onSubmit={handleSaveGoals} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2 border-t border-[var(--line)] text-xs">
          <div>
            <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
              Definir Meta Mensal (R$)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={monthlyGoalInput || ''}
              onChange={(e) => setMonthlyGoalInput(Number(e.target.value))}
              placeholder="Ex.: 5000"
              className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
              Definir Meta Anual (R$)
            </label>
            <input
              type="number"
              min="0"
              step="500"
              value={annualGoalInput || ''}
              onChange={(e) => setAnnualGoalInput(Number(e.target.value))}
              placeholder="Ex.: 60000"
              className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono font-bold"
            />
          </div>
          <button
            type="submit"
            className="py-2.5 px-5 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-white font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Metas</span>
          </button>
        </form>
      </div>

      {/* Period Comparison & Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Comparativo Entre Períodos */}
        <div className="p-5 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--g)]" />
            <h3 className="text-sm font-extrabold text-[var(--ink)]">
              Comparação entre Períodos ({prevMonthStr} vs {selectedMonth})
            </h3>
          </div>

          <div className="divide-y divide-[var(--line)] text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[var(--muted)]">Faturamento Bruto</span>
              <div className="font-mono">
                <span className="text-[var(--muted)] mr-3">{money(prevMonthMetrics.grossBilling)}</span>
                <strong className="text-[var(--ink)]">{money(monthMetrics.grossBilling)}</strong>
              </div>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[var(--muted)]">Total Recebido</span>
              <div className="font-mono">
                <span className="text-[var(--muted)] mr-3">{money(prevMonthMetrics.totalReceived)}</span>
                <strong className="text-[#16A36A]">{money(monthMetrics.totalReceived)}</strong>
              </div>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[var(--muted)]">Despesas</span>
              <div className="font-mono">
                <span className="text-[var(--muted)] mr-3">{money(prevMonthMetrics.totalExpenses)}</span>
                <strong className="text-[#DC4545]">{money(monthMetrics.totalExpenses)}</strong>
              </div>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[var(--muted)]">Lucro Líquido</span>
              <div className="font-mono">
                <span className="text-[var(--muted)] mr-3">{money(prevMonthMetrics.netProfit)}</span>
                <strong className="text-[var(--g)]">{money(monthMetrics.netProfit)}</strong>
              </div>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[var(--muted)]">Serviços Realizados</span>
              <div className="font-mono">
                <span className="text-[var(--muted)] mr-3">{prevMonthMetrics.servicesCount}</span>
                <strong className="text-[var(--ink)]">{monthMetrics.servicesCount}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Ranking de Serviços Mais Realizados */}
        <div className="p-5 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[var(--g)]" />
            <h3 className="text-sm font-extrabold text-[var(--ink)]">
              Serviços Mais Realizados (Ranking Geral)
            </h3>
          </div>

          {topServices.length === 0 ? (
            <p className="text-xs text-[var(--muted)] py-8 text-center">
              Registre trabalhos para visualizar os serviços mais rentáveis do seu negócio.
            </p>
          ) : (
            <div className="space-y-3 text-xs">
              {topServices.map((srv, idx) => (
                <div
                  key={srv.name}
                  className="p-3 rounded-2xl bg-[var(--cream)]/60 border border-[var(--line)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-[var(--g)] text-white font-extrabold flex items-center justify-center text-[11px]">
                      {idx + 1}º
                    </span>
                    <div>
                      <strong className="text-[var(--ink)] block">{srv.name}</strong>
                      <span className="text-[10px] text-[var(--muted)]">
                        {srv.count} atendimento{srv.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <strong className="font-mono font-bold text-[var(--ink)]">
                    {money(srv.revenue)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
