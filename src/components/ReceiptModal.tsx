import React, { useState } from 'react';
import {
  X,
  Printer,
  FileDown,
  Receipt,
  Building2,
  Scroll,
  Sparkles,
  QrCode,
  MapPin,
  CheckCircle,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { Job, Client } from '../types';
import {
  money,
  dateLabel,
  calculateHours,
  calculateTotal,
  calculatePaid,
  calculateDue,
  hlabel,
  getServiceStatus,
  today,
  valorPorExtenso,
} from '../utils';
import {
  printElementDirectly,
  generateElementPDF,
  generateElementPNG,
} from '../utils/printReceipt';

export type ReceiptTemplate = 'cupom' | 'corporate' | 'classic' | 'modern';

interface ReceiptModalProps {
  job: Job | null;
  client?: Client;
  onClose: () => void;
  userName?: string;
  crf?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  job,
  client,
  onClose,
  userName = 'Profissional',
  crf = '',
}) => {
  const [template, setTemplate] = useState<ReceiptTemplate>(() => {
    return (localStorage.getItem('calculos_receipt_template') as ReceiptTemplate) || 'cupom';
  });

  const [pixKey, setPixKey] = useState<string>(() => {
    return localStorage.getItem('calculos_pix_key') || '';
  });

  const [isEditingPix, setIsEditingPix] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  if (!job) return null;

  const totalVal = calculateTotal(job);
  const paidVal = calculatePaid(job);
  const dueVal = calculateDue(job);
  const netHours = calculateHours(job);
  const status = getServiceStatus(job);
  const transportVal = Number(job.transport) || 0;
  const transportPaid = job.transportstatus === 'paid' ? transportVal : 0;
  const totalReceivedAll = paidVal + transportPaid;
  const totalPendingAll = dueVal + (job.transportstatus === 'paid' ? 0 : transportVal);

  const handleSelectTemplate = (t: ReceiptTemplate) => {
    setTemplate(t);
    try {
      localStorage.setItem('calculos_receipt_template', t);
    } catch {}
  };

  const handleSavePix = (val: string) => {
    setPixKey(val);
    try {
      localStorage.setItem('calculos_pix_key', val);
    } catch {}
  };

  // Impressão nativa corrigida para iPhone (Safari) e navegadores: clona para o body sem ancestors restritivos
  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      const docTitle = `Comprovante_${job.profession.replace(/[^a-zA-Z0-9]/g, '_')}_${job.date}`;
      await printElementDirectly({
        elementId: 'receipt-print-area',
        documentTitle: docTitle,
        template,
      });
    } catch (err) {
      console.error('Erro na impressão:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  // Salvar em PDF genuíno (.pdf) via jsPDF: funciona sem risco de folha em branco
  const handleSavePDF = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setFeedbackNotice(null);

    const safeTitle = `Comprovante_${job.profession.replace(/[^a-zA-Z0-9]/g, '_')}_${job.date}`;
    const res = await generateElementPDF('receipt-print-area', safeTitle, `Comprovante - ${job.profession}`);

    setIsGeneratingPdf(false);
    if (res.success) {
      setFeedbackNotice(res.shared ? 'PDF compartilhado!' : 'PDF salvo com sucesso!');
      setTimeout(() => setFeedbackNotice(null), 3500);
    } else {
      alert(`Erro ao gerar PDF: ${res.error || 'Tente a opção Imprimir'}`);
    }
  };

  // Gerar imagem em alta resolução (PNG) para enviar no WhatsApp ou salvar nas Fotos
  const handleSaveImage = async () => {
    if (isGeneratingImg) return;
    setIsGeneratingImg(true);
    setFeedbackNotice(null);

    const safeTitle = `Comprovante_${job.profession.replace(/[^a-zA-Z0-9]/g, '_')}_${job.date}`;
    const res = await generateElementPNG('receipt-print-area', safeTitle, `Comprovante - ${job.profession}`);

    setIsGeneratingImg(false);
    if (res.success) {
      setFeedbackNotice(res.shared ? 'Imagem compartilhada!' : 'Imagem PNG salva com sucesso!');
      setTimeout(() => setFeedbackNotice(null), 3500);
    } else {
      alert(`Erro ao gerar imagem: ${res.error || 'Tente novamente'}`);
    }
  };

  const handleCopyWhatsApp = () => {
    const lines = [
      `🧾 *COMPROVANTE DE PRESTAÇÃO DE SERVIÇOS*`,
      `================================`,
      `👤 *Profissional:* ${userName}${crf ? ` (${crf})` : ''}`,
      `📅 *Data do Serviço:* ${dateLabel(job.date)}`,
      `📍 *Local:* ${job.place}`,
      client?.name ? `🏢 *Cliente/Tomador:* ${client.name}` : '',
      `⏰ *Jornada:* ${job.start} às ${job.end} (${hlabel(netHours)})`,
      job.task ? `📋 *Atividade:* ${job.task}` : '',
      `--------------------------------`,
      `💼 *Serviço (${job.profession}):* ${money(totalVal)}`,
      transportVal > 0 ? `🚌 *Vale-Transporte:* ${money(transportVal)} (${job.transportstatus === 'paid' ? 'Recebido' : 'A receber'})` : '',
      job.expenses > 0 ? `🧾 *Despesas:* -${money(job.expenses)}` : '',
      `--------------------------------`,
      `💰 *Total Geral:* ${money(totalVal + transportVal)}`,
      `✅ *Valor Já Recebido:* ${money(totalReceivedAll)}`,
      `⏳ *Saldo a Pagar:* ${money(totalPendingAll)}`,
      `📌 *Situação:* ${status === 'paid' ? 'Pago / Liquidado' : status === 'partial' ? 'Pagamento Parcial' : 'Pendente de Pagamento'}`,
      job.dueDate && dueVal > 0.01 ? `🗓️ *Previsão de Pagamento:* ${dateLabel(job.dueDate)}` : '',
      pixKey ? `🔑 *Chave Pix para Transferência:* ${pixKey}` : '',
      `================================`,
      `_Comprovante gerado pelo Freelas_`
    ].filter(Boolean).join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(lines).then(() => {
        setCopiedWhatsApp(true);
        setTimeout(() => setCopiedWhatsApp(false), 2500);
      }).catch(() => {});
    }
  };

  const currentDate = new Date();
  const dateInFull = currentDate.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const receiptCode = (job.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || '001002').toUpperCase();
  const timeNow = currentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="receipt-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs">
      <div className="receipt-modal-box relative w-full max-w-3xl max-h-[94vh] flex flex-col bg-[var(--paper)] border border-[var(--line)] rounded-3xl shadow-2xl text-[var(--ink)] overflow-hidden">
        {/* TOP TOOLBAR (Hidden in print) */}
        <div className="no-print p-4 sm:p-5 border-b border-[var(--line)] bg-[var(--cream)]/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--copper)] flex items-center gap-1.5">
              <span>Modelos de Recibo & Comprovante</span>
              {crf && (
                <span className="px-1.5 py-0.5 rounded-md bg-[var(--sage)] text-[var(--g)] text-[9px] font-mono font-bold">
                  {crf}
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--ink)]">
              Visualização e Emissão do Comprovante
            </h3>
          </div>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-wrap">
            {/* Imprimir Direto (Zero Folha em Branco no iPhone) */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] transition-colors shadow-sm disabled:opacity-60"
              title="Imprimir comprovante sem cortes (iPhone, Android e PC)"
            >
              {isPrinting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>{isPrinting ? 'Preparando...' : '🖨️ Imprimir'}</span>
            </button>

            {/* Salvar PDF Genuíno */}
            <button
              type="button"
              onClick={handleSavePDF}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-xs bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              title="Gerar e salvar arquivo PDF do comprovante"
            >
              {isGeneratingPdf ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingPdf ? 'Gerando PDF...' : '📄 Salvar PDF'}</span>
            </button>

            {/* Salvar Imagem para WhatsApp / Fotos */}
            <button
              type="button"
              onClick={handleSaveImage}
              disabled={isGeneratingImg}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-xs bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60"
              title="Salvar como imagem nítida para o WhatsApp"
            >
              {isGeneratingImg ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingImg ? 'Gerando Imagem...' : '🖼️ Imagem'}</span>
            </button>

            {/* Copiar WhatsApp */}
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors border shadow-xs ${
                copiedWhatsApp
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-[var(--paper)] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
              title="Copiar texto formatado para o WhatsApp"
            >
              <span>{copiedWhatsApp ? '✓ Copiado!' : '💬 WhatsApp'}</span>
            </button>

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER SE SALVOU PDF OU IMAGEM */}
        {feedbackNotice && (
          <div className="no-print bg-emerald-600 text-white text-xs px-4 py-2 font-bold flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" /> {feedbackNotice}
            </span>
            <button
              type="button"
              onClick={() => setFeedbackNotice(null)}
              className="text-white hover:text-emerald-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* TEMPLATE TABS (Hidden in print) */}
        <div className="no-print px-4 py-2.5 bg-[var(--paper)] border-b border-[var(--line)] flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => handleSelectTemplate('cupom')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              template === 'cupom'
                ? 'bg-[var(--sage)] text-[var(--g)] ring-2 ring-[var(--g)]/30 shadow-xs'
                : 'text-[var(--muted)] hover:bg-[var(--cream)] hover:text-[var(--ink)]'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>🧾 Cupom Fiscal / Térmico</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTemplate('corporate')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              template === 'corporate'
                ? 'bg-[var(--sage)] text-[var(--g)] ring-2 ring-[var(--g)]/30 shadow-xs'
                : 'text-[var(--muted)] hover:bg-[var(--cream)] hover:text-[var(--ink)]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>🏢 Fatura Comercial</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTemplate('classic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              template === 'classic'
                ? 'bg-[var(--sage)] text-[var(--g)] ring-2 ring-[var(--g)]/30 shadow-xs'
                : 'text-[var(--muted)] hover:bg-[var(--cream)] hover:text-[var(--ink)]'
            }`}
          >
            <Scroll className="w-3.5 h-3.5" />
            <span>📜 Recibo Clássico</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTemplate('modern')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              template === 'modern'
                ? 'bg-[var(--sage)] text-[var(--g)] ring-2 ring-[var(--g)]/30 shadow-xs'
                : 'text-[var(--muted)] hover:bg-[var(--cream)] hover:text-[var(--ink)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>💎 Extrato Executivo</span>
          </button>
        </div>

        {/* PRINT CANVAS AREA */}
        <div className="receipt-modal-body flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-100/70 dark:bg-[#121614] flex justify-center">
          {/* Container with id="receipt-print-area" for 100% strict print isolation */}
          <div
            id="receipt-print-area"
            className={`receipt-printable-canvas ${
              template === 'cupom' ? 'cupom-fiscal-style max-w-[420px]' : 'max-w-[760px]'
            } w-full bg-white text-slate-900 shadow-xl rounded-2xl p-5 sm:p-7 border border-slate-200 block`}
          >
            {/* ======================================================== */}
            {/* MODELO: CUPOM FISCAL / COMPROVANTE TÉRMICO (COM CRF) */}
            {/* ======================================================== */}
            {template === 'cupom' && (
              <div className="font-mono text-xs text-slate-900 space-y-3 leading-tight select-text">
                {/* Header Cupom */}
                <div className="text-center space-y-1">
                  <div className="text-[11px] font-bold tracking-widest">
                    ========================================
                  </div>
                  <div className="font-black text-sm uppercase tracking-wider text-slate-900">
                    COMPROVANTE DE SERVIÇOS
                  </div>
                  <div className="text-[11px] font-bold tracking-widest">
                    ========================================
                  </div>

                  <div className="pt-1">
                    <div className="font-bold text-sm uppercase">{userName}</div>
                    {crf ? (
                      <div className="font-bold text-xs bg-slate-100 py-0.5 px-2 rounded-sm inline-block my-0.5 border border-slate-300">
                        REGISTRO / CONSELHO: {crf}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 uppercase">
                        PRESTADOR DE SERVIÇOS AUTÔNOMO
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-600 flex justify-between pt-1 border-t border-dashed border-slate-400">
                    <span>EMISSÃO: {dateLabel(today())} {timeNow}</span>
                    <span>CÓD: #{receiptCode}</span>
                  </div>
                </div>

                {/* Tomador e Local */}
                <div className="text-[11px] border-y border-dashed border-slate-400 py-2 space-y-1">
                  <div>
                    <span className="text-slate-500">CLIENTE/TOMADOR:</span>{' '}
                    <b>{client?.name || job.place}</b>
                  </div>
                  {client?.phone && (
                    <div>
                      <span className="text-slate-500">TEL/CONTATO:</span> {client.phone}
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">LOCAL EXECUÇÃO:</span> {job.place}
                  </div>
                  <div>
                    <span className="text-slate-500">DATA SERVIÇO:</span> <b>{dateLabel(job.date)}</b>
                  </div>
                  <div>
                    <span className="text-slate-500">HORÁRIO:</span> {job.start} às {job.end} ({hlabel(netHours)})
                  </div>
                  {job.task && (
                    <div>
                      <span className="text-slate-500">ATIVIDADE:</span> {job.task}
                    </div>
                  )}
                </div>

                {/* Itens do Cupom */}
                <div>
                  <div className="text-[10px] font-bold pb-1 text-slate-600 border-b border-dashed border-slate-300 flex justify-between">
                    <span>DESCRIÇÃO</span>
                    <span>VALOR</span>
                  </div>

                  <div className="py-2 space-y-1.5 text-xs">
                    {/* Serviço Principal */}
                    <div className="flex justify-between items-start">
                      <div className="max-w-[70%]">
                        <div className="font-bold uppercase">{job.profession}</div>
                        <div className="text-[10px] text-slate-500">
                          {job.ratetype === 'hourly'
                            ? `${netHours.toFixed(2)}h x ${money(job.rate)}/h`
                            : '1x Diária Fechada'}
                        </div>
                      </div>
                      <div className="font-bold">
                        {money(job.ratetype === 'hourly' ? netHours * (job.rate || 0) : job.fixed)}
                      </div>
                    </div>

                    {/* Horas Extras */}
                    {job.extraHours > 0 && (
                      <div className="flex justify-between items-start">
                        <div>
                          <div>HORAS EXTRAS</div>
                          <div className="text-[10px] text-slate-500">
                            {job.extraHours}h x {money(job.extraRate)}
                          </div>
                        </div>
                        <div className="font-bold">
                          {money(job.extraHours * job.extraRate)}
                        </div>
                      </div>
                    )}

                    {/* Vale-Transporte */}
                    {transportVal > 0 && (
                      <div className="flex justify-between items-start">
                        <div>
                          <div>VALE-TRANSPORTE</div>
                          <div className="text-[10px] text-slate-500">
                            {job.transportstatus === 'paid' ? 'RECEBIDO' : 'A RECEBER'}
                          </div>
                        </div>
                        <div className="font-bold">{money(transportVal)}</div>
                      </div>
                    )}

                    {/* Despesas */}
                    {job.expenses > 0 && (
                      <div className="flex justify-between items-start text-slate-600">
                        <div>
                          <div>DESPESAS REALIZADAS</div>
                          {job.expenseNote && (
                            <div className="text-[10px] text-slate-500">{job.expenseNote}</div>
                          )}
                        </div>
                        <div>- {money(job.expenses)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Totais do Cupom */}
                <div className="border-t-2 border-slate-900 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>TOTAL SERVIÇOS:</span>
                    <span>{money(totalVal)}</span>
                  </div>
                  {transportVal > 0 && (
                    <div className="flex justify-between">
                      <span>VALE-TRANSPORTE:</span>
                      <span>{money(transportVal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>VALOR JÁ PAGO:</span>
                    <span>{money(totalReceivedAll)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-slate-900 border-t border-dashed border-slate-400 pt-1">
                    <span>SALDO PENDENTE:</span>
                    <span>{money(totalPendingAll)}</span>
                  </div>
                </div>

                {/* Status e Forma de Pagamento */}
                <div className="border border-slate-400 p-2 rounded-sm bg-slate-50 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>SITUAÇÃO:</span>
                    <b className={status === 'paid' ? 'text-emerald-800' : 'text-amber-800'}>
                      [{status === 'paid' ? 'PAGO / LIQUIDADO' : status === 'partial' ? 'PARCIALMENTE PAGO' : 'PENDENTE DE PAGAMENTO'}]
                    </b>
                  </div>
                  {job.method && (
                    <div className="flex justify-between">
                      <span>FORMA:</span>
                      <b>{job.method} {job.paydate ? `em ${dateLabel(job.paydate)}` : ''}</b>
                    </div>
                  )}
                  {job.dueDate && dueVal > 0.01 && (
                    <div className="flex justify-between text-amber-800">
                      <span>PREVISTO PARA:</span>
                      <b>{dateLabel(job.dueDate)}</b>
                    </div>
                  )}
                </div>

                {/* Chave Pix no cupom */}
                <div className="text-[10px] bg-slate-100 p-2 rounded-sm border border-dashed border-slate-300">
                  <div className="flex items-center justify-between font-bold mb-0.5">
                    <span>CHAVE PIX PARA TRANSFERÊNCIA:</span>
                    <div className="no-print">
                      <button
                        type="button"
                        onClick={() => setIsEditingPix(!isEditingPix)}
                        className="text-[9px] text-blue-700 underline"
                      >
                        {pixKey ? 'Alterar' : '＋ Inserir'}
                      </button>
                    </div>
                  </div>
                  {isEditingPix ? (
                    <div className="no-print flex items-center gap-1 mt-1">
                      <input
                        type="text"
                        placeholder="Chave Pix (CPF, tel, e-mail...)"
                        value={pixKey}
                        onChange={(e) => handleSavePix(e.target.value)}
                        className="w-full text-xs p-1 border rounded-sm bg-white"
                      />
                    </div>
                  ) : (
                    <div className="font-mono font-bold select-all text-slate-900">
                      {pixKey || 'Não informada'}
                    </div>
                  )}
                </div>

                {/* Assinatura e Autenticação */}
                <div className="pt-4 text-center space-y-1">
                  <div className="w-48 mx-auto border-t border-slate-700 pt-1 text-[11px]">
                    <div className="font-bold">{userName}</div>
                    {crf ? <div className="text-[10px] font-bold">{crf}</div> : null}
                    <div className="text-[9px] text-slate-500">RESPONSÁVEL / EMISSOR</div>
                  </div>

                  <div className="text-[9px] text-slate-500 pt-2 font-mono">
                    AUTENTICAÇÃO: {job.id.slice(0, 20).toUpperCase()}
                  </div>
                  <div className="text-[10px] font-bold tracking-widest">
                    ========================================
                  </div>
                  <div className="text-[9px] text-slate-500 uppercase">
                    OBRIGADO PELA PREFERÊNCIA!
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* MODELO 1: FATURA COMERCIAL (CORPORATE COM CRF) */}
            {/* ======================================================== */}
            {template === 'corporate' && (
              <div className="space-y-6 text-slate-800">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-5 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-[#163c35] text-white flex items-center justify-center font-serif text-xl font-bold">
                        ∑
                      </div>
                      <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
                          {userName}
                        </h1>
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          {crf ? (
                            <span className="font-bold text-[#163c35] bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-200">
                              {crf}
                            </span>
                          ) : (
                            <span>Prestação de Serviços Autônomos</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                      Documento de Cobrança
                    </div>
                    <div className="text-base font-extrabold text-slate-900 font-mono">
                      FATURA #{receiptCode}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Emissão: <b>{dateLabel(today())}</b>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-block text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-md ${
                          status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : status === 'partial'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {status === 'paid' ? '● Fatura Liquidada' : status === 'partial' ? '● Pagamento Parcial' : '● Pagamento Pendente'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Parties Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Dados do Contratante / Cliente
                    </span>
                    <strong className="text-sm font-bold text-slate-900 block">
                      {client?.name || job.place}
                    </strong>
                    {client?.phone && <p className="text-slate-600 mt-0.5">Telefone: {client.phone}</p>}
                    {client?.address && <p className="text-slate-600 mt-0.5">Endereço: {client.address}</p>}
                    <p className="text-slate-600 mt-0.5">
                      Local da prestação: <b>{job.place}</b>
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Dados da Execução
                    </span>
                    <p className="text-slate-700">Data: <b>{dateLabel(job.date)}</b></p>
                    <p className="text-slate-700">Função: <b>{job.profession}</b></p>
                    <p className="text-slate-700">
                      Jornada: <b>{job.start} às {job.end}</b> ({hlabel(netHours)} líquidas)
                    </p>
                    {job.break > 0 && (
                      <p className="text-slate-500 text-[11px]">Intervalo: {job.break} min</p>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-900 text-slate-900 text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Item / Descrição</th>
                        <th className="py-2.5 px-3 text-center">Ref.</th>
                        <th className="py-2.5 px-3 text-right">Valor Unitário</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-3 px-3">
                          <b className="text-slate-900 block">{job.profession}</b>
                          <span className="text-[11px] text-slate-500 block">
                            {job.task || 'Prestação de serviços no dia'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 font-mono">
                          {job.ratetype === 'hourly' ? `${netHours.toFixed(2)}h` : '1 diária'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 font-mono">
                          {money(job.ratetype === 'hourly' ? job.rate : job.fixed)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                          {money(job.ratetype === 'hourly' ? netHours * (job.rate || 0) : job.fixed)}
                        </td>
                      </tr>

                      {job.extraHours > 0 && (
                        <tr>
                          <td className="py-2 px-3 font-semibold">Horas Extras</td>
                          <td className="py-2 px-3 text-center font-mono">{job.extraHours}h</td>
                          <td className="py-2 px-3 text-right font-mono">{money(job.extraRate)}</td>
                          <td className="py-2 px-3 text-right font-bold font-mono">{money(job.extraHours * job.extraRate)}</td>
                        </tr>
                      )}

                      {transportVal > 0 && (
                        <tr>
                          <td className="py-2 px-3">
                            <span className="font-semibold">Vale-Transporte</span>
                            <span className="text-[10px] text-slate-500 block">
                              Situação: {job.transportstatus === 'paid' ? 'Recebido' : 'Pendente'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono">1 un</td>
                          <td className="py-2 px-3 text-right font-mono">{money(transportVal)}</td>
                          <td className="py-2 px-3 text-right font-bold font-mono">{money(transportVal)}</td>
                        </tr>
                      )}

                      {job.expenses > 0 && (
                        <tr className="text-slate-600">
                          <td className="py-2 px-3">Despesas Reembolsáveis ({job.expenseNote || 'do serviço'})</td>
                          <td className="py-2 px-3 text-center font-mono">1 un</td>
                          <td className="py-2 px-3 text-right font-mono">- {money(job.expenses)}</td>
                          <td className="py-2 px-3 text-right font-bold font-mono text-rose-600">- {money(job.expenses)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                  <div className="text-xs text-slate-600 max-w-sm space-y-1">
                    <p className="font-bold text-slate-900">Forma de Pagamento:</p>
                    <p>{job.method || 'Ainda não informado'}</p>
                    {pixKey && <p className="font-mono text-[11px]">Chave Pix: {pixKey}</p>}
                    {job.dueDate && (
                      <p className="text-[11px] text-slate-500">Vencimento: {dateLabel(job.dueDate)}</p>
                    )}
                  </div>

                  <div className="w-full sm:w-64 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Serviços:</span>
                      <span className="font-mono">{money(totalVal)}</span>
                    </div>
                    {transportVal > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Vale-Transporte:</span>
                        <span className="font-mono">{money(transportVal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-emerald-700 border-t border-slate-200 pt-1.5">
                      <span>Valor Pago:</span>
                      <span className="font-mono">{money(totalReceivedAll)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-base text-slate-900 border-t-2 border-slate-900 pt-2">
                      <span>Saldo a Pagar:</span>
                      <span className="font-mono text-[#163c35]">{money(totalPendingAll)}</span>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold text-slate-900">{userName}</p>
                    <p className="text-[10px] text-slate-500">{crf ? crf : 'Prestador de Serviço'}</p>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold text-slate-900">{client?.name || 'Cliente / Contratante'}</p>
                    <p className="text-[10px] text-slate-500">Aceite e Conformidade</p>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* MODELO 2: RECIBO CLÁSSICO BRASILEIRO (COM CRF) */}
            {/* ======================================================== */}
            {template === 'classic' && (
              <div className="space-y-6 text-slate-800 border-4 border-double border-slate-800 p-6 sm:p-8 rounded-lg relative">
                <div className="flex flex-col sm:flex-row items-center justify-between border-b-2 border-slate-800 pb-4 gap-3 text-center sm:text-left">
                  <div>
                    <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 block">
                      REPÚBLICA FEDERATIVA DO BRASIL
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight font-serif uppercase">
                      RECIBO DE PAGAMENTO
                    </h2>
                  </div>

                  <div className="border-2 border-slate-900 px-4 py-2 rounded-md bg-slate-50 text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                      VALOR DO RECIBO
                    </span>
                    <span className="text-xl font-black font-mono text-slate-900">
                      {money(totalVal)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-slate-600 font-mono">
                  <span>Nº DO RECIBO: <b>{receiptCode}</b></span>
                  <span>DATA: <b>{dateLabel(job.date)}</b></span>
                </div>

                <div className="text-sm leading-relaxed text-justify text-slate-800 p-4 bg-slate-50/70 border border-slate-200 rounded-md font-serif">
                  <p>
                    Recebi(emos) de <b>{client?.name || job.place}</b>
                    {client?.address ? `, com endereço em ${client.address}` : ''}
                    , a quantia líquida de{' '}
                    <b className="underline decoration-slate-400 uppercase">
                      {valorPorExtenso(totalVal)}
                    </b>{' '}
                    ({money(totalVal)}), referente aos serviços profissionais de{' '}
                    <b>{job.profession}</b>
                    {crf ? ` (${crf})` : ''}
                    {job.task ? ` - ${job.task}` : ''}, desempenhados no local{' '}
                    <b>{job.place}</b>, na jornada de {job.start} às {job.end} (total de {hlabel(netHours)} líquidas).
                  </p>
                </div>

                <div className="text-xs border border-slate-300 rounded-md overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 border-b border-slate-300 uppercase tracking-wider text-[10px]">
                    Discriminação dos Valores e Transporte
                  </div>
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Serviço:</span>
                      <b className="font-mono">{money(totalVal)}</b>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Já Recebido:</span>
                      <b className="font-mono text-emerald-700">{money(paidVal)}</b>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Vale-Transporte:</span>
                      <b className="font-mono">
                        {money(transportVal)} ({job.transportstatus === 'paid' ? 'Quitado' : 'Pendente'})
                      </b>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Forma Pagto:</span>
                      <b>{job.method || 'A combinar'}</b>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-justify text-slate-600 italic">
                  "Pelo que, para clareza e firmeza do que foi acordado, firmo o presente documento dando plena, geral e irrevogável quitação da quantia acima discriminada após compensação."
                </p>

                <div className="pt-4 flex flex-col items-end">
                  <p className="text-xs text-slate-700 mb-8 font-serif">
                    Brasil, {dateInFull}.
                  </p>
                  <div className="w-64 text-center border-t border-slate-800 pt-2 text-xs">
                    <p className="font-bold text-slate-900">{userName}</p>
                    {crf ? <p className="text-[10px] font-bold text-slate-700">{crf}</p> : null}
                    <p className="text-[11px] text-slate-500">Assinatura do Prestador(a)</p>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* MODELO 3: EXTRATO EXECUTIVO TECH (COM CRF) */}
            {/* ======================================================== */}
            {template === 'modern' && (
              <div className="space-y-6 text-slate-800">
                <div className="p-5 rounded-2xl bg-[#163c35] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xl text-emerald-200">
                      F
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-300">
                        Extrato Profissional · Freelas
                      </span>
                      <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span>{userName}</span>
                        {crf && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-500 font-mono font-bold">
                            {crf}
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-emerald-100/80">
                        {job.profession} · {dateLabel(job.date)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        status === 'paid'
                          ? 'bg-emerald-400 text-emerald-950'
                          : status === 'partial'
                          ? 'bg-blue-300 text-blue-950'
                          : 'bg-amber-300 text-amber-950'
                      }`}
                    >
                      {status === 'paid' && <CheckCircle className="w-3.5 h-3.5" />}
                      {status === 'partial' && <Clock className="w-3.5 h-3.5" />}
                      {status === 'pending' && <AlertCircle className="w-3.5 h-3.5" />}
                      <span>{status === 'paid' ? '100% PAGO' : status === 'partial' ? 'PARCIAL' : 'EM ABERTO'}</span>
                    </div>
                    <div className="text-[11px] text-emerald-200 mt-1 font-mono">
                      CÓD: {receiptCode}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Jornada Realizada
                    </span>
                    <strong className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {hlabel(netHours)}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">
                      {job.start} às {job.end}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total do Serviço
                    </span>
                    <strong className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {money(totalVal)}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">
                      {job.ratetype === 'hourly' ? `${money(job.rate)}/h` : 'Diária fechada'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      {dueVal > 0.01 ? 'Saldo a Pagar' : 'Total Quitado'}
                    </span>
                    <strong className="text-base sm:text-lg font-bold text-emerald-800 font-mono">
                      {dueVal > 0.01 ? money(dueVal) : money(paidVal)}
                    </strong>
                    <span className="text-[10px] text-emerald-600 block">
                      {dueVal > 0.01 ? 'Aguardando' : 'Liquidado'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Local: <b className="text-slate-900">{job.place}</b>
                    </span>
                    {client?.name && (
                      <span className="text-slate-600">
                        Cliente: <b>{client.name}</b>
                      </span>
                    )}
                  </div>

                  {job.task && (
                    <p className="text-slate-600 pt-1">
                      <b className="text-slate-700">Atividade executada:</b> {job.task}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 pt-2 text-[11px] text-slate-600">
                    {transportVal > 0 && (
                      <span>
                        🚌 Vale-Transporte: <b>{money(transportVal)}</b> ({job.transportstatus === 'paid' ? 'Pago' : 'Pendente'})
                      </span>
                    )}
                    {job.expenses > 0 && (
                      <span>
                        🧾 Despesas: <b>{money(job.expenses)}</b> ({job.expenseNote || 'do serviço'})
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-300 bg-emerald-50/50 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <QrCode className="w-4 h-4 text-[#163c35]" />
                      <span>Instruções para Pagamento / Chave Pix</span>
                    </div>

                    <div className="no-print">
                      <button
                        type="button"
                        onClick={() => setIsEditingPix(!isEditingPix)}
                        className="text-[10px] font-bold text-[#163c35] hover:underline"
                      >
                        {isEditingPix ? 'Pronto' : pixKey ? 'Alterar Pix' : '＋ Inserir Chave Pix'}
                      </button>
                    </div>
                  </div>

                  {isEditingPix ? (
                    <div className="no-print flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Digite sua chave Pix"
                        value={pixKey}
                        onChange={(e) => handleSavePix(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-slate-700">
                        {pixKey ? (
                          <>
                            Chave Pix: <b className="font-mono text-slate-900 select-all">{pixKey}</b>
                          </>
                        ) : (
                          <span className="text-slate-500 italic">
                            Chave Pix não informada.
                          </span>
                        )}
                      </div>
                      {job.dueDate && dueVal > 0.01 && (
                        <div className="text-right text-amber-800 font-semibold text-[11px]">
                          Vencimento: {dateLabel(job.dueDate)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold text-slate-900">{userName}</p>
                    <p className="text-[10px] text-slate-500">{crf ? crf : 'Emissor / Prestador'}</p>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold text-slate-900">{client?.name || 'Cliente / Empresa'}</p>
                    <p className="text-[10px] text-slate-500">Validação do Serviço</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
