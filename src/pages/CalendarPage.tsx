import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  MapPin,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';
import { Job, Appointment, Client } from '../types';
import {
  today,
  dateLabel,
  money,
  calculateTotal,
  hlabel,
  calculateHours,
  uid,
  checkAppointmentConflict,
  formatClientFullAddress,
  buildWhatsAppUrl,
  addDays,
} from '../utils';

interface CalendarPageProps {
  jobs: Job[];
  appointments: Appointment[];
  clients: Client[];
  initialOpenNew?: boolean;
  onConsumeOpenNew?: () => void;
  onSaveAppointment: (appt: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  onEditJob: (job: Job) => void;
}

type CalendarViewMode = 'month' | 'week' | 'day';

export const CalendarPage: React.FC<CalendarPageProps> = ({
  jobs,
  appointments,
  clients,
  initialOpenNew = false,
  onConsumeOpenNew,
  onSaveAppointment,
  onDeleteAppointment,
  onEditJob,
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentCursor, setCurrentCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(today());
  const [showForm, setShowForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  const [formData, setFormData] = useState<Appointment>({
    id: '',
    date: selectedDay,
    time: '09:00',
    durationMinutes: 120,
    place: '',
    task: '',
    clientId: '',
    jobId: '',
    address: '',
    value: 0,
    reminder: 'day',
    status: 'scheduled',
    notes: '',
  });

  useEffect(() => {
    if (initialOpenNew) {
      setEditingAppt(null);
      setFormData({
        id: '',
        date: selectedDay,
        time: '09:00',
        durationMinutes: 120,
        place: '',
        task: '',
        clientId: '',
        jobId: '',
        address: '',
        value: 0,
        reminder: 'day',
        status: 'scheduled',
        notes: '',
      });
      setShowForm(true);
      if (onConsumeOpenNew) onConsumeOpenNew();
    }
  }, [initialOpenNew, onConsumeOpenNew, selectedDay]);

  const year = currentCursor.getFullYear();
  const month = currentCursor.getMonth();

  const monthTitle = new Date(year, month, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Compute week days for Weekly view around selectedDay
  const weekDays = useMemo(() => {
    const base = new Date(`${selectedDay}T12:00:00`);
    const dayOfWeek = base.getDay();
    const sunday = new Date(base);
    sunday.setDate(base.getDate() - dayOfWeek);
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + idx);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        iso,
        dayNum: d.getDate(),
        shortLabel: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      };
    });
  }, [selectedDay]);

  // Live conflict check while filling out form
  const conflictingAppt = useMemo(() => {
    if (!showForm || !formData.date || !formData.time) return null;
    return checkAppointmentConflict(appointments, {
      id: editingAppt?.id,
      date: formData.date,
      time: formData.time,
      durationMinutes: Number(formData.durationMinutes) || 60,
    });
  }, [showForm, appointments, editingAppt, formData.date, formData.time, formData.durationMinutes]);

  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentCursor(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      setSelectedDay(addDays(selectedDay, -7));
    } else {
      setSelectedDay(addDays(selectedDay, -1));
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentCursor(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      setSelectedDay(addDays(selectedDay, 7));
    } else {
      setSelectedDay(addDays(selectedDay, 1));
    }
  };

  const handleOpenNew = (targetDate = selectedDay) => {
    setEditingAppt(null);
    setFormData({
      id: uid(),
      date: targetDate,
      time: '09:00',
      durationMinutes: 120,
      place: '',
      task: '',
      clientId: '',
      jobId: '',
      address: '',
      value: 0,
      reminder: 'day',
      status: 'scheduled',
      notes: '',
    });
    setShowForm(true);
  };

  const handleEditAppt = (appt: Appointment) => {
    setEditingAppt(appt);
    setFormData({
      durationMinutes: 120,
      status: 'scheduled',
      ...appt,
    });
    setShowForm(true);
  };

  const handleSelectClientInForm = (clientId: string) => {
    const cli = clients.find((c) => c.id === clientId);
    if (cli) {
      setFormData((prev) => ({
        ...prev,
        clientId,
        place: prev.place || cli.name,
        address: prev.address || formatClientFullAddress(cli),
      }));
    } else {
      setFormData((prev) => ({ ...prev, clientId: '' }));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.place.trim()) {
      return;
    }

    onSaveAppointment({
      ...formData,
      id: formData.id || uid(),
      place: formData.place.trim(),
      task: formData.task.trim(),
      address: (formData.address || '').trim(),
      durationMinutes: Number(formData.durationMinutes) || 60,
      value: Number(formData.value) || 0,
      notes: formData.notes.trim(),
    });

    setShowForm(false);
  };

  const dayJobs = jobs.filter((j) => j.date === selectedDay);
  const dayAppointments = appointments
    .filter((a) => a.date === selectedDay)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      {/* Page Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
            Planejamento e Compromissos
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5">
            Agenda Profissional
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Visualize por mês, semana ou dia, vincule clientes e receba alertas de conflito de horário.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--paper)] p-1">
            {(['month', 'week', 'day'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === mode
                    ? 'bg-[var(--g)] text-white shadow-2xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {mode === 'month' ? 'Mensal' : mode === 'week' ? 'Semanal' : 'Diária'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleOpenNew(selectedDay)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar</span>
          </button>
        </div>
      </div>

      {/* Calendar View Container */}
      <div className="p-4 sm:p-6 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={prevPeriod}
            className="p-2 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h3 className="text-base sm:text-lg font-extrabold capitalize text-[var(--ink)]">
              {viewMode === 'month'
                ? monthTitle
                : viewMode === 'week'
                ? `Semana de ${dateLabel(weekDays[0].iso)} a ${dateLabel(weekDays[6].iso)}`
                : dateLabel(selectedDay)}
            </h3>
            {selectedDay !== today() && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDay(today());
                  setCurrentCursor(new Date());
                }}
                className="text-[11px] font-bold text-[var(--g)] hover:underline cursor-pointer"
              >
                Ir para Hoje
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={nextPeriod}
            className="p-2 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* MONTHLY VIEW */}
        {viewMode === 'month' && (
          <>
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-[var(--muted)]">
              {weekdays.map((wd) => (
                <div key={wd} className="py-1">
                  {wd}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-12 rounded-xl bg-transparent" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isToday = dayStr === today();
                const isSelected = dayStr === selectedDay;

                const hasJobs = jobs.some((j) => j.date === dayStr && j.status !== 'cancelled');
                const hasAppts = appointments.some((a) => a.date === dayStr && a.status !== 'cancelled');

                return (
                  <button
                    key={dayStr}
                    type="button"
                    onClick={() => setSelectedDay(dayStr)}
                    className={`min-h-12 sm:min-h-16 p-1.5 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--g)] bg-[var(--sage)] text-[var(--g)] font-extrabold shadow-xs'
                        : isToday
                        ? 'border-[#F59E0B] bg-[var(--paper)] text-[#F59E0B] font-bold'
                        : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--g)]/50'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">{dayNum}</span>
                    <div className="flex items-center gap-1 min-h-[6px]">
                      {hasJobs && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#16A36A]"
                          title="Trabalho registrado"
                        />
                      )}
                      {hasAppts && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"
                          title="Compromisso agendado"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* WEEKLY VIEW */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((wd) => {
              const isSelected = wd.iso === selectedDay;
              const isToday = wd.iso === today();
              const dAppts = appointments.filter((a) => a.date === wd.iso && a.status !== 'cancelled');
              const dJobs = jobs.filter((j) => j.date === wd.iso && j.status !== 'cancelled');
              return (
                <button
                  key={wd.iso}
                  type="button"
                  onClick={() => setSelectedDay(wd.iso)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--g)] bg-[var(--sage)] text-[var(--g)] font-bold'
                      : isToday
                      ? 'border-[#F59E0B] text-[#F59E0B]'
                      : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold opacity-80">{wd.shortLabel}</span>
                  <span className="text-base font-extrabold">{wd.dayNum}</span>
                  <span className="text-[10px] font-medium text-[var(--muted)]">
                    {dAppts.length + dJobs.length} item(s)
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)] mt-4 pt-3 border-t border-[var(--line)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
            <span>Compromisso agendado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A36A]" />
            <span>Trabalho realizado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#F59E0B]" />
            <span>Hoje</span>
          </div>
        </div>
      </div>

      {/* Selected Day Schedule & Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--g)]">
              Programação do Dia
            </span>
            <h3 className="text-lg font-extrabold text-[var(--ink)] capitalize">
              {dateLabel(selectedDay)}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => handleOpenNew(selectedDay)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Compromisso</span>
          </button>
        </div>

        {/* Appointment Form */}
        {showForm && (
          <div className="p-5 sm:p-6 rounded-3xl bg-[var(--paper)] border-2 border-[var(--g)] shadow-lg space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h4 className="text-sm font-bold text-[var(--ink)]">
                {editingAppt ? 'Editar Compromisso' : 'Agendar Novo Compromisso'}
              </h4>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Schedule Conflict Alert */}
            {conflictingAppt && (
              <div className="p-3.5 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B] text-xs flex items-start gap-2.5 text-[var(--ink)]">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-[#F59E0B] block">
                    Atenção: Conflito de Horário Detectado!
                  </strong>
                  <span>
                    Você já possui "{conflictingAppt.task || conflictingAppt.place}" agendado às{' '}
                    <b>{conflictingAppt.time}</b> neste mesmo dia.
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Horário de Início *
                </label>
                <input
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Duração Estimada
                </label>
                <select
                  value={formData.durationMinutes || 120}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: Number(e.target.value) })
                  }
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                >
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1h 30min</option>
                  <option value={120}>2 horas</option>
                  <option value={180}>3 horas</option>
                  <option value={240}>4 horas (Meio período)</option>
                  <option value={480}>8 horas (Diária)</option>
                  <option value={720}>12 horas (Plantão)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Vincular Cliente Cadastrado
                </label>
                <select
                  value={formData.clientId || ''}
                  onChange={(e) => handleSelectClientInForm(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                >
                  <option value="">— Selecionar cliente (opcional) —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Cliente / Local *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Nome do cliente ou empresa"
                  value={formData.place}
                  onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Serviço / Atividade *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Ex.: Visita técnica, Instalação, Plantão"
                  value={formData.task}
                  onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Endereço do Compromisso
                </label>
                <input
                  type="text"
                  maxLength={180}
                  placeholder="Rua, número, bairro, cidade"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Valor Previsto (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.value || ''}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Vincular Trabalho Existente
                </label>
                <select
                  value={formData.jobId || ''}
                  onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                >
                  <option value="">Nenhum</option>
                  {jobs.slice(0, 30).map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.profession} - {j.place} ({dateLabel(j.date)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">Lembrete</label>
                <select
                  value={formData.reminder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reminder: e.target.value as 'none' | 'day' | 'week',
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                >
                  <option value="day">Avisar no dia</option>
                  <option value="week">Avisar 1 dia antes</option>
                  <option value="none">Sem lembrete</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">Observações</label>
                <input
                  type="text"
                  maxLength={250}
                  placeholder="Detalhes ou instruções"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                />
              </div>

              <div className="sm:col-span-3 flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-xs font-semibold text-[var(--muted)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--g)] text-white text-xs font-bold shadow-xs hover:bg-[var(--g2)] cursor-pointer"
                >
                  Salvar na Agenda
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Day Events List */}
        {dayJobs.length === 0 && dayAppointments.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--muted)]">
            Nenhum compromisso agendado nem trabalho registrado para {dateLabel(selectedDay)}.
          </div>
        ) : (
          <div className="space-y-3">
            {dayAppointments.map((a) => {
              const cli = clients.find((c) => c.id === a.clientId);
              const addr = a.address || (cli ? formatClientFullAddress(cli) : '');
              const waUrl = cli
                ? buildWhatsAppUrl(
                    cli.whatsapp || cli.phone,
                    `Olá, ${cli.name}! Confirmando nosso agendamento de ${a.task || 'serviço'} para ${dateLabel(a.date)} às ${a.time}.`
                  )
                : '';

              return (
                <div
                  key={a.id}
                  className="p-4 rounded-2xl bg-[var(--paper)] border-l-4 border-l-[#2563EB] border border-[var(--line)] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2563EB]/15 text-[#2563EB]">
                        ⏰ {a.time || 'Horário livre'}{' '}
                        {a.durationMinutes ? `(${a.durationMinutes} min)` : ''}
                      </span>
                      <h5 className="text-sm font-bold text-[var(--ink)]">
                        {a.task || 'Compromisso'} · {a.place}
                      </h5>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {addr ? `📍 ${addr} · ` : ''}
                      {a.value > 0 ? `Valor previsto: ${money(a.value)}` : ''}
                      {a.notes ? ` · ${a.notes}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {addr && (
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`,
                            '_blank',
                            'noopener,noreferrer'
                          )
                        }
                        className="p-1.5 rounded-lg border border-[var(--line)] text-[var(--g)] hover:bg-[var(--sage)] cursor-pointer"
                        title="Abrir endereço no Google Maps"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {waUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(waUrl, '_blank', 'noopener,noreferrer')}
                        className="p-1.5 rounded-lg border border-[#16A36A]/40 text-[#16A36A] hover:bg-[#16A36A]/10 cursor-pointer"
                        title="Confirmar agendamento via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleEditAppt(a)}
                      className="p-1.5 rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Deseja realmente excluir este agendamento?')) {
                          onDeleteAppointment(a.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-[#DC4545] hover:bg-[#DC4545]/10 cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {dayJobs.map((j) => (
              <div
                key={j.id}
                className="p-4 rounded-2xl bg-[var(--paper)] border-l-4 border-l-[#16A36A] border border-[var(--line)] shadow-2xs flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#16A36A]/15 text-[#16A36A] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Trabalho
                    </span>
                    <h5 className="text-sm font-bold text-[var(--ink)]">
                      {j.profession} · {hlabel(calculateHours(j))}
                    </h5>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    ⌖ {j.place} · Total: {money(calculateTotal(j))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEditJob(j)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--line)] text-xs font-semibold hover:bg-[var(--cream)] cursor-pointer"
                >
                  Abrir Trabalho
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
