import { db } from "./db";

const DAY = 86_400_000;
export const DEADLINE_WINDOW_DAYS = 14;
export const STALE_DAYS = 30;

export interface ReminderOpp {
  id: string;
  title: string;
  deadline: Date | null;
  pursued: boolean; // has a non-dropped pursuit
}
export interface ReminderPursuit {
  id: string;
  title: string;
  state: string;
  lastActivity: Date;
}
export interface Reminders {
  deadlines: { id: string; title: string; deadline: Date; daysLeft: number; pursued: boolean }[];
  stale: { id: string; title: string; state: string; daysIdle: number }[];
}

/** Pure: deadlines in the next 14 days, and shortlisted/applied pursuits idle > 30 days. */
export function computeReminders(opps: ReminderOpp[], pursuits: ReminderPursuit[], now = new Date()): Reminders {
  const deadlines = opps
    .filter((o): o is ReminderOpp & { deadline: Date } => !!o.deadline)
    .map((o) => ({ id: o.id, title: o.title, deadline: o.deadline, daysLeft: Math.ceil((o.deadline.getTime() - now.getTime()) / DAY), pursued: o.pursued }))
    .filter((o) => o.daysLeft >= 0 && o.daysLeft <= DEADLINE_WINDOW_DAYS)
    .sort((a, b) => Number(b.pursued) - Number(a.pursued) || a.daysLeft - b.daysLeft);
  const stale = pursuits
    .filter((p) => p.state === "shortlisted" || p.state === "applied")
    .map((p) => ({ id: p.id, title: p.title, state: p.state, daysIdle: Math.floor((now.getTime() - p.lastActivity.getTime()) / DAY) }))
    .filter((p) => p.daysIdle > STALE_DAYS)
    .sort((a, b) => b.daysIdle - a.daysIdle);
  return { deadlines, stale };
}

export async function getReminders(now = new Date()): Promise<Reminders> {
  const [opps, pursuits] = await Promise.all([
    db.opportunity.findMany({
      where: { deadline: { gte: now, lte: new Date(now.getTime() + DEADLINE_WINDOW_DAYS * DAY) } },
      include: { pursuits: { select: { state: true } } },
    }),
    db.pursuit.findMany({ where: { state: { in: ["shortlisted", "applied"] } }, include: { opportunity: true } }),
  ]);
  return computeReminders(
    opps.map((o) => ({ id: o.id, title: o.title, deadline: o.deadline, pursued: o.pursuits.some((p) => p.state !== "dropped") })),
    pursuits.map((p) => ({
      id: p.id,
      title: p.opportunity.title,
      state: p.state,
      lastActivity: [p.createdAt, p.appliedOn, p.decidedOn].filter((d): d is Date => !!d).reduce((a, b) => (b > a ? b : a)),
    })),
    now,
  );
}
