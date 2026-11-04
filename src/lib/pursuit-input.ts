// Pure helpers for pursuit scoring inputs (safe to import from client components).
import { INDEPENDENCE, isOneOf, type Independence } from "./enums";

export interface ProofFlags {
  invitation: boolean;
  completion: boolean;
  thirdParty: boolean;
}

/** Blank/invalid -> null (use the estimate); otherwise rounded and clamped to 0-100. */
export function parseBrand(v: unknown): number | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
}

export const parseIndependenceInput = (v: unknown): Independence => (isOneOf(INDEPENDENCE, v) ? v : "mixed");

/** Read the three proof checkboxes from a form. */
export function parseProofs(fd: FormData): ProofFlags {
  const on = (k: string) => fd.get(k) === "on";
  return { invitation: on("invitationProof"), completion: on("completionProof"), thirdParty: on("thirdPartyProof") };
}

export const DISQUALIFIER_TEXT: Record<string, string> = {
  pay_to_publish: "Pay-to-publish / pay-to-play venue",
  invitation_without_completion: "Invitation without completion proof",
  employer_only: "Employer-only recognition",
  advertorial: "Advertorial / sponsored content",
  routine_duty: "Routine duty of the job",
};

export interface ScoreView {
  brand: number;
  brandEstimated: boolean;
  eb1a: number;
  factors: { prestige: number; independence: number; corroboration: number; selectivity: number };
  penalties: string[];
  independence: Independence;
  leverage: number;
  fullCredit: boolean; // completion proof present
}

export const COMPLETION_WARNING = "Invitation without completion proof gets 0.3x: attach completion proof (agenda, published piece, roster) before relying on this.";

/** Suggest proofs from evidence labels/checklist items; the user still confirms. */
export function suggestProofs(ev: { label: string; checklistItem: string | null }[]): ProofFlags {
  const has = (re: RegExp) => ev.some((e) => re.test(`${e.label} ${e.checklistItem ?? ""}`));
  return {
    invitation: has(/invit/i),
    completion: has(/complet|agenda|program|roster|published|the article|slides|recording|presented|thank|acknowledg|featuring you/i),
    thirdParty: has(/third[- ]party|press|coverage|citation|circulation|audience|reference letter|independent|adoption|reputation|indexing/i),
  };
}
