import React, { useMemo } from 'react';
import {
  Bell,
  Calendar,
  AlertTriangle,
  FileText,
  Target,
  CheckCheck,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Database, PageId, Prefs } from '../types';
import {
  today,
  addDays,
  dateLabel,
  money,
  calculateDueAll,
  currentMonth,
  calculateMonthReceivedTotal,
} from '../utils';

interface NotificationsPageProps {
  db: Database;
  onNavigate: (page: PageId) => void;
  onSavePrefs: (prefs: Prefs) => void;
}

export interface ComputedNotification {
  id: string;
  type: 'appointment' | 'overdue' | 'upcoming_payment' | 'quote' | 'goal';
  title: string;
  description: string;
  date: string;
  targetPage: PageId;
  severity: 'info' | 'warning' | 'danger' | 'success';
}

export function computeAppNotifications(db: Database): ComputedNotification[] {
  const list: ComputedNotification[] = [];
  const now = today();
  const next3Days = addDays(now, 3);

  // 1. Compromissos próximos (hoje até 3 dias)
  (db.appointments || []).forEach((a) => {
    if (a.status !== 'cancelled' && a.date >= now && a.date <= next3Days) {
      list.push({
        id: `appt-${a.id}-${a.date}`,
        type: 'appointment',
        title: a.date === now ? 'Compromisso Hoje na Agenda' : 'Compromisso Próximo',
        description: `${a.task || 'Serviço'} em ${a.place} — ${dateLabel(a.date)} ${
          a.time ? `às ${a.time}` : ''
        }`,
        date: a.date,
        targetPage: 'calendar',
        severity: 'info',
      });
    }
  });

  // 2. Trabalhos agendados futuros
  (db.jobs || []).forEach((j) => {
    if (j.status !== 'cancelled' && (j.status === 'scheduled' || j.date > now)) {
      list.push({
        id: `sched-job-${j.id}`,
        type: 'appointment',
        title: 'Trabalho Agendado',
        description: `${j.profession} em ${j.place} agendado para ${dateLabel(j.date)}`,
        date: j.date,
        targetPage: 'jobs',
        severity: 'info',
      });
    }
  });

  // 3. Pagamentos atrasados & a vencer
  (db.jobs || []).forEach((j) => {
    if (j.status === 'cancelled') return;
    const due = calculateDueAll(j);
    if (due > 0.01 && j.dueDate) {
      if (j.dueDate < now) {
        list.push({
          id: `overdue-${j.id}-${j.dueDate}`,
          type: 'overdue',
          title: 'Pagamento em Atraso',
          description: `${j.profession} (${j.place}) — Saldo de ${money(due)} venceu em ${dateLabel(
            j.dueDate
          )}.`,
          date: j.dueDate,
          targetPage: 'finance',
          severity: 'danger',
        });
      } else if (j.dueDate <= next3Days) {
        list.push({
          id: `due-soon-${j.id}-${j.dueDate}`,
          type: 'upcoming_payment',
          title: 'Pagamento Próximo do Vencimento',
          description: `${j.profession} (${j.place}) — ${money(due)} vence em ${dateLabel(
            j.dueDate
          )}.`,
          date: j.dueDate,
          targetPage: 'finance',
          severity: 'warning',
        });
      }
    }
  });

  // 4. Orçamentos aguardando resposta
  (db.quotes || []).forEach((q) => {
    if (q.status === 'sent' || q.status === 'draft') {
      list.push({
        id: `quote-${q.id}-${q.status}`,
        type: 'quote',
        title: 'Orçamento Aguardando Resposta',
        description: `Proposta "${q.title}" para ${q.clientName} (válida até ${dateLabel(
          q.validUntil
        )}).`,
        date: q.createdAt,
        targetPage: 'quotes',
        severity: 'warning',
      });
    }
  });

  // 5. Meta atingida no mês
  const goal = Number(db.prefs?.goal) || 0;
  if (goal > 0) {
    const mStr = db.prefs.goalMonth || currentMonth();
    const rec = calculateMonthReceivedTotal(db.jobs || [], mStr);
    if (rec >= goal) {
      list.push({
        id: `goal-reached-${mStr}`,
        type: 'goal',
        title: 'Meta Financeira Mensal Atingida!',
        description: `Parabéns! Você atingiu ${money(rec)} recebidos e superou sua meta de ${money(
          goal
        )}.`,
        date: now,
        targetPage: 'business',
        severity: 'success',
      });
    }
  }

  return list;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  db,
  onNavigate,
  onSavePrefs,
}) => {
  const notifications = useMemo(() => computeAppNotifications(db), [db]);
  const readIds = new Set(db.prefs?.readNotificationIds || []);

  const handleMarkAsRead = (id: string) => {
    const next = Array.from(new Set([...(db.prefs.readNotificationIds || []), id]));
    onSavePrefs({
      ...db.prefs,
      readNotificationIds: next,
    });
  };

  const handleMarkAllAsRead = () => {
    const next = Array.from(
      new Set([...(db.prefs.readNotificationIds || []), ...notifications.map((n) => n.id)])
    );
    onSavePrefs({
      ...db.prefs,
      readNotificationIds: next,
    });
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
            Alertas Inteligentes
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5">
            Central de Notificações ({unreadCount} não lidas)
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Acompanhe lembretes de compromissos, cobranças a vencer, pagamentos em atraso, orçamentos e metas.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="self-start sm:self-auto px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--cream)] text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-[var(--g)]" />
            <span>Marcar todas como lidas</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)]">
          <Bell className="w-10 h-10 mx-auto mb-2 text-[var(--muted)] opacity-50" />
          <h4 className="text-sm font-bold text-[var(--ink)]">Tudo tranquilo por aqui!</h4>
          <p className="text-xs text-[var(--muted)] max-w-xs mx-auto mt-1">
            Você não possui alertas de atraso nem compromissos pendentes para os próximos dias.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isRead = readIds.has(n.id);
            const iconMap = {
              appointment: <Calendar className="w-4 h-4 text-[#2563EB]" />,
              overdue: <AlertTriangle className="w-4 h-4 text-[#DC4545]" />,
              upcoming_payment: <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />,
              quote: <FileText className="w-4 h-4 text-indigo-500" />,
              goal: <Target className="w-4 h-4 text-[#16A36A]" />,
            };

            return (
              <div
                key={n.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isRead
                    ? 'bg-[var(--paper)]/70 border-[var(--line)] opacity-75'
                    : 'bg-[var(--paper)] border-[var(--g)]/50 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--cream)] border border-[var(--line)] shrink-0 mt-0.5">
                    {iconMap[n.type]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[var(--ink)]">{n.title}</h4>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#2563EB]" title="Não lida" />
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{n.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {!isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(n.id)}
                      className="px-2.5 py-1.5 rounded-xl border border-[var(--line)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Lida
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleMarkAsRead(n.id);
                      onNavigate(n.targetPage);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[var(--g)] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
