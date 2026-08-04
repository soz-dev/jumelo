import AsyncStorage from '@react-native-async-storage/async-storage';

import { logAdminActivity, type AdminReport } from './adminStore';

const REPORTS_KEY = '@jumelo/admin-reports';

export const REPORT_REASONS = [
  { id: 'harassment', label: 'Harcèlement / insultes' },
  { id: 'spam', label: 'Spam ou publicité' },
  { id: 'fake', label: 'Faux profil / usurpation' },
  { id: 'inappropriate', label: 'Contenu inapproprié' },
  { id: 'other', label: 'Autre' },
] as const;

export type ReportReasonId = (typeof REPORT_REASONS)[number]['id'];

async function readReports(): Promise<AdminReport[]> {
  try {
    const raw = await AsyncStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AdminReport[];
  } catch {
    return [];
  }
}

/** Signalement user → file admin (même store que la console). */
export async function reportUser(params: {
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetName: string;
  reasonId: ReportReasonId;
  details?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (params.reporterId === params.targetId) {
    return { ok: false, error: 'Tu ne peux pas te signaler toi-même.' };
  }
  const reasonLabel =
    REPORT_REASONS.find((r) => r.id === params.reasonId)?.label ?? params.reasonId;
  const details = params.details?.trim();
  const reason = details ? `${reasonLabel} — ${details}` : reasonLabel;

  const rows = await readReports();
  const report: AdminReport = {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    targetType: 'user',
    targetId: params.targetId,
    targetLabel: params.targetName,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString(),
    reporterLabel: params.reporterName,
  };
  rows.unshift(report);
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(rows.slice(0, 200)));
  await logAdminActivity(
    'user_report',
    `${params.reporterName} → ${params.targetName} · ${reason}`,
  );
  return { ok: true };
}
