// Server-side: rubric scores -> serializable view for panels.
import type { Opportunity, Venue } from "@prisma/client";
import { pursuitStrengthScore } from "./rubric";
import { DISQUALIFIER_TEXT, type ScoreView } from "./pursuit-input";

type P = Parameters<typeof pursuitStrengthScore>[0];
export function scoreView(p: P, o: Pick<Opportunity, "type" | "criterionIds">, v: Venue | null): ScoreView {
  const s = pursuitStrengthScore(p, o, v);
  return {
    brand: s.brand,
    brandEstimated: s.brandEstimated,
    eb1a: s.strength.score,
    factors: s.strength.factors,
    penalties: s.strength.disqualifiers.map((d) => DISQUALIFIER_TEXT[d] ?? d),
    independence: s.independence,
    leverage: s.leverage,
    fullCredit: p.completionProof,
  };
}
