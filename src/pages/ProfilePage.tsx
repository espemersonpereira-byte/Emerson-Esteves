import React, { useState } from 'react';
import {
  User,
  Camera,
  Save,
  Building2,
  Phone,
  Mail,
  MapPin,
  Award,
  ShieldCheck,
  KeyRound,
  Lock,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Prefs, ActivityType } from '../types';
import {
  OFFICIAL_COUNCILS,
  AUTONOMOUS_PROFESSION_EXAMPLES,
  formatProfessionalId,
} from '../utils';
import { auth as firebaseAuth } from '../firebase';
import {
  sendFirebasePasswordReset,
  linkPasswordToCurrentUser,
  FIREBASE_PROJECT_ID,
  FIREBASE_CONSOLE_AUTH_PROVIDERS_URL,
} from '../utils/firebaseAuth';

interface ProfilePageProps {
  prefs: Prefs;
  userEmail?: string;
  onSavePrefs: (prefs: Prefs) => void;
  onShowToast?: (msg: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  prefs,
  userEmail = '',
  onSavePrefs,
  onShowToast,
}) => {
  const [formData, setFormData] = useState<Prefs>({
    ...prefs,
    email: prefs.email || userEmail,
  });

  const initialActivityType: ActivityType =
    prefs.activityType ||
    ((prefs.councilType && prefs.councilType !== 'none') || prefs.crf || prefs.councilNumber
      ? 'registro'
      : 'autonomo');

  const [activityType, setActivityType] = useState<ActivityType>(initialActivityType);

  const [councilType, setCouncilType] = useState<string>(() => {
    if (prefs.councilType && prefs.councilType !== 'none') return prefs.councilType;
    if (prefs.crf) return 'CRF';
    return 'CRF';
  });

  const [councilOther, setCouncilOther] = useState<string>(prefs.councilOther || '');
  const [councilNumber, setCouncilNumber] = useState<string>(
    prefs.councilNumber || prefs.crf || ''
  );

  const handleCouncilSelect = (newCouncil: string) => {
    setCouncilType(newCouncil);
    const councilDef = OFFICIAL_COUNCILS.find((c) => c.value === newCouncil);
    if (councilDef && councilDef.profession) {
      setFormData((prev) => ({
        ...prev,
        profession: councilDef.profession,
      }));
    }
  };

  const user = firebaseAuth.currentUser;
  const hasPasswordProvider = Boolean(
    user?.providerData.some((p) => p.providerId === 'password')
  );
  const hasGoogleProvider = Boolean(
    user?.providerData.some((p) => p.providerId === 'google.com')
  );

  const [linkPass, setLinkPass] = useState('');
  const [confirmLinkPass, setConfirmLinkPass] = useState('');
  const [secError, setSecError] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleLinkPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError('');
    if (linkPass.length < 6) {
      setSecError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (linkPass !== confirmLinkPass) {
      setSecError('A confirmação não confere com a nova senha digitada.');
      return;
    }

    setIsLinking(true);
    try {
      const res = await linkPasswordToCurrentUser(linkPass);
      if (res.success) {
        onShowToast?.(
          hasPasswordProvider
            ? 'Senha atualizada com sucesso no Firebase!'
            : 'Senha vinculada com sucesso! Agora você pode acessar tanto com Google quanto com e-mail e senha.'
        );
        setLinkPass('');
        setConfirmLinkPass('');
      } else {
        setSecError(res.error || 'Não foi possível vincular a senha.');
      }
    } catch {
      setSecError('Erro de conexão ao vincular senha.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleSendReset = async () => {
    const targetEmail = user?.email || userEmail || formData.email;
    if (!targetEmail) {
      onShowToast?.('Nenhum e-mail vinculado à conta.');
      return;
    }
    setIsSendingReset(true);
    setSecError('');
    try {
      const res = await sendFirebasePasswordReset(targetEmail);
      if (res.success) {
        onShowToast?.(`Link de recuperação enviado com sucesso para ${targetEmail}!`);
      } else {
        setSecError(res.error || 'Não foi possível enviar o e-mail de recuperação.');
      }
    } catch {
      setSecError('Falha ao enviar e-mail de recuperação.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast?.('Selecione um arquivo de imagem válido.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setFormData((prev) => {
            const next = { ...prev, photo: dataUrl };
            onSavePrefs({ ...prefs, ...next });
            return next;
          });
          onShowToast?.('Foto de perfil atualizada!');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNumber = councilNumber.trim();
    const cleanOther = councilOther.trim();
    const computedProfessionalId = formatProfessionalId({
      activityType,
      councilType,
      councilNumber: cleanNumber,
      councilOther: cleanOther,
      crf: cleanNumber,
    });

    onSavePrefs({
      ...prefs,
      ...formData,
      activityType,
      councilType: activityType === 'registro' ? councilType : (prefs.councilType || 'none'),
      councilOther: activityType === 'registro' ? cleanOther : (prefs.councilOther || ''),
      councilNumber: activityType === 'registro' ? cleanNumber : (prefs.councilNumber || ''),
      crf: activityType === 'registro' ? cleanNumber : (prefs.crf || ''),
      professionalId: computedProfessionalId,
      name: (formData.name || '').trim(),
      companyName: (formData.companyName || '').trim(),
      profession: (formData.profession || '').trim(),
      specialties: (formData.specialties || '').trim(),
      phone: (formData.phone || '').trim(),
      whatsapp: (formData.whatsapp || '').trim(),
      email: (formData.email || '').trim(),
      document: (formData.document || '').trim(),
      address: (formData.address || '').trim(),
      city: (formData.city || '').trim(),
      state: (formData.state || '').trim(),
      bio: (formData.bio || '').trim(),
    });
    onShowToast?.('Perfil profissional atualizado com sucesso!');
  };

  const initial = (formData.name?.[0] || prefs.displayName?.[0] || 'F').toUpperCase();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
          Identidade Comercial
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5">
          Perfil Profissional
        </h2>
        <p className="text-xs text-[var(--muted)]">
          Seus dados profissionais são utilizados automaticamente na emissão de Orçamentos, Faturas e Recibos.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-5 sm:p-7 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs space-y-6 text-xs"
      >
        {/* Avatar & Header */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pb-5 border-b border-[var(--line)]">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--g)] bg-[var(--sage)] text-[var(--g)] font-extrabold text-2xl flex items-center justify-center">
              {formData.photo ? (
                <img src={formData.photo} alt={formData.name} className="w-full h-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <label
              htmlFor="profile-photo-input"
              className="absolute -bottom-1 -right-1 p-2 rounded-full bg-[var(--g)] text-white shadow-md cursor-pointer hover:bg-[var(--g2)]"
              title="Alterar foto de perfil"
            >
              <Camera className="w-3.5 h-3.5" />
              <input
                id="profile-photo-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="text-center sm:text-left">
            <h3 className="text-lg font-extrabold text-[var(--ink)]">
              {formData.name || prefs.displayName || 'Profissional Autônomo'}
            </h3>
            <p className="text-xs text-[var(--muted)]">
              {formData.profession || 'Configure sua profissão e especialidades abaixo'}
            </p>
            {formData.photo && (
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => {
                    const next = { ...prev, photo: '' };
                    onSavePrefs({ ...prefs, ...next });
                    return next;
                  });
                  onShowToast?.('Foto de perfil removida.');
                }}
                className="text-[11px] font-bold text-[#DC4545] hover:underline mt-1 cursor-pointer"
              >
                Remover foto
              </button>
            )}
          </div>
        </div>

        {/* Section 1: Professional Identity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-[var(--ink)] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[var(--g)]" />
              <span>Dados Profissionais e Comerciais</span>
            </h4>
            <span className="text-[10px] font-semibold text-[var(--muted)]">
              {activityType === 'registro' ? 'Profissional Regulamentado' : 'Trabalho Autônomo'}
            </span>
          </div>

          {/* 1. TIPO DE ATUAÇÃO */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--ink)] mb-1.5">
              Tipo de atuação *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setActivityType('autonomo')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  activityType === 'autonomo'
                    ? 'border-[var(--g)] bg-[var(--g)]/10 ring-2 ring-[var(--g)]/25 shadow-xs'
                    : 'border-[var(--line)] bg-[var(--cream)] hover:border-[var(--g)]/40 hover:bg-[var(--paper)]'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 transition-colors ${
                    activityType === 'autonomo'
                      ? 'bg-[var(--g)] text-white'
                      : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)]'
                  }`}
                >
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[var(--ink)]">Autônomo</span>
                    {activityType === 'autonomo' && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--g)] text-white text-[9px] font-bold">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">
                    Prestadores de serviços gerais, criativos, tecnologia, consultoria (sem conselho de classe).
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivityType('registro');
                  if (!formData.profession || formData.profession.trim() === '') {
                    const councilDef = OFFICIAL_COUNCILS.find((c) => c.value === councilType);
                    if (councilDef?.profession) {
                      setFormData((prev) => ({ ...prev, profession: councilDef.profession }));
                    }
                  }
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  activityType === 'registro'
                    ? 'border-[var(--g)] bg-[var(--g)]/10 ring-2 ring-[var(--g)]/25 shadow-xs'
                    : 'border-[var(--line)] bg-[var(--cream)] hover:border-[var(--g)]/40 hover:bg-[var(--paper)]'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 transition-colors ${
                    activityType === 'registro'
                      ? 'bg-[var(--g)] text-white'
                      : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)]'
                  }`}
                >
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[var(--ink)]">Profissional com registro</span>
                    {activityType === 'registro' && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--g)] text-white text-[9px] font-bold">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">
                    Profissionais vinculados a conselho de classe ou órgão regulamentador (CRF, CRM, CREA, OAB, etc.).
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. CAMPOS CONDICIONAIS CONFORME TIPO DE ATUAÇÃO */}
          {activityType === 'autonomo' ? (
            /* QUANDO O USUÁRIO SELECIONAR AUTÔNOMO: Apenas Profissão / Área de Atuação (Conselho e Registro ocultados) */
            <div className="p-4 sm:p-4.5 rounded-2xl bg-[var(--cream)] border border-[var(--line)] space-y-3 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-[var(--ink)]">
                    Profissão / Área de atuação *
                  </label>
                  <span className="text-[10px] text-[var(--muted)]">
                    Digitação manual
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Eletricista, Encanador, Pedreiro, Designer, Consultor..."
                  value={formData.profession || ''}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--g)]"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
                  Sugestões de profissões (toque para preencher):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {AUTONOMOUS_PROFESSION_EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setFormData({ ...formData, profession: ex })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        formData.profession === ex
                          ? 'bg-[var(--g)] text-white border-[var(--g)] shadow-2xs'
                          : 'bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--g)]/50'
                      }`}
                    >
                      {ex}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, profession: '' });
                      const el = document.querySelector('input[placeholder*="Ex.: Eletricista"]') as HTMLInputElement | null;
                      el?.focus();
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--paper)] border border-dashed border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                  >
                    Outros (digitar)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* QUANDO O USUÁRIO SELECIONAR PROFISSIONAL COM REGISTRO */
            <div className="p-4 sm:p-4.5 rounded-2xl bg-[var(--cream)] border border-[var(--line)] space-y-3.5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Conselho Profissional */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    Conselho profissional *
                  </label>
                  <select
                    value={councilType}
                    onChange={(e) => handleCouncilSelect(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--g)] cursor-pointer"
                  >
                    {OFFICIAL_COUNCILS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Se for 'Outros', campo para sigla/nome */}
                {councilType === 'Outros' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      Sigla ou Nome do Conselho / Órgão
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: COREN, CRN, CRC, CONFEA"
                      value={councilOther}
                      onChange={(e) => setCouncilOther(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--g)]"
                    />
                  </div>
                )}

                {/* Profissão / Área de Atuação (Preenchida automaticamente, porém livremente editável) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-[var(--ink)]">
                      Profissão / Área de atuação *
                    </label>
                    <span className="text-[10px] text-[var(--g)] font-bold">
                      Editável
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Médico Cardiologista, Engenheiro Civil, Farmacêutico..."
                    value={formData.profession || ''}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--g)]"
                  />
                  <span className="text-[10px] text-[var(--muted)] mt-1 block">
                    Preenchida automaticamente com base no conselho. Você pode personalizar livremente.
                  </span>
                </div>

                {/* Número do Registro Profissional (Independente, digitação manual, NUNCA preenchido automaticamente) */}
                <div className={councilType === 'Outros' ? 'sm:col-span-2' : ''}>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    Número do registro profissional *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex.: CRF/SP 122577, CRM/SP 123456, CREA/SP 987654"
                    value={councilNumber}
                    onChange={(e) => setCouncilNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--g)]"
                  />
                  <span className="text-[10px] text-[var(--muted)] mt-1 block">
                    Digite manualmente com a sigla e o estado (sem máscara fixa).
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* DEMAIS DADOS COMERCIAIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-[11px] font-bold mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                placeholder="Seu nome completo"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">
                Nome Comercial ou Empresa (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex.: Silva Instalações, Studio Criativo"
                value={formData.companyName || ''}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">CPF ou CNPJ</label>
              <input
                type="text"
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
                value={formData.document || ''}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">Especialidades</label>
              <input
                type="text"
                placeholder="Ex.: Redes elétricas, Automação, Plantões"
                value={formData.specialties || ''}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contacts & Address */}
        <div className="pt-4 border-t border-[var(--line)]">
          <h4 className="font-bold text-sm text-[var(--ink)] flex items-center gap-1.5 mb-3">
            <Phone className="w-4 h-4 text-[var(--g)]" />
            <span>Contatos e Endereço Profissional</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold mb-1">Telefone</label>
              <input
                type="tel"
                placeholder="(11) 98765-4321"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">WhatsApp Comercial</label>
              <input
                type="tel"
                placeholder="(11) 98765-4321"
                value={formData.whatsapp || ''}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">E-mail Profissional</label>
              <input
                type="email"
                placeholder="contato@exemplo.com"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold mb-1">Endereço Profissional</label>
              <input
                type="text"
                placeholder="Rua, número, sala, bairro"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold mb-1">Cidade</label>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="SP"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold mb-1">
                Descrição / Biografia Profissional
              </label>
              <textarea
                rows={3}
                placeholder="Resumo da sua experiência profissional para apresentação comercial..."
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--line)]">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-white font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Perfil Profissional</span>
          </button>
        </div>
      </form>

      {/* Account Security & Dual Authentication Methods */}
      <div className="p-5 sm:p-7 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs space-y-5 text-xs">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-[var(--line)]">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--g)] block">
              Acesso & Credenciais
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[var(--ink)] flex items-center gap-2 mt-0.5">
              <KeyRound className="w-4 h-4 text-[var(--g)]" />
              <span>Segurança da Conta & Métodos de Login</span>
            </h3>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold">
            {hasGoogleProvider && (
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                ● Google Conectado
              </span>
            )}
            {hasPasswordProvider ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ● Senha Ativa
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                ● Senha não cadastrada
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--cream)] border border-[var(--line)] space-y-2">
          <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
            <span className="text-[var(--muted)] flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Identificador Único (UID):
            </span>
            <span className="font-mono text-[11px] font-bold text-[var(--ink)]">
              {user?.uid || 'Sessão ativa'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
            <span className="text-[var(--muted)] flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              E-mail de autenticação:
            </span>
            <span className="font-mono text-[11px] font-bold text-[var(--ink)]">
              {user?.email || userEmail || 'Não definido'}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[var(--muted)] leading-relaxed">
          {hasPasswordProvider
            ? 'Sua conta está configurada com suporte duplo (Google e E-mail/Senha). Você pode atualizar sua senha de acesso abaixo a qualquer momento sem perder nenhum dado.'
            : 'Sua conta foi criada através do Google. Você pode definir uma senha abaixo para poder entrar também digitando seu e-mail e senha em qualquer navegador ou celular, preservando integralmente o mesmo cadastro e dados.'}
        </p>

        {secError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold space-y-2">
            <div>{secError}</div>
            {(secError.includes('turnkey-variety-kf38q') ||
              secError.includes('não está habilitada')) && (
              <a
                href={FIREBASE_CONSOLE_AUTH_PROVIDERS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ativar E-mail/Senha no Console Firebase ({FIREBASE_PROJECT_ID})</span>
              </a>
            )}
          </div>
        )}

        <form onSubmit={handleLinkPassword} className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                {hasPasswordProvider ? 'Nova senha (mínimo 6 caracteres)' : 'Cadastrar senha (mínimo 6 caracteres)'}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={linkPass}
                onChange={(e) => setLinkPass(e.target.value)}
                placeholder="Digite a nova senha"
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                Confirmar senha
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmLinkPass}
                onChange={(e) => setConfirmLinkPass(e.target.value)}
                placeholder="Repita a senha"
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={handleSendReset}
              disabled={isSendingReset}
              className="text-xs font-semibold text-[var(--copper)] hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{isSendingReset ? 'Enviando link...' : 'Enviar link de recuperação por e-mail'}</span>
            </button>

            <button
              type="submit"
              disabled={isLinking}
              className="px-5 py-2.5 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-xs font-bold text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isLinking
                ? 'Salvando...'
                : hasPasswordProvider
                ? 'Atualizar Senha'
                : 'Salvar Senha de Acesso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
