import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  CreditCard,
} from 'lucide-react';
import { Job } from '../types';
import {
  today,
  calculateTotal,
  calculatePaid,
  calculateDue,
  money,
  dateLabel,
} from '../utils';

export type QuickStatusMode = 'complete' | 'cancel';

interface QuickJobStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  initialMode: QuickStatusMode;
  onSaveJob: (updatedJob: Job) => void;
}

export const QuickJobStatusModal: React.FC<QuickJobStatusModalProps> = ({
  isOpen,
  onClose,
  job,
  initialMode,
  onSaveJob,
}) => {
  const [mode, setMode] = useState<QuickStatusMode>(initialMode);

  // Complete mode fields
  // 'paid' = Já recebi, 'pending' = Receber depois
  const [paymentChoice, setPaymentChoice] = useState<'paid' | 'pending'>('paid');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [receiveDate, setReceiveDate] = useState<string>(today());
  const [paymentMethod, setPaymentMethod] = useState<string>('Pix');
  const [markTransportPaid, setMarkTransportPaid] = useState<boolean>(true);
  const [dueDate, setDueDate] = useState<string>('');

  // Cancel mode fields
  const [cancelReason, setCancelReason] = useState<string>('Cancelado pelo cliente');
  const [cancelNotes, setCancelNotes] = useState<string>('');
  const [retainPartialPayment, setRetainPartialPayment] = useState<boolean>(false);

  useEffect(() => {
    if (job) {
      setMode(initialMode);
      const total = calculateTotal(job);
      const paid = calculatePaid(job);
      const due = calculateDue(job);

      // Default amount received to total due or total value
      const targetAmount = due > 0 ? due : (total > 0 ? total : 0);
      setAmountReceived(targetAmount > 0 ? String(targetAmount) : '');
      setReceiveDate(job.paydate || today());
      setDueDate(job.dueDate || job.date || today());
      setPaymentMethod(job.method || 'Pix');
      setMarkTransportPaid(job.transportstatus === 'paid' || (Number(job.transport) || 0) > 0);

      if (job.status === 'cancelled') {
        setCancelReason('Cancelado pelo cliente');
        setCancelNotes(job.notes || '');
      } else {
        setCancelReason('Cancelado pelo cliente');
        setCancelNotes('');
      }
    }
  }, [job, initialMode]);

  if (!isOpen || !job) return null;

  const calculatedServiceTotal = calculateTotal(job);
  const transportVal = Number(job.transport) || 0;

  const handleConfirm = () => {
    if (mode === 'complete') {
      if (paymentChoice === 'paid') {
        const parsedPaid = parseFloat(amountReceived.replace(',', '.')) || calculatedServiceTotal;
        const updatedJob: Job = {
          ...job,
          status: 'completed',
          paid: parsedPaid,
          paydate: receiveDate || today(),
          method: paymentMethod || 'Pix',
          transportstatus: markTransportPaid && transportVal > 0 ? 'paid' : job.transportstatus,
          transportDate: markTransportPaid && transportVal > 0 ? (receiveDate || today()) : job.transportDate,
          transportMethod: markTransportPaid && transportVal > 0 ? (paymentMethod || 'Pix') : job.transportMethod,
        };
        onSaveJob(updatedJob);
      } else {
        // 'pending' - Receber depois
        const updatedJob: Job = {
          ...job,
          status: 'completed',
          paid: 0,
          dueDate: dueDate || job.dueDate || today(),
        };
        onSaveJob(updatedJob);
      }
    } else {
      // mode === 'cancel' - Não Realizado
      const fullNote = [
        job.notes ? job.notes : '',
        `[NÃO REALIZADO: ${cancelReason}${cancelNotes.trim() ? ` - ${cancelNotes.trim()}` : ''}]`,
      ].filter(Boolean).join('\n');

      const updatedJob: Job = {
        ...job,
        status: 'cancelled',
        paid: retainPartialPayment ? (Number(job.paid) || 0) : 0,
        transportstatus: retainPartialPayment && job.transportstatus === 'paid' ? 'paid' : 'pending',
        notes: fullNote,
      };
      onSaveJob(updatedJob);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {mode === 'complete' ? (
              <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <XCircle className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-[var(--ink)] tracking-tight truncate">
                {mode === 'complete' ? 'Concluir Trabalho' : 'Marcar Não Realizado'}
              </h3>
              <p className="text-[11px] text-[var(--muted)] truncate">
                {job.profession} · {dateLabel(job.date)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--cream)] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle Bar */}
        <div className="p-2 sm:px-4 border-b border-[var(--line)] bg-[var(--cream)]/40 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('complete')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'complete'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Concluído</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('cancel')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'cancel'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Não Realizado</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Job summary pill */}
          <div className="p-3 rounded-2xl bg-[var(--cream)]/70 border border-[var(--line)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--ink)]">Local / Empresa:</span>
              <span className="font-semibold text-[var(--ink)]">{job.place || 'Não informado'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--muted)]">Valor do Serviço:</span>
              <strong className="font-mono-num text-[var(--ink)]">{money(calculatedServiceTotal)}</strong>
            </div>
            {transportVal > 0 && (
              <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span>Vale-Transporte:</span>
                <span className="font-mono-num">{money(transportVal)}</span>
              </div>
            )}
          </div>

          {mode === 'complete' ? (
            /* CONCLUÍDO WORKFLOW */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-2">
                  O trabalho foi concluído. Foi pago?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('paid')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentChoice === 'paid'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Já recebi</span>
                    </div>
                    <p className="text-[10px] opacity-80 mt-1">Marcar como Pago agora</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentChoice('pending')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentChoice === 'pending'
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-1 ring-amber-600'
                        : 'border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Receber depois</span>
                    </div>
                    <p className="text-[10px] opacity-80 mt-1">Manter em A Receber</p>
                  </button>
                </div>
              </div>

              {paymentChoice === 'paid' ? (
                /* Sub-fields for "Já recebi" */
                <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      Valor do Serviço Recebido (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder={String(calculatedServiceTotal)}
                      className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono-num font-bold text-xs focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                        Data do Recebimento *
                      </label>
                      <input
                        type="date"
                        required
                        value={receiveDate}
                        onChange={(e) => setReceiveDate(e.target.value)}
                        className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs focus:outline-hidden focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                        Forma de Pagamento
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold focus:outline-hidden focus:border-emerald-600"
                      >
                        <option value="Pix">Pix</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Transferência">Transferência</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>

                  {transportVal > 0 && (
                    <label className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-[var(--ink)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={markTransportPaid}
                        onChange={(e) => setMarkTransportPaid(e.target.checked)}
                        className="rounded border-[var(--line)] text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>Também marcar vale-transporte ({money(transportVal)}) como recebido</span>
                    </label>
                  )}
                </div>
              ) : (
                /* Sub-fields for "Receber depois" */
                <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                  <div className="flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      O valor permanecerá em <strong>A receber</strong> na aba Financeiro até que você registre o pagamento.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      Data Prevista para Pagamento
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs focus:outline-hidden focus:border-amber-600"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* NÃO REALIZADO WORKFLOW */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
                <div className="flex items-start gap-2 text-[11px] text-rose-900 dark:text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    Ao marcar como <strong>Não Realizado</strong>, este trabalho receberá uma identificação visual diferenciada e seus valores <strong>não serão cobrados nem computados</strong> no Total Recebido ou A Receber.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Motivo principal
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold focus:outline-hidden focus:border-rose-600"
                >
                  <option value="Cancelado pelo contratante / cliente">Cancelado pelo contratante / cliente</option>
                  <option value="Imprevisto pessoal ou de saúde">Imprevisto pessoal ou de saúde</option>
                  <option value="Adiado para outra data">Adiado para outra data</option>
                  <option value="Condições climáticas / transporte">Condições climáticas / transporte</option>
                  <option value="Outro motivo">Outro motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Observações adicionais (opcional)
                </label>
                <textarea
                  rows={2}
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="Ex.: Avisou com 2h de antecedência..."
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs focus:outline-hidden focus:border-rose-600"
                />
              </div>

              {Number(job.paid) > 0 && (
                <label className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-[var(--ink)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retainPartialPayment}
                    onChange={(e) => setRetainPartialPayment(e.target.checked)}
                    className="rounded border-[var(--line)] text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span>Manter valor já recebido ({money(job.paid)}) como compensação</span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 border-t border-[var(--line)] bg-[var(--paper)] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--cream)] text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              mode === 'complete'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {mode === 'complete' ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Conclusão</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Confirmar Não Realizado</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
