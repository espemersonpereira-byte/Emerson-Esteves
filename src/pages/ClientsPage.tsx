import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  FileText,
  Edit2,
  Trash2,
  MessageCircle,
  Briefcase,
  ExternalLink,
  Mail,
  Eye,
  X,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Send,
  Calendar,
} from 'lucide-react';
import { Client, Job, Quote } from '../types';
import {
  money,
  calculateTotal,
  calculateReceived,
  calculateDueAll,
  uid,
  today,
  dateLabel,
  formatClientFullAddress,
  buildGoogleMapsSearchUrl,
  buildWhatsAppUrl,
  buildTelUrl,
} from '../utils';

interface ClientsPageProps {
  clients: Client[];
  jobs: Job[];
  quotes?: Quote[];
  userName?: string;
  initialOpenNew?: boolean;
  onConsumeOpenNew?: () => void;
  onSaveClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onShowToast?: (msg: string) => void;
}

const emptyClientForm = (): Client => ({
  id: '',
  name: '',
  phone: '',
  whatsapp: '',
  email: '',
  document: '',
  cep: '',
  state: '',
  city: '',
  neighborhood: '',
  street: '',
  number: '',
  complement: '',
  reference: '',
  address: '',
  notes: '',
  createdAt: today(),
});

export const ClientsPage: React.FC<ClientsPageProps> = ({
  clients,
  jobs,
  quotes = [],
  userName = 'Profissional',
  initialOpenNew = false,
  onConsumeOpenNew,
  onSaveClient,
  onDeleteClient,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'alpha' | 'recent'>('alpha');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Client>(emptyClientForm());
  const [localToast, setLocalToast] = useState<string | null>(null);

  useEffect(() => {
    if (initialOpenNew) {
      setEditingClient(null);
      setFormData(emptyClientForm());
      setIsFormOpen(true);
      if (onConsumeOpenNew) onConsumeOpenNew();
    }
  }, [initialOpenNew, onConsumeOpenNew]);

  // Dossier Modal state
  const [dossierClient, setDossierClient] = useState<Client | null>(null);

  // WhatsApp Template Modal state
  const [whatsAppClient, setWhatsAppClient] = useState<Client | null>(null);
  const [whatsAppTemplateKey, setWhatsAppTemplateKey] = useState<string>('hello');
  const [whatsAppCustomMessage, setWhatsAppCustomMessage] = useState<string>('');

  const showFeedback = (msg: string) => {
    if (onShowToast) {
      onShowToast(msg);
    } else {
      setLocalToast(msg);
      setTimeout(() => setLocalToast((cur) => (cur === msg ? null : cur)), 3200);
    }
  };

  const handleOpenNew = () => {
    setEditingClient(null);
    setFormData(emptyClientForm());
    setIsFormOpen(true);
  };

  const handleStartEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      ...emptyClientForm(),
      ...client,
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
    setFormData(emptyClientForm());
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showFeedback('Por favor, informe o nome do cliente ou da empresa.');
      return;
    }

    // Compose address string if structured fields are filled
    const composedAddress = formatClientFullAddress(formData);

    onSaveClient({
      ...formData,
      id: formData.id || uid(),
      name: formData.name.trim(),
      phone: (formData.phone || '').trim(),
      whatsapp: (formData.whatsapp || formData.phone || '').trim(),
      email: (formData.email || '').trim(),
      document: (formData.document || '').trim(),
      cep: (formData.cep || '').trim(),
      state: (formData.state || '').trim(),
      city: (formData.city || '').trim(),
      neighborhood: (formData.neighborhood || '').trim(),
      street: (formData.street || '').trim(),
      number: (formData.number || '').trim(),
      complement: (formData.complement || '').trim(),
      reference: (formData.reference || '').trim(),
      address: composedAddress || (formData.address || '').trim(),
      notes: (formData.notes || '').trim(),
      createdAt: formData.createdAt || today(),
    });

    handleCancelEdit();
  };

  const handleOpenMaps = (e: React.MouseEvent, client: Client) => {
    e.preventDefault();
    e.stopPropagation();

    const mapsUrl = buildGoogleMapsSearchUrl(client);
    if (!mapsUrl) {
      showFeedback(
        `O cliente "${client.name}" não possui endereço suficiente cadastrado para localização no Google Maps.`
      );
      return;
    }

    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const generateWhatsAppMessage = (client: Client, tplKey: string): string => {
    const clientJobs = jobs.filter((j) => j.clientId === client.id && j.status !== 'cancelled');
    const pendingAmount = clientJobs.reduce((s, j) => s + calculateDueAll(j), 0);
    const latestJob = [...clientJobs].sort((a, b) => b.date.localeCompare(a.date))[0];

    switch (tplKey) {
      case 'confirm_service':
        return `Olá, ${client.name}! Tudo bem?\nAqui é ${userName}. Gostaria de confirmar a realização do serviço${
          latestJob ? ` (${latestJob.profession}) em ${dateLabel(latestJob.date)}` : ''
        }. Qualquer dúvida estou à disposição!`;
      case 'send_quote':
        return `Olá, ${client.name}! Tudo bem?\nAqui é ${userName}. Preparei o orçamento detalhado para o seu serviço. Posso encaminhar os detalhes por aqui?`;
      case 'payment_reminder':
        return `Olá, ${client.name}! Tudo bem?\nAqui é ${userName}. Passando para lembrar sobre o saldo pendente de ${
          pendingAmount > 0 ? money(pendingAmount) : 'serviço realizado'
        }. Caso já tenha efetuado o pagamento, por favor desconsidere.`;
      case 'confirm_schedule':
        return `Olá, ${client.name}! Tudo bem?\nAqui é ${userName}. Gostaria de confirmar nosso agendamento${
          latestJob ? ` para o dia ${dateLabel(latestJob.date)} às ${latestJob.start}` : ''
        }. Podemos confirmar?`;
      case 'thank_you':
        return `Olá, ${client.name}!\nMuito obrigado pela confiança no meu trabalho. Foi um prazer atendê-lo(a). Conte comigo sempre que precisar!`;
      case 'hello':
      default:
        return `Olá, ${client.name}! Tudo bem? Aqui é ${userName}.`;
    }
  };

  const handleOpenWhatsAppModal = (client: Client, defaultTpl = 'hello') => {
    const targetPhone = client.whatsapp || client.phone;
    if (!targetPhone || targetPhone.replace(/\D/g, '').length < 8) {
      showFeedback(`Cadastre o telefone ou WhatsApp do cliente "${client.name}" para enviar mensagens.`);
      return;
    }
    setWhatsAppClient(client);
    setWhatsAppTemplateKey(defaultTpl);
    setWhatsAppCustomMessage(generateWhatsAppMessage(client, defaultTpl));
  };

  const handleSendWhatsApp = () => {
    if (!whatsAppClient) return;
    const phone = whatsAppClient.whatsapp || whatsAppClient.phone;
    const url = buildWhatsAppUrl(phone, whatsAppCustomMessage);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setWhatsAppClient(null);
    }
  };

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [clients]);

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clients
      .filter((c) => {
        if (cityFilter !== 'all' && (c.city || '').trim() !== cityFilter) return false;
        if (!q) return true;
        const fullAddr = formatClientFullAddress(c);
        return [c.name, c.phone, c.whatsapp, c.email, c.document, c.city, fullAddr, c.notes, c.createdAt]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [clients, search, cityFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
            Base de Relacionamento
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5">
            Clientes e Empresas ({clients.length})
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Cadastro completo, ficha individual, histórico de serviços, localização no Google Maps e WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => (isFormOpen ? handleCancelEdit() : handleOpenNew())}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isFormOpen ? 'Fechar Formulário' : 'Novo Cliente'}</span>
        </button>
      </div>

      {/* Expandable Complete Client Registration Form */}
      {isFormOpen && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line)]">
            <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--g)]" />
              <span>{editingClient ? `Editar Cliente: ${editingClient.name}` : 'Cadastrar Novo Cliente'}</span>
            </h3>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Dados Pessoais / Empresariais */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--g)] block mb-2">
                1. Identificação e Contato
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    Nome completo ou Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder="Ex.: Clínica São Lucas, João Carlos Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    maxLength={25}
                    placeholder="000.000.000-00 ou CNPJ"
                    value={formData.document || ''}
                    onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    maxLength={120}
                    placeholder="cliente@exemplo.com"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    Telefone Principal
                  </label>
                  <input
                    type="tel"
                    maxLength={30}
                    placeholder="(11) 98765-4321"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    WhatsApp (se diferente)
                  </label>
                  <input
                    type="tel"
                    maxLength={30}
                    placeholder="(11) 98765-4321"
                    value={formData.whatsapp || ''}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    Data de Cadastro
                  </label>
                  <input
                    type="date"
                    value={formData.createdAt || today()}
                    onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>
              </div>
            </div>

            {/* Endereço Estruturado para Google Maps */}
            <div className="pt-2 border-t border-[var(--line)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--g)] block mb-2">
                2. Endereço Completo (Integrado ao Google Maps)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">CEP</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="00000-000"
                    value={formData.cep || ''}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    Rua / Avenida
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="Ex.: Av. Paulista"
                    value={formData.street || ''}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">Número</label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="Ex.: 1000"
                    value={formData.number || ''}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Sala 42, Bloco B"
                    value={formData.complement || ''}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">Bairro</label>
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="Ex.: Bela Vista"
                    value={formData.neighborhood || ''}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">Cidade</label>
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="Ex.: São Paulo"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    placeholder="Ex.: SP"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    Ponto de Referência / Endereço resumido
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    placeholder="Ex.: Próximo ao Metrô Trianon"
                    value={formData.reference || formData.address || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, reference: e.target.value, address: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    Observações do Cliente
                  </label>
                  <input
                    type="text"
                    maxLength={250}
                    placeholder="Ex.: Pagamento todo dia 10 via Pix, falar com responsável financeiro"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] transition-colors shadow-xs cursor-pointer"
              >
                {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por nome, telefone, cidade, CPF/CNPJ ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)]"
          />
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3 pointer-events-none" />
        </div>

        {availableCities.length > 0 && (
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)]"
          >
            <option value="all">Todas as cidades</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => setSortBy(sortBy === 'alpha' ? 'recent' : 'alpha')}
          className="px-3.5 py-2.5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--cream)] text-xs font-semibold text-[var(--ink)] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[var(--g)]" />
          <span>{sortBy === 'alpha' ? 'Ordem Alfabética (A-Z)' : 'Mais Recentes'}</span>
        </button>
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)]">
          <Users className="w-10 h-10 mx-auto mb-2 text-[var(--muted)] opacity-50" />
          <h4 className="text-sm font-bold text-[var(--ink)]">Nenhum cliente encontrado</h4>
          <p className="text-xs text-[var(--muted)] max-w-xs mx-auto mt-1 mb-4">
            Cadastre seus clientes para gerenciar histórico de serviços, pagamentos, orçamentos e rotas no Google Maps.
          </p>
          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] cursor-pointer"
          >
            + Cadastrar Primeiro Cliente
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredClients.map((client) => {
            const clientJobs = jobs.filter((j) => j.clientId === client.id && j.status !== 'cancelled');
            const totalBilled = clientJobs.reduce((s, j) => s + calculateTotal(j), 0);
            const totalReceived = clientJobs.reduce((s, j) => s + calculateReceived(j), 0);
            const totalPending = clientJobs.reduce((s, j) => s + calculateDueAll(j), 0);
            const fullAddress = formatClientFullAddress(client);
            const telUrl = buildTelUrl(client.phone || client.whatsapp);

            return (
              <div
                key={client.id}
                className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs transition-all hover:border-[var(--g)]/50"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        onClick={() => setDossierClient(client)}
                        className="text-base font-bold text-[var(--ink)] hover:text-[var(--g)] cursor-pointer truncate"
                      >
                        {client.name}
                      </h4>
                      {client.document && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--cream)] border border-[var(--line)] text-[10px] font-mono text-[var(--muted)]">
                          {client.document}
                        </span>
                      )}
                      {client.city && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--sage)] text-[var(--g)] text-[10px] font-bold">
                          {client.city}{client.state ? ` - ${client.state}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--muted)] mt-2">
                      {telUrl && (
                        <a
                          href={telUrl}
                          className="inline-flex items-center gap-1.5 hover:text-[var(--g)] font-medium transition-colors"
                          title="Ligar para o cliente"
                        >
                          <Phone className="w-3.5 h-3.5 text-[var(--g)] shrink-0" />
                          <span>{client.phone || client.whatsapp}</span>
                        </a>
                      )}

                      {client.email && (
                        <a
                          href={`mailto:${client.email}`}
                          className="inline-flex items-center gap-1.5 hover:text-[var(--g)] transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                          <span>{client.email}</span>
                        </a>
                      )}

                      {fullAddress ? (
                        <button
                          type="button"
                          onClick={(e) => handleOpenMaps(e, client)}
                          className="group inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--g)] transition-colors cursor-pointer text-left"
                          title="Abrir localização e rotas no Google Maps"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[var(--g)] shrink-0" />
                          <span className="truncate max-w-[240px] sm:max-w-[360px] group-hover:underline">
                            {fullAddress}
                          </span>
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[var(--muted)]/50 text-[11px] italic">
                          <MapPin className="w-3 h-3" /> Sem endereço
                        </span>
                      )}
                    </div>

                    {client.notes && (
                      <p className="text-xs text-[var(--muted)] italic mt-2">"{client.notes}"</p>
                    )}

                    {/* Financial Summary Bar */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-[var(--muted)] mt-3 pt-2.5 border-t border-[var(--line)]">
                      <span>
                        <b className="text-[var(--ink)]">{clientJobs.length}</b> serviço{clientJobs.length !== 1 ? 's' : ''}
                      </span>
                      <span>
                        Faturado: <strong className="font-mono text-[var(--ink)]">{money(totalBilled)}</strong>
                      </span>
                      <span>
                        Recebido: <strong className="font-mono text-[#16A36A]">{money(totalReceived)}</strong>
                      </span>
                      {totalPending > 0.01 && (
                        <span>
                          Pendente: <strong className="font-mono text-[#F59E0B]">{money(totalPending)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDossierClient(client)}
                      className="px-2.5 py-1.5 rounded-xl bg-[var(--sage)] text-[var(--g)] hover:bg-[var(--g)] hover:text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Abrir Ficha Individual do Cliente"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ficha</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenWhatsAppModal(client)}
                      className="px-2.5 py-1.5 rounded-xl border border-[#16A36A]/40 bg-[#16A36A]/10 text-[#16A36A] hover:bg-[#16A36A] hover:text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Enviar mensagem personalizada no WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {fullAddress && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenMaps(e, client)}
                        className="px-2.5 py-1.5 rounded-xl border border-[var(--line)] hover:border-[var(--g)] text-[var(--ink)] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Abrir no Google Maps"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[var(--g)]" />
                        <span className="hidden sm:inline">Mapa</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleStartEdit(client)}
                      className="p-1.5 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--cream)] cursor-pointer"
                      title="Editar cliente"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Deseja realmente excluir o cliente "${client.name}"? Os trabalhos vinculados serão preservados.`
                          )
                        ) {
                          onDeleteClient(client.id);
                        }
                      }}
                      className="p-1.5 rounded-xl text-[#DC4545] hover:bg-[#DC4545]/10 cursor-pointer"
                      title="Excluir cliente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: FICHA INDIVIDUAL DO CLIENTE (DOSSIER)                      */}
      {/* =================================================================== */}
      {dossierClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[var(--line)] flex items-center justify-between bg-[#101D32] text-white">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#60A5FA]">
                  Ficha Individual do Cliente
                </span>
                <h3 className="text-lg font-extrabold">{dossierClient.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDossierClient(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Quick Contact Actions */}
              <div className="flex flex-wrap gap-2">
                {(dossierClient.phone || dossierClient.whatsapp) && (
                  <a
                    href={buildTelUrl(dossierClient.phone || dossierClient.whatsapp)}
                    className="px-3.5 py-2 rounded-xl bg-[var(--g)] text-white font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Ligar ({dossierClient.phone || dossierClient.whatsapp})</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const c = dossierClient;
                    setDossierClient(null);
                    handleOpenWhatsAppModal(c);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#16A36A] text-white font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Enviar WhatsApp</span>
                </button>

                {formatClientFullAddress(dossierClient) && (
                  <button
                    type="button"
                    onClick={(e) => handleOpenMaps(e, dossierClient)}
                    className="px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-[var(--ink)] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[var(--g)]" />
                    <span>Abrir no Google Maps</span>
                  </button>
                )}
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-[var(--cream)]/60 border border-[var(--line)]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)] block">CPF / CNPJ</span>
                  <strong className="text-[var(--ink)]">{dossierClient.document || 'Não informado'}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)] block">E-mail</span>
                  <strong className="text-[var(--ink)]">{dossierClient.email || 'Não informado'}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)] block">Endereço Completo</span>
                  <strong className="text-[var(--ink)]">
                    {formatClientFullAddress(dossierClient) || 'Não cadastrado'}
                  </strong>
                </div>
                {dossierClient.notes && (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-[var(--muted)] block">Observações</span>
                    <p className="text-[var(--ink)]">{dossierClient.notes}</p>
                  </div>
                )}
              </div>

              {/* Job History for this Client */}
              <div>
                <h4 className="font-bold text-sm text-[var(--ink)] mb-2 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[var(--g)]" />
                  <span>Histórico de Trabalhos Realizados</span>
                </h4>
                {(() => {
                  const cJobs = jobs
                    .filter((j) => j.clientId === dossierClient.id)
                    .sort((a, b) => b.date.localeCompare(a.date));
                  if (cJobs.length === 0) {
                    return (
                      <p className="text-[var(--muted)] py-4 text-center border border-dashed border-[var(--line)] rounded-2xl">
                        Nenhum trabalho vinculado a este cliente ainda.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {cJobs.map((j) => {
                        const total = calculateTotal(j);
                        const rec = calculateReceived(j);
                        const due = calculateDueAll(j);
                        return (
                          <div
                            key={j.id}
                            className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-bold text-[var(--ink)]">
                                {j.profession} · {dateLabel(j.date)}
                              </div>
                              <div className="text-[11px] text-[var(--muted)]">
                                Local: {j.place} {j.task ? `· ${j.task}` : ''}
                              </div>
                            </div>
                            <div className="text-right font-mono">
                              <div className="font-bold text-[var(--ink)]">{money(total)}</div>
                              {due > 0.01 ? (
                                <span className="text-[10px] text-[#F59E0B] font-bold">
                                  Pendente: {money(due)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#16A36A] font-bold">
                                  Recebido: {money(rec)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Quotes History for this Client */}
              {quotes.filter((q) => q.clientId === dossierClient.id).length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-[var(--ink)] mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[var(--g)]" />
                    <span>Orçamentos Enviados</span>
                  </h4>
                  <div className="space-y-2">
                    {quotes
                      .filter((q) => q.clientId === dossierClient.id)
                      .map((q) => {
                        const sub = q.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                        const tot = Math.max(0, sub - (Number(q.discount) || 0));
                        return (
                          <div
                            key={q.id}
                            className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-[var(--ink)]">{q.title}</div>
                              <div className="text-[11px] text-[var(--muted)]">
                                Criado em {dateLabel(q.createdAt)} · Status: {q.status.toUpperCase()}
                              </div>
                            </div>
                            <strong className="font-mono text-[var(--ink)]">{money(tot)}</strong>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: INTEGRAÇÃO WHATSAPP COM MODELOS PERSONALIZÁVEIS             */}
      {/* =================================================================== */}
      {whatsAppClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 bg-[#16A36A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-5 h-5" />
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 block">
                    Comunicação Direta via WhatsApp
                  </span>
                  <h3 className="text-base font-extrabold">{whatsAppClient.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppClient(null)}
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1.5">
                  Escolha o modelo de mensagem:
                </label>
                <select
                  value={whatsAppTemplateKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setWhatsAppTemplateKey(key);
                    setWhatsAppCustomMessage(generateWhatsAppMessage(whatsAppClient, key));
                  }}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold"
                >
                  <option value="hello">1. Iniciar conversa</option>
                  <option value="confirm_service">2. Enviar confirmação de serviço</option>
                  <option value="send_quote">3. Enviar orçamento</option>
                  <option value="payment_reminder">4. Enviar lembrete de pagamento</option>
                  <option value="confirm_schedule">5. Confirmar agendamento</option>
                  <option value="thank_you">6. Agradecer pelo atendimento</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1.5">
                  Personalizar mensagem antes de enviar:
                </label>
                <textarea
                  rows={5}
                  value={whatsAppCustomMessage}
                  onChange={(e) => setWhatsAppCustomMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--line)] bg-[var(--cream)]/50 text-[var(--ink)] leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWhatsAppClient(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--line)] text-[var(--muted)] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-5 py-2.5 rounded-xl bg-[#16A36A] hover:opacity-95 text-white font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Abrir WhatsApp e Enviar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {localToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#101D32] text-white text-xs font-semibold shadow-xl border border-[#1E3254] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none max-w-sm text-center">
          <span>{localToast}</span>
        </div>
      )}
    </div>
  );
};
