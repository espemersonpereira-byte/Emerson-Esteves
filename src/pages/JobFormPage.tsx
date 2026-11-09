import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Clock,
  DollarSign,
  Bus,
  Receipt,
  Calendar,
  BookOpen,
  Wrench,
} from 'lucide-react';
import { Job, Client, ServiceCatalogItem, JobWorkflowStatus } from '../types';
import {
  today,
  money,
  calculateHours,
  hlabel,
  uid,
  formatClientFullAddress,
} from '../utils';

interface JobFormPageProps {
  initialJob: Job | null;
  clients: Client[];
  catalog?: ServiceCatalogItem[];
  onSaveJob: (job: Job) => void;
  onCancel: () => void;
  distinctProfessions: string[];
}

export const JobFormPage: React.FC<JobFormPageProps> = ({
  initialJob,
  clients,
  catalog = [],
  onSaveJob,
  distinctProfessions,
}) => {
  const [formData, setFormData] = useState<Job>(() => {
    if (initialJob) return initialJob;
    return {
      id: uid(),
      date: today(),
      profession: '',
      place: '',
      task: '',
      clientId: '',
      start: '08:00',
      end: '17:00',
      break: 60,
      ratetype: 'hourly',
      rate: 25,
      fixed: 200,
      extraHours: 0,
      extraRate: 0,
      paid: 0,
      transport: 0,
      transportstatus: 'pending',
      transportDate: '',
      transportMethod: '',
      paydate: '',
      dueDate: '',
      method: '',
      expenses: 0,
      expenseNote: '',
      notes: '',
      status: 'completed',
      materials: '',
      address: '',
      serviceCatalogId: '',
    };
  });

  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (initialJob) {
      setFormData(initialJob);
    } else {
      handleReset();
    }
  }, [initialJob]);

  // Live calculations
  const netHours = calculateHours({
    start: formData.start,
    end: formData.end,
    break: formData.break,
  });

  const baseCalculated =
    formData.ratetype === 'fixed'
      ? Math.max(0, Number(formData.fixed) || 0)
      : netHours * Math.max(0, Number(formData.rate) || 0);

  const extraCalculated =
    Math.max(0, Number(formData.extraHours) || 0) * Math.max(0, Number(formData.extraRate) || 0);

  const totalCalculated = baseCalculated + extraCalculated;

  const handleChange = (field: keyof Job, value: any) => {
    setError('');
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectCatalogItem = (catalogId: string) => {
    const item = catalog.find((c) => c.id === catalogId);
    if (!item) {
      handleChange('serviceCatalogId', '');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      serviceCatalogId: item.id,
      profession: item.name,
      task: item.description || prev.task,
      ratetype: item.priceType,
      rate: item.priceType === 'hourly' ? item.suggestedPrice : prev.rate,
      fixed: item.priceType === 'fixed' ? item.suggestedPrice : prev.fixed,
      materials: item.materials || prev.materials,
      notes: item.notes ? `${prev.notes ? prev.notes + ' · ' : ''}${item.notes}` : prev.notes,
    }));
  };

  const handleSelectClient = (clientId: string) => {
    const cli = clients.find((c) => c.id === clientId);
    if (cli) {
      const fullAddr = formatClientFullAddress(cli);
      setFormData((prev) => ({
        ...prev,
        clientId,
        place: prev.place || cli.name,
        address: prev.address || fullAddr,
      }));
    } else {
      handleChange('clientId', '');
    }
  };

  const handleReset = () => {
    setFormData({
      id: uid(),
      date: today(),
      profession: '',
      place: '',
      task: '',
      clientId: '',
      start: '08:00',
      end: '17:00',
      break: 60,
      ratetype: 'hourly',
      rate: 25,
      fixed: 200,
      extraHours: 0,
      extraRate: 0,
      paid: 0,
      transport: 0,
      transportstatus: 'pending',
      transportDate: '',
      transportMethod: '',
      paydate: '',
      dueDate: '',
      method: '',
      expenses: 0,
      expenseNote: '',
      notes: '',
      status: 'completed',
      materials: '',
      address: '',
      serviceCatalogId: '',
    });
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.profession.trim() || !formData.place.trim()) {
      setError('Por favor preencha a data, profissão/título e o local trabalhado.');
      return;
    }

    if (netHours <= 0 && formData.ratetype === 'hourly') {
      setError('Confira os horários de entrada e saída. Horas líquidas calculadas zeradas.');
      return;
    }

    if (formData.ratetype === 'hourly' && Number(formData.rate) <= 0) {
      setError('Informe o valor por hora de trabalho.');
      return;
    }

    if (formData.ratetype === 'fixed' && Number(formData.fixed) <= 0) {
      setError('Informe o valor fixo / diária do serviço.');
      return;
    }

    if (Number(formData.paid) > totalCalculated + 0.01) {
      setError('O valor já recebido não pode ser maior que o valor total calculado.');
      return;
    }

    if (Number(formData.paid) > 0 && !formData.method) {
      setError('Como você marcou recebimento, por favor selecione a forma como recebeu.');
      return;
    }

    const jobId = initialJob?.id ? initialJob.id : formData.id || uid();

    onSaveJob({
      ...formData,
      id: jobId,
      profession: formData.profession.trim(),
      place: formData.place.trim(),
      task: formData.task.trim(),
      rate: Number(formData.rate) || 0,
      fixed: Number(formData.fixed) || 0,
      break: Number(formData.break) || 0,
      extraHours: Number(formData.extraHours) || 0,
      extraRate: Number(formData.extraRate) || 0,
      paid: Number(formData.paid) || 0,
      transport: Number(formData.transport) || 0,
      expenses: Number(formData.expenses) || 0,
      expenseNote: (formData.expenseNote || '').trim(),
      notes: (formData.notes || '').trim(),
      materials: (formData.materials || '').trim(),
      address: (formData.address || '').trim(),
      createdAt: formData.createdAt || today(),
      completedAt: formData.status === 'completed' ? formData.completedAt || today() : formData.completedAt,
    });

    if (!initialJob) {
      handleReset();
    }
  };

  const isEditing = Boolean(initialJob && initialJob.profession);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
          {isEditing ? 'Edição de Registro' : 'Novo Trabalho / Serviço'}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5">
          {isEditing ? 'Editar Trabalho' : 'Registrar Trabalho'}
        </h2>
        <p className="text-xs text-[var(--muted)]">
          Preencha os detalhes do serviço, importe do Catálogo de Serviços, calcule horas e controle pagamentos.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-5 sm:p-7 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-6"
      >
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Import from Catalog if available */}
        {catalog.length > 0 && (
          <div className="p-4 rounded-2xl bg-[var(--sage)]/60 border border-[var(--g)]/20">
            <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--g)] mb-1.5">
              <BookOpen className="w-4 h-4" />
              <span>Preencher rapidamente pelo Catálogo de Serviços:</span>
            </label>
            <select
              value={formData.serviceCatalogId || ''}
              onChange={(e) => handleSelectCatalogItem(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] font-semibold"
            >
              <option value="">— Escolher serviço do catálogo (opcional) —</option>
              {catalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({money(item.suggestedPrice)} / {item.priceType === 'hourly' ? 'hora' : 'fixo'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Section 1: Identification & Status */}
        <div>
          <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5 mb-3">
            <Calendar className="w-4 h-4 text-[var(--g)]" />
            Dados Básicos e Status do Trabalho
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Data do Serviço / Início *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Status Operacional *
              </label>
              <select
                value={formData.status || 'completed'}
                onChange={(e) => handleChange('status', e.target.value as JobWorkflowStatus)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold"
              >
                <option value="completed">✓ Concluído</option>
                <option value="in_progress">● Em andamento</option>
                <option value="scheduled">📅 Agendado</option>
                <option value="waiting_approval">⏳ Aguardando aprovação</option>
                <option value="quote">📄 Orçamento</option>
                <option value="cancelled">✕ Cancelado / Não realizado</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Título / Profissão / Tipo de Serviço *
              </label>
              <input
                type="text"
                required
                maxLength={80}
                placeholder="Ex.: Eletricista, Plantão Farmacêutico, Designer"
                value={formData.profession}
                onChange={(e) => handleChange('profession', e.target.value)}
                list="profession-list"
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
              <datalist id="profession-list">
                {distinctProfessions.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Cliente Vinculado (opcional)
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => handleSelectClient(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              >
                <option value="">Selecionar cliente cadastrado</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Local / Empresa onde realizou *
              </label>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="Ex.: Clínica Central, Loja Centro, Residência Cliente"
                value={formData.place}
                onChange={(e) => handleChange('place', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Endereço de Execução (opcional)
              </label>
              <input
                type="text"
                maxLength={180}
                placeholder="Rua, número, bairro, cidade"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Descrição Detalhada da Atividade
              </label>
              <input
                type="text"
                maxLength={200}
                placeholder="Ex.: Manutenção preventiva, desenvolvimento de landing page, plantão 12h"
                value={formData.task}
                onChange={(e) => handleChange('task', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-[var(--g)]" />
                <span>Materiais Utilizados / Equipamentos (opcional)</span>
              </label>
              <input
                type="text"
                maxLength={200}
                placeholder="Ex.: Cabos 2.5mm, disjuntor, kit de ferramentas"
                value={formData.materials || ''}
                onChange={(e) => handleChange('materials', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>
          </div>
        </div>

        <hr className="border-[var(--line)]" />

        {/* Section 2: Shift and Hours */}
        <div>
          <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5 mb-1">
            <Clock className="w-4 h-4 text-[var(--g)]" />
            Jornada e Cálculo do Valor
          </h3>
          <p className="text-[11px] text-[var(--muted)] mb-3">
            Aceita turnos noturnos que viram a meia-noite (ex.: 22:00 até 06:00).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Horário Entrada
              </label>
              <input
                type="time"
                value={formData.start}
                onChange={(e) => handleChange('start', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Horário Saída
              </label>
              <input
                type="time"
                value={formData.end}
                onChange={(e) => handleChange('end', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Intervalo (minutos)
              </label>
              <input
                type="number"
                min="0"
                max="1440"
                step="5"
                value={formData.break}
                onChange={(e) => handleChange('break', Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Modalidade de Cobrança
              </label>
              <select
                value={formData.ratetype}
                onChange={(e) => handleChange('ratetype', e.target.value as 'hourly' | 'fixed')}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold"
              >
                <option value="hourly">Por Hora</option>
                <option value="fixed">Valor Fixo / Diária / Projeto</option>
              </select>
            </div>

            {formData.ratetype === 'hourly' ? (
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Valor por Hora (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="25,00"
                  value={formData.rate || ''}
                  onChange={(e) => handleChange('rate', Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                />
              </div>
            ) : (
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Valor Fixo / Diária / Projeto (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="200,00"
                  value={formData.fixed || ''}
                  onChange={(e) => handleChange('fixed', Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Horas extras (opcional)
              </label>
              <input
                type="number"
                min="0"
                step="0.25"
                value={formData.extraHours || ''}
                onChange={(e) => handleChange('extraHours', Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Valor por hora extra (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.extraRate || ''}
                onChange={(e) => handleChange('extraRate', Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-[var(--cream)] border border-[var(--line)] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider block">
                Horas líquidas
              </span>
              <strong className="text-base text-[var(--ink)] font-bold font-mono-num">
                {hlabel(netHours)}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider block">
                Valor Total do Serviço
              </span>
              <strong className="text-lg text-[var(--g)] font-extrabold font-mono-num">
                {money(totalCalculated)}
              </strong>
            </div>
          </div>
        </div>

        <hr className="border-[var(--line)]" />

        {/* Section 3: Payment details */}
        <div>
          <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5 mb-3">
            <DollarSign className="w-4 h-4 text-[var(--g)]" />
            Pagamento e Faturamento
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Valor já recebido pelo serviço (R$)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.paid || ''}
                  onChange={(e) => handleChange('paid', Number(e.target.value))}
                  className="flex-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleChange('paid', Number(totalCalculated.toFixed(2)));
                    if (!formData.method) handleChange('method', 'Pix');
                    if (!formData.paydate) handleChange('paydate', today());
                  }}
                  className="px-3 py-2 rounded-xl bg-[var(--sage)] text-[var(--g)] font-bold text-[11px] hover:bg-[var(--g)] hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  100% Pago
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Forma de Pagamento
              </label>
              <select
                value={formData.method}
                onChange={(e) => handleChange('method', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              >
                <option value="">Ainda não recebi</option>
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Transferência">Transferência</option>
                <option value="Boleto">Boleto</option>
                <option value="Cartão">Cartão</option>
                <option value="Depósito">Depósito</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Data do Recebimento
              </label>
              <input
                type="date"
                value={formData.paydate}
                onChange={(e) => handleChange('paydate', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Data Prevista de Vencimento (Cobrança)
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>
          </div>
        </div>

        <hr className="border-[var(--line)]" />

        {/* Section 4: Vale-Transporte */}
        <div>
          <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5 mb-1">
            <Bus className="w-4 h-4 text-[var(--g)]" />
            Vale-Transporte / Deslocamento Reembolsável
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Valor do vale-transporte (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.transport || ''}
                onChange={(e) => handleChange('transport', Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Situação do transporte
              </label>
              <select
                value={formData.transportstatus}
                onChange={(e) =>
                  handleChange('transportstatus', e.target.value as 'pending' | 'paid')
                }
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold"
              >
                <option value="pending">Pendente (a receber)</option>
                <option value="paid">Já recebi</option>
              </select>
            </div>
          </div>
        </div>

        <hr className="border-[var(--line)]" />

        {/* Section 5: Expenses and Notes */}
        <div>
          <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5 mb-1">
            <Receipt className="w-4 h-4 text-[var(--g)]" />
            Despesas do Trabalho e Observações
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Despesas deste serviço (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.expenses || ''}
                onChange={(e) => handleChange('expenses', Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Descrição das despesas
              </label>
              <input
                type="text"
                maxLength={160}
                placeholder="Ex.: Alimentação, combustível, peças"
                value={formData.expenseNote}
                onChange={(e) => handleChange('expenseNote', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Observações gerais
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                placeholder="Detalhes adicionais, combinado com o cliente ou notas técnicas"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] resize-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'Salvar Alterações' : 'Salvar Trabalho'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
