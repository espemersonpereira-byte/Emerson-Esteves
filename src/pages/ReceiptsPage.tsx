import React, { useState, useMemo } from 'react';
import { Receipt, Search, Printer, CheckCircle2, Clock } from 'lucide-react';
import { Job, Client } from '../types';
import {
  money,
  dateLabel,
  calculateTotal,
  calculatePaid,
  calculateDueAll,
  getServiceStatus,
} from '../utils';

interface ReceiptsPageProps {
  jobs: Job[];
  clients: Client[];
  onViewReceipt: (job: Job) => void;
}

export const ReceiptsPage: React.FC<ReceiptsPageProps> = ({
  jobs,
  clients,
  onViewReceipt,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const getClientName = (id?: string) => {
    if (!id) return '';
    return clients.find((c) => c.id === id)?.name || '';
  };

  const filteredJobs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return jobs
      .filter((j) => j.status !== 'cancelled')
      .filter((j) => {
        const st = getServiceStatus(j);
        if (filter === 'paid' && st !== 'paid') return false;
        if (filter === 'pending' && st === 'paid') return false;
        if (!q) return true;
        const cName = getClientName(j.clientId).toLowerCase();
        return (
          j.profession.toLowerCase().includes(q) ||
          j.place.toLowerCase().includes(q) ||
          cName.includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [jobs, clients, search, filter]);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
          Comprovantes e Faturas
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5">
          Central de Recibos
        </h2>
        <p className="text-xs text-[var(--muted)]">
          Emita recibos profissionais em 4 modelos (Cupom Térmico, Fatura Comercial, Recibo Clássico e Executivo), baixe PDF ou envie no WhatsApp.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'all', label: 'Todos os Serviços' },
            { id: 'paid', label: 'Quitados / Pagos' },
            { id: 'pending', label: 'Pendentes / Parciais' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === t.id
                  ? 'bg-[var(--g)] text-white'
                  : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar recibo por cliente, serviço ou local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)]"
          />
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-2.5" />
        </div>
      </div>

      {/* List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-14 px-6 rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)]">
          <Receipt className="w-10 h-10 mx-auto mb-2 text-[var(--muted)] opacity-50" />
          <h4 className="text-sm font-bold text-[var(--ink)]">Nenhum recibo disponível</h4>
          <p className="text-xs text-[var(--muted)] max-w-xs mx-auto mt-1">
            Todos os trabalhos registrados geram automaticamente recibos prontos para emissão e compartilhamento.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredJobs.map((j) => {
            const total = calculateTotal(j) + (Number(j.transport) || 0);
            const paid = calculatePaid(j) + (j.transportstatus === 'paid' ? Number(j.transport) || 0 : 0);
            const due = calculateDueAll(j);
            const cName = getClientName(j.clientId);

            return (
              <div
                key={j.id}
                className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--g)]/50 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--cream)] border border-[var(--line)] text-[var(--muted)]">
                      #{j.id.slice(0, 6).toUpperCase()}
                    </span>
                    <h4 className="text-sm font-bold text-[var(--ink)]">{j.profession}</h4>
                    {due < 0.01 ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#16A36A]/15 text-[#16A36A] text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Quitado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Saldo a receber
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Cliente/Tomador: <b className="text-[var(--ink)]">{cName || j.place}</b> · Data do serviço: {dateLabel(j.date)}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]">
                  <div className="text-right">
                    <strong className="font-mono text-base font-extrabold text-[var(--ink)] block">
                      {money(total)}
                    </strong>
                    <span className="text-[10px] text-[#16A36A] font-semibold">
                      Pago: {money(paid)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onViewReceipt(j)}
                    className="px-4 py-2 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Emitir / Baixar Recibo</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
