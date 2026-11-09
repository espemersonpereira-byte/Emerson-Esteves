import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive,
  Users,
  Briefcase,
  Calendar,
  X,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { Database } from '../types';
import { money } from '../utils';
import {
  exportBackup,
  validateBackupContent,
  getLastBackupRecord,
  exportDataSummaryPDF,
  LastBackupRecord,
  ValidationResult,
  BackupStats,
} from '../utils/backupService';

interface BackupRestoreSectionProps {
  db: Database;
  onRestoreBackup: (newDb: Database) => void;
  onShowToast: (msg: string) => void;
}

export const BackupRestoreSection: React.FC<BackupRestoreSectionProps> = ({
  db,
  onRestoreBackup,
  onShowToast,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [lastBackup, setLastBackup] = useState<LastBackupRecord | null>(() => getLastBackupRecord());
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Restore Modal State
  const [pendingRestore, setPendingRestore] = useState<ValidationResult | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Totais do banco atual
  const totalJobs = db.jobs.length;
  const totalClients = db.clients.length;
  const totalAppointments = db.appointments.length;

  // Função 1: Salvar Meus Dados
  const handleExportBackup = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setSuccessBanner(null);

    try {
      const res = await exportBackup(db);
      if (res.success) {
        const updatedRecord = getLastBackupRecord();
        setLastBackup(updatedRecord);
        const msg = 'Backup realizado com sucesso!';
        setSuccessBanner(msg);
        onShowToast(msg);
      }
    } catch (err: any) {
      console.error('Erro ao exportar backup:', err);
      alert('Não foi possível gerar o backup dos dados.');
    } finally {
      setIsExporting(false);
    }
  };

  // Função 2: Exportar Relatório em PDF (opcional)
  const handleExportSummaryPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const res = await exportDataSummaryPDF(db);
      if (res.success) {
        onShowToast('Relatório geral em PDF gerado!');
      } else {
        alert('Falha ao gerar relatório em PDF.');
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Selecionar arquivo de backup para restauração
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);

    try {
      const text = await file.text();
      const validation = validateBackupContent(text);

      if (!validation.valid || !validation.parsedDb) {
        setRestoreError(validation.error || 'Arquivo de backup inválido ou incompatível.');
        return;
      }

      // Abre modal de confirmação com dados e avisos
      setPendingRestore(validation);
    } catch (err: any) {
      setRestoreError(`Erro ao ler o arquivo: ${err?.message || 'Arquivo corrompido'}`);
    } finally {
      // Limpa input para permitir selecionar o mesmo arquivo se quiser
      e.target.value = '';
    }
  };

  // Confirmação final e execução da restauração segura
  const handleConfirmRestore = () => {
    if (!pendingRestore || !pendingRestore.parsedDb) return;

    setIsRestoring(true);

    try {
      const { parsedDb, pixKey, receiptTemplate, metadata } = pendingRestore;

      // Restaura preferências extras se presentes no backup
      if (pixKey) {
        try {
          localStorage.setItem('calculos_pix_key', pixKey);
        } catch {}
      }
      if (receiptTemplate) {
        try {
          localStorage.setItem('calculos_receipt_template', receiptTemplate);
        } catch {}
      }

      // Atualiza os dados no App
      onRestoreBackup(parsedDb);

      const restoredJobsCount = metadata?.jobsCount ?? parsedDb.jobs.length;
      const restoredClientsCount = metadata?.clientsCount ?? parsedDb.clients.length;
      const restoredApptsCount = metadata?.appointmentsCount ?? parsedDb.appointments.length;

      const successMsg = `Seus dados foram restaurados com sucesso! Todas as informações foram recuperadas (${restoredJobsCount} trabalhos, ${restoredClientsCount} clientes, ${restoredApptsCount} agendamentos).`;
      setSuccessBanner(successMsg);
      onShowToast(successMsg);

      setPendingRestore(null);
    } catch (err: any) {
      alert(`Falha ao aplicar restauração: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-5">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--copper)] flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Segurança e Portabilidade</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--ink)] mt-0.5">
            Backup e restauração
          </h3>
          <p className="text-xs text-[var(--muted)]">
            Salve todos os seus registros em um arquivo seguro para transferir de celular, reinstalar ou guardar na nuvem.
          </p>
        </div>

        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[var(--sage)]/70 text-[var(--g)] border border-[var(--line)]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Proteção Total dos Dados</span>
        </span>
      </div>

      {/* Banner de Sucesso */}
      {successBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-900 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Alerta de Erro de Restauração */}
      {restoreError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{restoreError}</span>
          </div>
          <button
            type="button"
            onClick={() => setRestoreError(null)}
            className="text-rose-600 hover:text-rose-900 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Resumo Atual das Informações Cadastradas */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 p-3.5 rounded-2xl bg-[var(--cream)] border border-[var(--line)] text-center">
        <div className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)]/60">
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-[var(--muted)] mb-0.5">
            <Briefcase className="w-3 h-3 text-[var(--g)]" />
            <span>Trabalhos</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono-num text-[var(--ink)]">
            {totalJobs}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)]/60">
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-[var(--muted)] mb-0.5">
            <Users className="w-3 h-3 text-[var(--copper)]" />
            <span>Clientes</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono-num text-[var(--ink)]">
            {totalClients}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)]/60">
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-[var(--muted)] mb-0.5">
            <Calendar className="w-3 h-3 text-indigo-500" />
            <span>Agenda</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono-num text-[var(--ink)]">
            {totalAppointments}
          </div>
        </div>
      </div>

      {/* Informações sobre o Último Backup Realizado */}
      <div className="p-3.5 rounded-2xl bg-[var(--cream)]/60 border border-[var(--line)] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--copper)] shrink-0 shadow-xs">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] block">
              Último backup realizado
            </span>
            <span className="font-semibold text-[var(--ink)]">
              {lastBackup ? lastBackup.formattedDate : 'Nenhum backup realizado neste aparelho'}
            </span>
          </div>
        </div>

        {lastBackup && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Concluído com sucesso ({lastBackup.jobsCount} reg.)</span>
            </span>
          </div>
        )}
      </div>

      {/* Botões Principais de Ação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Botão 1: Salvar Meus Dados */}
        <button
          type="button"
          onClick={handleExportBackup}
          disabled={isExporting}
          className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
          title="Baixar arquivo JSON com todos os dados salvos"
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>{isExporting ? 'Reunindo dados...' : 'Salvar meus dados'}</span>
        </button>

        {/* Botão 2: Restaurar Dados */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl border-2 border-[var(--copper)] bg-[var(--paper)] text-[var(--ink)] text-xs font-bold hover:bg-[var(--cream)] transition-all shadow-xs active:scale-[0.99]"
          title="Carregar arquivo JSON para restaurar seus trabalhos e configurações"
        >
          <Upload className="w-4 h-4 text-[var(--copper)]" />
          <span>Restaurar dados</span>
        </button>

        {/* Input Oculto de Arquivo */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          accept=".json,application/json"
          className="hidden"
        />
      </div>

      {/* Botão Secundário: Exportar Relatório em PDF (Opcional) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleExportSummaryPdf}
          disabled={isExportingPdf}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-[var(--line)] bg-[var(--cream)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-semibold transition-colors disabled:opacity-60"
        >
          {isExportingPdf ? (
            <div className="w-3.5 h-3.5 border-2 border-[var(--g)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-[var(--g)]" />
          )}
          <span>Exportar relatório geral em PDF (conferência)</span>
        </button>
      </div>

      {/* Detalhes de Segurança e Instruções */}
      <div className="p-3.5 rounded-2xl bg-[var(--cream)]/40 border border-[var(--line)] text-[11px] text-[var(--muted)] space-y-1.5 leading-relaxed">
        <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
          <FileCheck className="w-3.5 h-3.5 text-[var(--g)]" />
          <span>O que é salvo no arquivo de backup?</span>
        </div>
        <p>
          O arquivo reúne todos os seus <b>trabalhos, clientes, agendamentos, registros financeiros, histórico de pagamentos, fotos de perfil, preferências de tema e seu registro CRF</b>.
        </p>
        <p className="text-[10px] text-[var(--muted)]">
          🔒 Senhas e segredos de sistema são preservados de forma segura e não são expostos no arquivo.
        </p>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE RESTAURAÇÃO */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-[var(--paper)] border border-[var(--line)] rounded-3xl p-5 sm:p-7 shadow-2xl text-[var(--ink)] space-y-5 animate-scale-in">
            {/* Header com Ícone de Atenção */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-base font-bold text-[var(--ink)]">
                    Confirmar Restauração de Dados
                  </h4>
                  <span className="text-[11px] text-[var(--muted)] font-mono">
                    Formato: v{pendingRestore.metadata?.formatVersion || '2.0'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                className="p-1.5 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aviso Obrigatório */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed font-medium">
              <b>Atenção!</b> A restauração poderá substituir informações existentes no aplicativo. Recomendamos salvar um backup dos dados atuais antes de continuar.
            </div>

            {/* Informações do Arquivo a ser Restaurado */}
            <div className="p-3.5 rounded-2xl bg-[var(--cream)] border border-[var(--line)] space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--copper)] block">
                Conteúdo do arquivo selecionado:
              </span>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
                  <span className="text-[10px] text-[var(--muted)] block">Trabalhos</span>
                  <b className="text-sm font-mono-num text-[var(--ink)]">
                    {pendingRestore.metadata?.jobsCount || 0}
                  </b>
                </div>
                <div className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
                  <span className="text-[10px] text-[var(--muted)] block">Clientes</span>
                  <b className="text-sm font-mono-num text-[var(--ink)]">
                    {pendingRestore.metadata?.clientsCount || 0}
                  </b>
                </div>
                <div className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
                  <span className="text-[10px] text-[var(--muted)] block">Agenda</span>
                  <b className="text-sm font-mono-num text-[var(--ink)]">
                    {pendingRestore.metadata?.appointmentsCount || 0}
                  </b>
                </div>
              </div>

              {pendingRestore.metadata?.owner && (
                <div className="pt-2 text-[11px] text-[var(--muted)] flex items-center justify-between border-t border-[var(--line)]">
                  <span>Titular cadastrado:</span>
                  <b className="text-[var(--ink)]">{pendingRestore.metadata.owner}</b>
                </div>
              )}
              {pendingRestore.metadata?.crf && (
                <div className="text-[11px] text-[var(--muted)] flex items-center justify-between">
                  <span>Registro CRF:</span>
                  <b className="text-[var(--g)] font-mono">{pendingRestore.metadata.crf}</b>
                </div>
              )}
            </div>

            {/* Botões: Duas Possibilidades */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="w-full py-3 px-4 rounded-2xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {isRestoring ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Substituir os dados atuais pelos dados do backup</span>
              </button>

              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                className="w-full py-2.5 px-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--cream)] text-xs font-semibold transition-colors"
              >
                Cancelar a operação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
