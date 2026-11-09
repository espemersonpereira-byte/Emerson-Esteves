import React, { useState } from 'react';
import { X, Printer, FileDown } from 'lucide-react';
import { Job, Client } from '../types';
import {
  money,
  dateLabel,
  calculateHours,
  calculateTotal,
  calculatePaid,
  calculateDue,
  hlabel,
  today,
} from '../utils';
import { printElementDirectly, generateElementPDF } from '../utils/printReceipt';

interface ReportPrintModalProps {
  monthStr: string;
  jobs: Job[];
  clients: Client[];
  userName?: string;
  crf?: string;
  professionalId?: string;
  onClose: () => void;
}

export const ReportPrintModal: React.FC<ReportPrintModalProps> = ({
  monthStr,
  jobs,
  clients,
  userName = 'Meu perfil',
  crf = '',
  professionalId = '',
  onClose,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  const filteredJobs = jobs
    .filter((j) => j.date.startsWith(monthStr))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalEarned = filteredJobs.reduce((s, j) => s + calculateTotal(j), 0);
  const totalPaid = filteredJobs.reduce((s, j) => s + calculatePaid(j), 0);
  const totalDue = filteredJobs.reduce((s, j) => s + calculateDue(j), 0);
  const totalTransportPaid = filteredJobs.reduce(
    (s, j) => s + (j.transportstatus === 'paid' ? Number(j.transport) || 0 : 0),
    0
  );
  const totalTransportDue = filteredJobs.reduce(
    (s, j) => s + (j.transportstatus === 'paid' ? 0 : Number(j.transport) || 0),
    0
  );
  const totalExpenses = filteredJobs.reduce((s, j) => s + (Number(j.expenses) || 0), 0);
  const totalHours = filteredJobs.reduce(
    (s, j) => s + calculateHours(j) + (Number(j.extraHours) || 0),
    0
  );
  const netEarnings = totalPaid + totalTransportPaid - totalExpenses;

  const getClientName = (id?: string, placeFallback?: string) => {
    if (!id) return placeFallback || 'Sem cliente';
    return clients.find((c) => c.id === id)?.name || placeFallback || 'Sem cliente';
  };

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      await printElementDirectly({
        elementId: 'report-print-area',
        documentTitle: `Relatorio_${monthStr}`,
        template: 'corporate',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePdf = async () => {
    if (isSavingPdf) return;
    setIsSavingPdf(true);
    try {
      await generateElementPDF('report-print-area', `Relatorio_${monthStr}.pdf`, `Relatório Mensal - ${monthStr}`);
    } finally {
      setIsSavingPdf(false);
    }
  };

  const [y, m] = monthStr.split('-');
  const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[var(--paper)] border border-[var(--line)] rounded-3xl p-6 sm:p-8 shadow-2xl text-[var(--ink)]">
        {/* Top actions */}
        <div className="no-print flex items-center justify-between pb-4 mb-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[var(--sage)] text-[var(--g)] flex items-center justify-center font-serif text-lg font-bold">
              ∑
            </span>
            <div>
              <h3 className="text-sm font-bold">Relatório Mensal</h3>
              <p className="text-[11px] text-[var(--muted)]">Mês de {monthName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] transition-colors shadow-xs disabled:opacity-60"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'Preparando...' : '🖨️ Imprimir'}</span>
            </button>
            <button
              onClick={handleSavePdf}
              disabled={isSavingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-60"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isSavingPdf ? 'Gerando...' : '📄 Salvar PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--cream)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="report-print-area" className="print-area space-y-6">
          <div className="border-b border-[var(--line)] pb-4">
            <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--copper)]">
              FREELAS · Prestação de Contas
            </div>
            <h1 className="text-2xl font-bold mt-1 capitalize">
              Relatório de Serviços — {monthName}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)] mt-1">
              <span>Profissional: <b className="text-[var(--ink)]">{userName}</b>{(professionalId || crf) ? ` (${professionalId || crf})` : ''}</span>
              <span>Emissão: {dateLabel(today())}</span>
              <span>Total de registros: {filteredJobs.length}</span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[var(--cream)] rounded-2xl border border-[var(--line)]">
              <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Total Serviços</span>
              <span className="text-lg font-bold font-mono-num text-[var(--ink)]">{money(totalEarned)}</span>
            </div>
            <div className="p-3 bg-[var(--cream)] rounded-2xl border border-[var(--line)]">
              <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Recebido (Serviços)</span>
              <span className="text-lg font-bold font-mono-num text-emerald-600 dark:text-emerald-400">{money(totalPaid)}</span>
            </div>
            <div className="p-3 bg-[var(--cream)] rounded-2xl border border-[var(--line)]">
              <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Vale-Transporte Recebido</span>
              <span className="text-lg font-bold font-mono-num text-emerald-600 dark:text-emerald-400">{money(totalTransportPaid)}</span>
            </div>
            <div className="p-3 bg-[var(--cream)] rounded-2xl border border-[var(--line)]">
              <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Saldo Líquido</span>
              <span className="text-lg font-bold font-mono-num text-[var(--g)]">{money(netEarnings)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)]">
              <span className="text-[10px] text-[var(--muted)] block">Pendente (Serviço)</span>
              <span className="font-semibold font-mono-num text-amber-600 dark:text-amber-400">{money(totalDue)}</span>
            </div>
            <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)]">
              <span className="text-[10px] text-[var(--muted)] block">Pendente (Transporte)</span>
              <span className="font-semibold font-mono-num text-amber-600 dark:text-amber-400">{money(totalTransportDue)}</span>
            </div>
            <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)]">
              <span className="text-[10px] text-[var(--muted)] block">Despesas Realizadas</span>
              <span className="font-semibold font-mono-num text-rose-600 dark:text-rose-400">{money(totalExpenses)}</span>
            </div>
            <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)]">
              <span className="text-[10px] text-[var(--muted)] block">Horas Trabalhadas</span>
              <span className="font-semibold font-mono-num">{hlabel(totalHours)}</span>
            </div>
          </div>

          {/* Table of Jobs */}
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--muted)] mb-2">
              Relação dos Trabalhos no Mês
            </div>
            <div className="border border-[var(--line)] rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--sage)]/50 text-[var(--g)] font-bold border-b border-[var(--line)]">
                  <tr>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Profissão</th>
                    <th className="py-2.5 px-3">Cliente / Local</th>
                    <th className="py-2.5 px-3">Horas</th>
                    <th className="py-2.5 px-3 text-right">Serviço</th>
                    <th className="py-2.5 px-3 text-right">Recebido</th>
                    <th className="py-2.5 px-3 text-right">Transporte</th>
                    <th className="py-2.5 px-3 text-right">Despesas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-[var(--muted)]">
                        Nenhum registro para este mês.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((j) => (
                      <tr key={j.id}>
                        <td className="py-2 px-3 whitespace-nowrap font-medium">{dateLabel(j.date)}</td>
                        <td className="py-2 px-3">{j.profession}</td>
                        <td className="py-2 px-3 text-[var(--muted)]">{getClientName(j.clientId, j.place)}</td>
                        <td className="py-2 px-3">{hlabel(calculateHours(j) + (j.extraHours || 0))}</td>
                        <td className="py-2 px-3 text-right font-mono-num font-semibold">{money(calculateTotal(j))}</td>
                        <td className="py-2 px-3 text-right font-mono-num text-emerald-600 dark:text-emerald-400">
                          {money(calculatePaid(j))}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-num">
                          {j.transportstatus === 'paid' ? money(j.transport) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-num text-rose-500">
                          {j.expenses > 0 ? money(j.expenses) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
