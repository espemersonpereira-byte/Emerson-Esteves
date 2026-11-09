import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Send,
  Printer,
  FileDown,
  Briefcase,
  X,
  BookOpen,
} from 'lucide-react';
import { Quote, QuoteItem, Client, ServiceCatalogItem, Prefs } from '../types';
import {
  uid,
  today,
  addDays,
  money,
  dateLabel,
  buildWhatsAppUrl,
  formatClientFullAddress,
} from '../utils';
import { printElementDirectly, generateElementPDF } from '../utils/printReceipt';

interface QuotesPageProps {
  quotes: Quote[];
  clients: Client[];
  catalog: ServiceCatalogItem[];
  prefs: Prefs;
  initialOpenNew?: boolean;
  onConsumeOpenNew?: () => void;
  onSaveQuote: (quote: Quote) => void;
  onDeleteQuote: (id: string) => void;
  onConvertQuoteToJob: (quote: Quote) => void;
}

const emptyQuote = (): Quote => ({
  id: '',
  clientId: '',
  clientName: '',
  title: '',
  items: [{ id: uid(), name: '', description: '', quantity: 1, unitPrice: 0 }],
  discount: 0,
  validUntil: addDays(today(), 15),
  paymentTerms: '50% na aprovação e 50% na entrega (Pix ou Transferência)',
  notes: '',
  status: 'draft',
  createdAt: today(),
});

export const QuotesPage: React.FC<QuotesPageProps> = ({
  quotes,
  clients,
  catalog,
  prefs,
  initialOpenNew = false,
  onConsumeOpenNew,
  onSaveQuote,
  onDeleteQuote,
  onConvertQuoteToJob,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Quote>(emptyQuote());
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (initialOpenNew) {
      setFormData(emptyQuote());
      setIsFormOpen(true);
      if (onConsumeOpenNew) onConsumeOpenNew();
    }
  }, [initialOpenNew, onConsumeOpenNew]);

  const calcSubtotal = (items: QuoteItem[]) =>
    items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const calcTotal = (q: Quote) =>
    Math.max(0, calcSubtotal(q.items) - (Number(q.discount) || 0));

  const handleOpenNew = () => {
    setFormData(emptyQuote());
    setIsFormOpen(true);
  };

  const handleEdit = (q: Quote) => {
    setFormData({ ...q, items: q.items.map((i) => ({ ...i })) });
    setIsFormOpen(true);
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { id: uid(), name: '', description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const handleAddCatalogItem = (catalogId: string) => {
    const item = catalog.find((c) => c.id === catalogId);
    if (!item) return;
    setFormData((prev) => ({
      ...prev,
      title: prev.title || item.name,
      items: [
        ...prev.items.filter((i) => i.name.trim() !== '' || i.unitPrice > 0),
        {
          id: uid(),
          name: item.name,
          description: item.description,
          quantity: 1,
          unitPrice: item.suggestedPrice,
        },
      ],
    }));
  };

  const handleUpdateItem = (id: string, field: keyof QuoteItem, val: any) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, [field]: val } : it)),
    }));
  };

  const handleRemoveItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((it) => it.id !== id) : prev.items,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const cli = clients.find((c) => c.id === formData.clientId);
    onSaveQuote({
      ...formData,
      id: formData.id || uid(),
      clientName: cli ? cli.name : formData.clientName.trim() || 'Cliente',
      title: formData.title.trim(),
      discount: Number(formData.discount) || 0,
      createdAt: formData.createdAt || today(),
    });
    setIsFormOpen(false);
  };

  const handleShareWhatsApp = (q: Quote) => {
    const cli = clients.find((c) => c.id === q.clientId);
    const total = calcTotal(q);
    const itemsLines = q.items
      .map((i) => `• ${i.quantity}x ${i.name}: ${money(i.quantity * i.unitPrice)}`)
      .join('\n');

    const msg = `📄 *ORÇAMENTO PROFISSIONAL — ${prefs.companyName || prefs.name || 'FREELAS'}*\n\n` +
      `*Cliente:* ${cli?.name || q.clientName}\n` +
      `*Proposta:* ${q.title}\n` +
      `*Validade:* ${dateLabel(q.validUntil)}\n\n` +
      `*Itens / Serviços:*\n${itemsLines}\n\n` +
      (q.discount > 0 ? `*Desconto:* -${money(q.discount)}\n` : '') +
      `💰 *VALOR TOTAL:* *${money(total)}*\n` +
      `*Condições:* ${q.paymentTerms || 'A combinar'}\n\n` +
      `Fico à disposição para aprovarmos e agendarmos o serviço!`;

    const phone = cli?.whatsapp || cli?.phone || '';
    if (phone && phone.replace(/\D/g, '').length >= 8) {
      window.open(buildWhatsAppUrl(phone, msg), '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    }
  };

  const getStatusBadge = (status: Quote['status']) => {
    const map: Record<Quote['status'], { label: string; cls: string }> = {
      draft: { label: 'Rascunho', cls: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
      sent: { label: 'Enviado', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
      approved: { label: '✓ Aprovado', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
      rejected: { label: 'Recusado', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
      expired: { label: 'Expirado', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    };
    const item = map[status] || map.draft;
    return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.cls}`}>{item.label}</span>;
  };

  const filteredQuotes = quotes
    .filter((q) => (statusFilter === 'all' ? true : q.status === statusFilter))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
            Propostas Comerciais
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5">
            Orçamentos ({quotes.length})
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Crie orçamentos profissionais, gere PDF, envie por WhatsApp e converta propostas aprovadas em trabalho com 1 clique.
          </p>
        </div>

        <button
          type="button"
          onClick={() => (isFormOpen ? setIsFormOpen(false) : handleOpenNew())}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
        >
          {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isFormOpen ? 'Fechar Formulário' : 'Criar Orçamento'}</span>
        </button>
      </div>

      {/* Quote Creation / Edit Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 rounded-3xl bg-[var(--paper)] border-2 border-[var(--g)] shadow-lg space-y-5 text-xs animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <h3 className="text-base font-extrabold text-[var(--ink)]">
              {formData.id ? 'Editar Orçamento' : 'Novo Orçamento Profissional'}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold mb-1">Selecionar Cliente Cadastrado</label>
              <select
                value={formData.clientId}
                onChange={(e) => {
                  const cid = e.target.value;
                  const cli = clients.find((c) => c.id === cid);
                  setFormData({
                    ...formData,
                    clientId: cid,
                    clientName: cli ? cli.name : formData.clientName,
                  });
                }}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              >
                <option value="">— Escolher cliente —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">Nome do Cliente / Empresa *</label>
              <input
                type="text"
                required
                placeholder="Nome do destinatário"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">Status do Orçamento</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Quote['status'] })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold"
              >
                <option value="draft">Rascunho</option>
                <option value="sent">Enviado</option>
                <option value="approved">Aprovado</option>
                <option value="rejected">Recusado</option>
                <option value="expired">Expirado</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold mb-1">Título da Proposta / Serviço *</label>
              <input
                type="text"
                required
                placeholder="Ex.: Instalação Elétrica Completa, Reforma Residencial, Website Institucional"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">Data de Validade *</label>
              <input
                type="date"
                required
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3 pt-2 border-t border-[var(--line)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-sm text-[var(--ink)]">Itens e Serviços do Orçamento</span>
              <div className="flex items-center gap-2">
                {catalog.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddCatalogItem(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="p-2 rounded-xl border border-[var(--g)]/40 bg-[var(--sage)] text-[var(--g)] font-bold text-xs"
                  >
                    <option value="">+ Importar do Catálogo</option>
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({money(c.suggestedPrice)})
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-2 rounded-xl bg-[var(--cream)] hover:bg-[var(--line)] text-[var(--ink)] font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Item
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {formData.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-[var(--cream)]/60 border border-[var(--line)] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-[var(--muted)] mb-1">
                      Serviço / Item #{idx + 1} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nome do serviço ou material"
                      value={item.name}
                      onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                      className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-[var(--muted)] mb-1">
                      Descrição técnica
                    </label>
                    <input
                      type="text"
                      placeholder="Detalhes do item"
                      value={item.description}
                      onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                      className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-[var(--muted)] mb-1">Qtd</label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[var(--muted)] mb-1">
                      Valor Unit. (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice || ''}
                      onChange={(e) => handleUpdateItem(item.id, 'unitPrice', Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 rounded-xl text-[#DC4545] hover:bg-[#DC4545]/10 cursor-pointer"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discount, Payment Terms & Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--line)]">
            <div>
              <label className="block text-[11px] font-bold mb-1">Desconto Concedido (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.discount || ''}
                onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold mb-1">Condições de Pagamento</label>
              <input
                type="text"
                placeholder="Ex.: Pix à vista com 5% de desconto ou parcelado"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold mb-1">Observações e Garantias</label>
              <textarea
                rows={2}
                placeholder="Prazo de execução, validade da garantia, materiais inclusos..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#101D32] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs space-y-0.5">
              <div>Subtotal: <b>{money(calcSubtotal(formData.items))}</b></div>
              {formData.discount > 0 && (
                <div className="text-[#60A5FA]">Desconto: - {money(formData.discount)}</div>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
                Total Final do Orçamento
              </span>
              <strong className="text-2xl font-extrabold font-mono text-white">
                {money(calcTotal(formData))}
              </strong>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl border border-[var(--line)] text-[var(--muted)] font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[var(--g)] text-white font-bold shadow-sm cursor-pointer"
            >
              Salvar Orçamento
            </button>
          </div>
        </form>
      )}

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: `Todos (${quotes.length})` },
          { id: 'draft', label: 'Rascunhos' },
          { id: 'sent', label: 'Enviados' },
          { id: 'approved', label: 'Aprovados' },
          { id: 'rejected', label: 'Recusados' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              statusFilter === f.id
                ? 'bg-[var(--g)] text-white'
                : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <div className="text-center py-14 px-6 rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)]">
          <FileText className="w-10 h-10 mx-auto mb-2 text-[var(--muted)] opacity-50" />
          <h4 className="text-sm font-bold text-[var(--ink)]">Nenhum orçamento encontrado</h4>
          <p className="text-xs text-[var(--muted)] max-w-xs mx-auto mt-1 mb-4">
            Crie orçamentos detalhados para enviar aos seus clientes em PDF ou WhatsApp.
          </p>
          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-[var(--g)] text-white text-xs font-bold cursor-pointer"
          >
            + Criar Primeiro Orçamento
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredQuotes.map((q) => {
            const total = calcTotal(q);
            return (
              <div
                key={q.id}
                className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-[var(--ink)]">{q.title}</h4>
                    {getStatusBadge(q.status)}
                    {q.convertedJobId && (
                      <span className="px-2 py-0.5 rounded-full bg-[#16A36A]/15 text-[#16A36A] text-[10px] font-bold">
                        Convertido em Trabalho
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    Cliente: <b className="text-[var(--ink)]">{q.clientName}</b> · Criado em{' '}
                    {dateLabel(q.createdAt)} · Válido até {dateLabel(q.validUntil)}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {q.items.length} item(s) · {q.paymentTerms}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]">
                  <div className="text-right mr-2">
                    <strong className="font-mono text-lg font-extrabold text-[var(--ink)] block">
                      {money(total)}
                    </strong>
                    <span className="text-[10px] text-[var(--muted)]">valor final</span>
                  </div>

                  {q.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => onSaveQuote({ ...q, status: 'approved' })}
                      className="px-2.5 py-1.5 rounded-xl bg-[#16A36A]/15 text-[#16A36A] hover:bg-[#16A36A] hover:text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Aprovar orçamento"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aprovar</span>
                    </button>
                  )}

                  {!q.convertedJobId && (
                    <button
                      type="button"
                      onClick={() => onConvertQuoteToJob(q)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--g)] text-white text-xs font-bold flex items-center gap-1 shadow-2xs hover:bg-[var(--g2)] cursor-pointer"
                      title="Converter orçamento em trabalho"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Gerar Trabalho</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPreviewQuote(q)}
                    className="px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-[var(--ink)] text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[var(--g)]" />
                    <span>PDF / Imprimir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(q)}
                    className="px-2.5 py-1.5 rounded-xl border border-[#16A36A]/40 text-[#16A36A] text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEdit(q)}
                    className="p-1.5 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Deseja realmente excluir o orçamento "${q.title}"?`)) {
                        onDeleteQuote(q.id);
                      }
                    }}
                    className="p-1.5 rounded-xl text-[#DC4545] hover:bg-[#DC4545]/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print / PDF Preview Modal */}
      {previewQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--cream)]">
              <h3 className="font-bold text-sm text-[var(--ink)]">
                Visualização de Orçamento — Pronto para Impressão / PDF
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    printElementDirectly({
                      elementId: 'quote-print-area',
                      documentTitle: `Orcamento_${previewQuote.title}`,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-[var(--g)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
                <button
                  type="button"
                  onClick={() =>
                    generateElementPDF(
                      'quote-print-area',
                      `Orcamento_${previewQuote.title}`,
                      previewQuote.title
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#101D32] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" /> Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewQuote(null)}
                  className="p-1.5 rounded-xl border border-[var(--line)] text-[var(--muted)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              <div
                id="quote-print-area"
                className="w-full max-w-[740px] bg-white text-slate-900 p-8 rounded-2xl shadow-md space-y-6 text-xs"
              >
                <div className="flex justify-between items-start border-b-2 border-[#101D32] pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                      PROPOSTA COMERCIAL / ORÇAMENTO
                    </span>
                    <h1 className="text-xl font-extrabold text-[#101D32] uppercase mt-0.5">
                      {prefs.companyName || prefs.name || 'Profissional Autônomo'}
                    </h1>
                    <p className="text-slate-600">
                      {prefs.profession || 'Serviços Profissionais'}
                      {prefs.activityType !== 'autonomo' && (prefs.professionalId || prefs.councilNumber || prefs.crf)
                        ? ` · Registro: ${prefs.professionalId || prefs.councilNumber || prefs.crf}`
                        : ''}
                    </p>
                    {prefs.phone && <p className="text-slate-600">Contato: {prefs.phone}</p>}
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-[#101D32]">
                      ORÇAMENTO #{previewQuote.id.slice(0, 6).toUpperCase()}
                    </div>
                    <div className="text-slate-500">Emissão: {dateLabel(previewQuote.createdAt)}</div>
                    <div className="text-slate-700 font-bold">
                      Válido até: {dateLabel(previewQuote.validUntil)}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Cliente / Destinatário
                  </span>
                  <strong className="text-sm text-slate-900">{previewQuote.clientName}</strong>
                  <p className="text-slate-700 mt-1">
                    Referência: <b>{previewQuote.title}</b>
                  </p>
                </div>

                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-[11px] uppercase">
                      <th className="py-2">Item / Serviço</th>
                      <th className="py-2 text-center">Qtd</th>
                      <th className="py-2 text-right">Valor Unit.</th>
                      <th className="py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewQuote.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5">
                          <div className="font-bold text-slate-900">{it.name}</div>
                          {it.description && <div className="text-slate-500 text-[11px]">{it.description}</div>}
                        </td>
                        <td className="py-2.5 text-center font-mono">{it.quantity}</td>
                        <td className="py-2.5 text-right font-mono">{money(it.unitPrice)}</td>
                        <td className="py-2.5 text-right font-mono font-bold">
                          {money(it.quantity * it.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-between items-start pt-4 border-t border-slate-300">
                  <div className="max-w-xs space-y-1">
                    <div className="font-bold text-slate-900">Condições de Pagamento:</div>
                    <p className="text-slate-600">{previewQuote.paymentTerms}</p>
                    {previewQuote.notes && (
                      <>
                        <div className="font-bold text-slate-900 mt-2">Observações:</div>
                        <p className="text-slate-600">{previewQuote.notes}</p>
                      </>
                    )}
                  </div>
                  <div className="w-56 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-mono">{money(calcSubtotal(previewQuote.items))}</span>
                    </div>
                    {previewQuote.discount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Desconto:</span>
                        <span className="font-mono">- {money(previewQuote.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-extrabold text-sm text-[#101D32] border-t border-slate-300 pt-1.5">
                      <span>Total Final:</span>
                      <span className="font-mono">{money(calcTotal(previewQuote))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
