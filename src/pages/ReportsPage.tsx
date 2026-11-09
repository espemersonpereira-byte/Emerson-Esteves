import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Briefcase,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Job, Client, ExpenseRecord, RevenueRecord } from '../types';
import {
  money,
  currentMonth,
  calculateHours,
  calculateTotal,
  calculatePaid,
  calculateDue,
  hlabel,
  downloadFile,
  dateLabel,
} from '../utils';

interface ReportsPageProps {
  jobs: Job[];
  clients: Client[];
  expenses?: ExpenseRecord[];
  revenues?: RevenueRecord[];
  onOpenReportPrint: (month: string) => void;
}

type ReportCategory =
  | 'financeiro'
  | 'receitas'
  | 'despesas'
  | 'clientes'
  | 'trabalhos'
  | 'pagamentos'
  | 'desempenho';

export const ReportsPage: React.FC<ReportsPageProps> = ({
  jobs,
  clients,
  expenses = [],
  revenues = [],
  onOpenReportPrint,
}) => {
  const [periodMode, setPeriodMode] = useState<'month' | 'year' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [activeTab, setActiveTab] = useState<ReportCategory>('financeiro');

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  // Filter records by period
  const matchPeriod = (dateStr?: string) => {
    if (!dateStr) return false;
    if (periodMode === 'all') return true;
    if (periodMode === 'year') return dateStr.startsWith(selectedYear);
    return dateStr.startsWith(selectedMonth);
  };

  const filteredJobs = useMemo(
    () => jobs.filter((j) => matchPeriod(j.date) && j.status !== 'cancelled'),
    [jobs, periodMode, selectedMonth, selectedYear]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => matchPeriod(e.date)),
    [expenses, periodMode, selectedMonth, selectedYear]
  );

  const filteredRevenues = useMemo(
    () => revenues.filter((r) => matchPeriod(r.date)),
    [revenues, periodMode, selectedMonth, selectedYear]
  );

  // Metrics
  const totalServicesValue = filteredJobs.reduce((s, j) => s + calculateTotal(j), 0);
  const totalServicesPaid = filteredJobs.reduce((s, j) => s + calculatePaid(j), 0);
  const totalServicesDue = filteredJobs.reduce((s, j) => s + calculateDue(j), 0);
  const totalTransportPaid = filteredJobs.reduce(
    (s, j) => s + (j.transportstatus === 'paid' ? Number(j.transport) || 0 : 0),
    0
  );
  const totalTransportDue = filteredJobs.reduce(
    (s, j) => s + (j.transportstatus === 'paid' ? 0 : Number(j.transport) || 0),
    0
  );
  const jobInlineExpenses = filteredJobs.reduce(
    (s, j) => s + (Number(j.expenses) || 0) + (Number(j.materialsCost) || 0),
    0
  );
  const standaloneExpensesTotal = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const standaloneRevenuesTotal = filteredRevenues
    .filter((r) => r.status === 'received')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const totalGrossRevenue = totalServicesPaid + totalTransportPaid + standaloneRevenuesTotal;
  const totalAllExpenses = jobInlineExpenses + standaloneExpensesTotal;
  const netProfit = totalGrossRevenue - totalAllExpenses;
  const totalHours = filteredJobs.reduce(
    (s, j) => s + calculateHours(j) + (Number(j.extraHours) || 0),
    0
  );

  // Breakdown by Profession
  const professionEntries = useMemo(() => {
    const map: Record<
      string,
      { count: number; hours: number; total: number; paid: number; transport: number; expenses: number }
    > = {};
    filteredJobs.forEach((j) => {
      const prof = j.profession || 'Sem profissão';
      if (!map[prof]) {
        map[prof] = { count: 0, hours: 0, total: 0, paid: 0, transport: 0, expenses: 0 };
      }
      map[prof].count += 1;
      map[prof].hours += calculateHours(j) + (Number(j.extraHours) || 0);
      map[prof].total += calculateTotal(j);
      map[prof].paid += calculatePaid(j);
      map[prof].transport += j.transportstatus === 'paid' ? Number(j.transport) || 0 : 0;
      map[prof].expenses += (Number(j.expenses) || 0) + (Number(j.materialsCost) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filteredJobs]);

  // Breakdown by Client
  const clientEntries = useMemo(() => {
    const map: Record<string, { count: number; total: number; received: number; due: number }> = {};
    filteredJobs.forEach((j) => {
      const cName = clientMap.get(j.clientId) || j.place || 'Sem cliente';
      if (!map[cName]) {
        map[cName] = { count: 0, total: 0, received: 0, due: 0 };
      }
      map[cName].count += 1;
      map[cName].total += calculateTotal(j);
      map[cName].received +=
        calculatePaid(j) + (j.transportstatus === 'paid' ? Number(j.transport) || 0 : 0);
      map[cName].due += calculateDue(j);
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filteredJobs, clientMap]);

  // Breakdown by Payment Method
  const paymentMethodEntries = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    filteredJobs.forEach((j) => {
      const paid = calculatePaid(j);
      if (paid <= 0) return;
      const m = j.method || 'Não informado';
      if (!map[m]) map[m] = { count: 0, amount: 0 };
      map[m].count += 1;
      map[m].amount += paid;
    });
    filteredRevenues
      .filter((r) => r.status === 'received')
      .forEach((r) => {
        const m = r.method || 'Não informado';
        if (!map[m]) map[m] = { count: 0, amount: 0 };
        map[m].count += 1;
        map[m].amount += Number(r.amount) || 0;
      });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [filteredJobs, filteredRevenues]);

  // Expense Category Breakdown
  const expenseCategoryEntries = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    filteredExpenses.forEach((e) => {
      const cat = e.category || 'Outros';
      if (!map[cat]) map[cat] = { count: 0, amount: 0 };
      map[cat].count += 1;
      map[cat].amount += Number(e.amount) || 0;
    });
    if (jobInlineExpenses > 0) {
      map['Despesas e Materiais em Trabalhos'] = {
        count: filteredJobs.filter((j) => (j.expenses || 0) + (j.materialsCost || 0) > 0).length,
        amount: jobInlineExpenses,
      };
    }
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [filteredExpenses, filteredJobs, jobInlineExpenses]);

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      [
        'Data',
        'Serviço/Profissão',
        'Cliente',
        'Local',
        'Atividade',
        'Entrada',
        'Saída',
        'Intervalo (min)',
        'Horas Líquidas',
        'Horas Extras',
        'Valor Serviço (R$)',
        'Serviço Recebido (R$)',
        'Serviço Pendente (R$)',
        'Vale-Transporte (R$)',
        'Vale Recebido?',
        'Despesas/Materiais (R$)',
        'Saldo Líquido (R$)',
        'Forma Pagamento',
        'Data Prevista',
        'Data Recebimento',
        'Observações',
      ],
    ];

    filteredJobs.forEach((j) => {
      const netH = calculateHours(j) + (Number(j.extraHours) || 0);
      const tot = calculateTotal(j);
      const pd = calculatePaid(j);
      const du = calculateDue(j);
      const trVal = Number(j.transport) || 0;
      const trPd = j.transportstatus === 'paid' ? trVal : 0;
      const exp = (Number(j.expenses) || 0) + (Number(j.materialsCost) || 0);
      const net = pd + trPd - exp;

      rows.push([
        j.date,
        j.profession,
        clientMap.get(j.clientId) || '',
        j.place,
        j.task,
        j.start,
        j.end,
        String(j.break),
        netH.toFixed(2),
        String(j.extraHours || 0),
        tot.toFixed(2),
        pd.toFixed(2),
        du.toFixed(2),
        trVal.toFixed(2),
        j.transportstatus === 'paid' ? 'Sim' : 'Não',
        exp.toFixed(2),
        net.toFixed(2),
        j.method,
        j.dueDate,
        j.paydate,
        j.notes,
      ]);
    });

    const csvContent =
      '\ufeff' +
      rows
        .map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';'))
        .join('\r\n');

    const periodTag =
      periodMode === 'month' ? selectedMonth : periodMode === 'year' ? selectedYear : 'completo';
    downloadFile(`freelas-relatorio-${periodTag}.csv`, csvContent, 'text/csv;charset=utf-8');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
            Inteligência & Exportação
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5">
            Relatórios Gerenciais
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Análise financeira, receitas, despesas, clientes, serviços e desempenho.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)] hover:bg-[var(--cream)] transition-colors shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenReportPrint(selectedMonth)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF Mensal</span>
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-[var(--cream)] p-1 rounded-xl border border-[var(--line)] self-start">
          <button
            type="button"
            onClick={() => setPeriodMode('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              periodMode === 'month'
                ? 'bg-[var(--g)] text-white shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode('year')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              periodMode === 'year'
                ? 'bg-[var(--g)] text-white shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Anual
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              periodMode === 'all'
                ? 'bg-[var(--g)] text-white shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Todo o Período
          </button>
        </div>

        <div className="flex items-center gap-2">
          {periodMode === 'month' && (
            <>
              <Calendar className="w-4 h-4 text-[var(--g)]" />
              <label className="text-xs font-bold text-[var(--ink)]">Mês:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-xs font-bold text-[var(--ink)]"
              />
            </>
          )}
          {periodMode === 'year' && (
            <>
              <Calendar className="w-4 h-4 text-[var(--g)]" />
              <label className="text-xs font-bold text-[var(--ink)]">Ano:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-xs font-bold text-[var(--ink)]"
              >
                {[0, 1, 2, 3, 4].map((offset) => {
                  const yr = String(new Date().getFullYear() - offset);
                  return (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  );
                })}
              </select>
            </>
          )}
          {periodMode === 'all' && (
            <span className="text-xs font-semibold text-[var(--muted)]">
              Exibindo histórico completo ({filteredJobs.length} trabalhos)
            </span>
          )}
        </div>
      </div>

      {/* Report Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'financeiro', label: 'Financeiro Geral', icon: Wallet },
          { id: 'receitas', label: 'Receitas', icon: ArrowUpRight },
          { id: 'despesas', label: 'Despesas', icon: ArrowDownRight },
          { id: 'clientes', label: 'Por Cliente', icon: Users },
          { id: 'trabalhos', label: 'Por Serviço / Função', icon: Briefcase },
          { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
          { id: 'desempenho', label: 'Desempenho', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ReportCategory)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                active
                  ? 'bg-[var(--g)] text-white shadow-xs'
                  : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Summary KPI Grid (Always Visible) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
          <small className="block text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider">
            Receita Bruta Recebida
          </small>
          <strong className="text-base sm:text-lg font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400 block mt-1">
            {money(totalGrossRevenue)}
          </strong>
          <span className="text-[10px] text-[var(--muted)]">
            Serviços + Vales + Avulsas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
          <small className="block text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider">
            Total a Receber
          </small>
          <strong className="text-base sm:text-lg font-extrabold font-mono-num text-amber-600 dark:text-amber-400 block mt-1">
            {money(totalServicesDue + totalTransportDue)}
          </strong>
          <span className="text-[10px] text-[var(--muted)]">
            Pendente de quitação
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
          <small className="block text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider">
            Total de Despesas
          </small>
          <strong className="text-base sm:text-lg font-extrabold font-mono-num text-rose-600 dark:text-rose-400 block mt-1">
            {money(totalAllExpenses)}
          </strong>
          <span className="text-[10px] text-[var(--muted)]">
            Operacionais + Materiais
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
          <small className="block text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider">
            Lucro Líquido Real
          </small>
          <strong className="text-base sm:text-lg font-extrabold font-mono-num text-[var(--g)] block mt-1">
            {money(netProfit)}
          </strong>
          <span className="text-[10px] text-[var(--muted)]">
            {hlabel(totalHours)} trabalhadas
          </span>
        </div>
      </div>

      {/* TAB 1: FINANCEIRO GERAL */}
      {activeTab === 'financeiro' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[var(--ink)]">Demonstrativo do Período</h3>
            <div className="divide-y divide-[var(--line)] text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--muted)]">Valor Total Contratado (Serviços)</span>
                <b className="font-mono-num text-[var(--ink)]">{money(totalServicesValue)}</b>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--muted)]">(+) Serviços Recebidos</span>
                <b className="font-mono-num text-emerald-600 dark:text-emerald-400">
                  {money(totalServicesPaid)}
                </b>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--muted)]">(+) Vale-Transporte Recebido</span>
                <b className="font-mono-num text-emerald-600 dark:text-emerald-400">
                  {money(totalTransportPaid)}
                </b>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--muted)]">(+) Receitas Avulsas Recebidas</span>
                <b className="font-mono-num text-emerald-600 dark:text-emerald-400">
                  {money(standaloneRevenuesTotal)}
                </b>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--muted)]">(-) Despesas e Materiais em Trabalhos</span>
                <b className="font-mono-num text-rose-600 dark:text-rose-400">
                  - {money(jobInlineExpenses)}
                </b>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--muted)]">(-) Despesas Operacionais Avulsas</span>
                <b className="font-mono-num text-rose-600 dark:text-rose-400">
                  - {money(standaloneExpensesTotal)}
                </b>
              </div>
              <div className="py-3 flex justify-between text-sm font-extrabold">
                <span className="text-[var(--ink)]">(=) Resultado Líquido de Caixa</span>
                <span className="font-mono-num text-[var(--g)]">{money(netProfit)}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[var(--ink)]">Principais Clientes no Período</h3>
            {clientEntries.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-6 text-center">
                Nenhum registro encontrado para este período.
              </p>
            ) : (
              <div className="divide-y divide-[var(--line)] text-xs">
                {clientEntries.slice(0, 6).map(([cName, data]) => (
                  <div key={cName} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <b className="text-[var(--ink)] block">{cName}</b>
                      <span className="text-[11px] text-[var(--muted)]">
                        {data.count} trabalho{data.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-right">
                      <b className="font-mono-num text-[var(--ink)] block">{money(data.total)}</b>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        Recebido: {money(data.received)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RECEITAS */}
      {activeTab === 'receitas' && (
        <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[var(--ink)]">
            Detalhamento de Entradas ({filteredJobs.length} trabalhos · {filteredRevenues.length} avulsas)
          </h3>
          {filteredJobs.length === 0 && filteredRevenues.length === 0 ? (
            <p className="text-xs text-[var(--muted)] py-6 text-center">
              Nenhuma receita registrada no período selecionado.
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)] text-xs">
              {filteredJobs.map((j) => (
                <div key={j.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <b className="text-[var(--ink)]">{j.profession}</b>
                    <span className="text-[11px] text-[var(--muted)] block">
                      {dateLabel(j.date)} · {clientMap.get(j.clientId) || j.place}
                    </span>
                  </div>
                  <div className="text-right">
                    <b className="font-mono-num text-emerald-600 dark:text-emerald-400 block">
                      {money(calculatePaid(j))}
                    </b>
                    <span className="text-[10px] text-[var(--muted)]">
                      Total: {money(calculateTotal(j))}
                    </span>
                  </div>
                </div>
              ))}
              {filteredRevenues.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <b className="text-[var(--ink)]">{r.description}</b>
                    <span className="text-[11px] text-[var(--muted)] block">
                      {dateLabel(r.date)} · {r.category} (Receita avulsa)
                    </span>
                  </div>
                  <div className="text-right">
                    <b className="font-mono-num text-emerald-600 dark:text-emerald-400 block">
                      {money(r.amount)}
                    </b>
                    <span className="text-[10px] text-[var(--muted)]">{r.method}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DESPESAS */}
      {activeTab === 'despesas' && (
        <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[var(--ink)]">Despesas por Categoria</h3>
          {expenseCategoryEntries.length === 0 ? (
            <p className="text-xs text-[var(--muted)] py-6 text-center">
              Nenhuma despesa registrada neste período.
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)] text-xs">
              {expenseCategoryEntries.map(([cat, data]) => (
                <div key={cat} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <b className="text-[var(--ink)]">{cat}</b>
                    <span className="text-[11px] text-[var(--muted)] block">
                      {data.count} lançamento{data.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <b className="font-mono-num text-rose-600 dark:text-rose-400">
                    - {money(data.amount)}
                  </b>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CLIENTES */}
      {activeTab === 'clientes' && (
        <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[var(--ink)]">Faturamento por Cliente</h3>
          {clientEntries.length === 0 ? (
            <p className="text-xs text-[var(--muted)] py-6 text-center">
              Nenhum cliente atendido neste período.
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)] text-xs">
              {clientEntries.map(([cName, data]) => (
                <div key={cName} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <b className="text-sm text-[var(--ink)]">{cName}</b>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">
                      {data.count} serviço{data.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <b className="text-sm font-mono-num text-[var(--ink)] block">
                      {money(data.total)}
                    </b>
                    <div className="text-[11px] text-[var(--muted)]">
                      Recebido: {money(data.received)}
                      {data.due > 0.01 && ` · Pendente: ${money(data.due)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TRABALHOS / PROFISSÃO */}
      {activeTab === 'trabalhos' && (
        <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[var(--ink)]">Faturamento por Serviço / Função</h3>
          {professionEntries.length === 0 ? (
            <p className="text-xs text-[var(--muted)] py-6 text-center">
              Nenhum serviço registrado neste período.
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)] text-xs">
              {professionEntries.map(([prof, data]) => (
                <div key={prof} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <b className="text-sm text-[var(--ink)]">{prof}</b>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">
                      {data.count} serviço{data.count !== 1 ? 's' : ''} · {hlabel(data.hours)}
                    </div>
                  </div>
                  <div className="text-right">
                    <b className="text-sm font-mono-num text-[var(--ink)] block">
                      {money(data.total)}
                    </b>
                    <div className="text-[11px] text-[var(--muted)]">
                      Recebido: {money(data.paid)} · Vale: {money(data.transport)}
                      {data.expenses > 0 && ` · Custos: ${money(data.expenses)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: PAGAMENTOS */}
      {activeTab === 'pagamentos' && (
        <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[var(--ink)]">Recebimentos por Forma de Pagamento</h3>
          {paymentMethodEntries.length === 0 ? (
            <p className="text-xs text-[var(--muted)] py-6 text-center">
              Nenhum pagamento quitado registrado no período.
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)] text-xs">
              {paymentMethodEntries.map(([method, data]) => (
                <div key={method} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <b className="text-sm text-[var(--ink)]">{method}</b>
                    <span className="text-[11px] text-[var(--muted)] block">
                      {data.count} pagamento{data.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <b className="text-sm font-mono-num text-emerald-600 dark:text-emerald-400">
                    {money(data.amount)}
                  </b>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: DESEMPENHO */}
      {activeTab === 'desempenho' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">
              Ticket Médio por Trabalho
            </span>
            <strong className="text-xl font-extrabold font-mono-num text-[var(--ink)] block mt-1">
              {money(filteredJobs.length > 0 ? totalServicesValue / filteredJobs.length : 0)}
            </strong>
            <span className="text-[11px] text-[var(--muted)] mt-1 block">
              Em {filteredJobs.length} trabalhos realizados
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">
              Ganho Médio por Hora
            </span>
            <strong className="text-xl font-extrabold font-mono-num text-[var(--g)] block mt-1">
              {money(totalHours > 0 ? totalServicesValue / totalHours : 0)}/h
            </strong>
            <span className="text-[11px] text-[var(--muted)] mt-1 block">
              Total de {hlabel(totalHours)} dedicadas
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">
              Margem Líquida
            </span>
            <strong className="text-xl font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400 block mt-1">
              {totalGrossRevenue > 0
                ? `${Math.round((netProfit / totalGrossRevenue) * 100)}%`
                : '0%'}
            </strong>
            <span className="text-[11px] text-[var(--muted)] mt-1 block">
              Receita vs. Despesas totais
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
