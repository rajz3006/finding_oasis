"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { CATALOG_STATUSES, CRITERION_IDS, EFFORTS, OPP_TYPES, QUALITY_TIERS, STRENGTHS, VENUE_KINDS, isOneOf } from "@/lib/enums";
import { parseBrand, parseIndependenceInput, parseProofs } from "@/lib/pursuit-input";
import { parseDate, parseIntArray, serializeIntArray, serializeStringArray } from "@/lib/json";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const criteriaOf = (fd: FormData) =>
  fd.getAll("criterionIds").map(Number).filter((n) => isOneOf(CRITERION_IDS.map(String), String(n)));

/** Create a venue from form fields prefixed with `p` (e.g. "venue_"). */
function venueData(fd: FormData, p = "") {
  const kind = str(fd, p + "kind");
  const tier = str(fd, p + "qualityTier");
  return {
    name: str(fd, p + "name") ?? "Untitled venue",
    kind: isOneOf(VENUE_KINDS, kind) ? kind : "conference",
    qualityTier: isOneOf(QUALITY_TIERS, tier) ? tier : "unrated",
    avoidFlag: fd.get(p + "avoidFlag") === "on",
    selectivity: str(fd, p + "selectivity"),
    indexing: str(fd, p + "indexing"),
    cost: str(fd, p + "cost"),
    homepage: str(fd, p + "homepage"),
    fieldTags: serializeStringArray((str(fd, p + "fieldTags") ?? "").split(",").map((s) => s.trim()).filter(Boolean)),
    notes: str(fd, p + "notes"),
  };
}

async function oppData(fd: FormData) {
  const type = str(fd, "type");
  const effort = str(fd, "effort");
  const status = str(fd, "statusCatalog");
  let venueId = str(fd, "venueId");
  if (venueId === "__new") {
    venueId = (await db.venue.create({ data: venueData(fd, "venue_") })).id;
  }
  return {
    title: str(fd, "title") ?? "Untitled",
    type: isOneOf(OPP_TYPES, type) ? type : "publish_article",
    criterionIds: serializeIntArray(criteriaOf(fd)),
    deadline: parseDate(str(fd, "deadline")),
    url: str(fd, "url"),
    effort: isOneOf(EFFORTS, effort) ? effort : "medium",
    statusCatalog: isOneOf(CATALOG_STATUSES, status) ? status : "unknown",
    venueId: venueId || null,
  };
}

async function manualSourceId() {
  await ensureSeeded();
  return (await db.source.findUnique({ where: { name: "manual" } }))?.id ?? null;
}

export async function saveOpportunity(fd: FormData) {
  const id = str(fd, "id");
  const data = await oppData(fd);
  if (id) await db.opportunity.update({ where: { id }, data });
  else await db.opportunity.create({ data: { ...data, sourceId: await manualSourceId() } });
  revalidatePath("/opportunities");
  redirect("/opportunities");
}

export async function deleteOpportunityAction(fd: FormData) {
  const id = str(fd, "id");
  if (id && (await db.pursuit.count({ where: { opportunityId: id } })) === 0) await db.opportunity.delete({ where: { id } });
  revalidatePath("/opportunities");
  redirect("/opportunities");
}

/** Manual opportunity + completed pursuit in one go. */
export async function saveAchievement(fd: FormData) {
  const data = await oppData(fd);
  const strength = str(fd, "strength");
  const opp = await db.opportunity.create({ data: { ...data, statusCatalog: "closed", sourceId: await manualSourceId() } });
  const proofs = parseProofs(fd);
  const completedOn = parseDate(str(fd, "completedOn")) ?? new Date();
  const p = await db.pursuit.create({
    data: {
      opportunityId: opp.id,
      state: "completed",
      criterionIds: data.criterionIds,
      strength: isOneOf(STRENGTHS, strength) ? strength : null,
      completedOn,
      notes: str(fd, "notes"),
      brandScore: parseBrand(fd.get("brandScore")),
      independence: parseIndependenceInput(fd.get("independence")),
      invitationProof: proofs.invitation,
      completionProof: proofs.completion,
      thirdPartyProof: proofs.thirdParty,
    },
  });
  revalidatePath("/opportunities");
  revalidatePath("/pipeline");
  redirect(`/evidence/pursuit/${p.id}`);
}

export async function shortlist(fd: FormData) {
  const id = str(fd, "id");
  if (!id) return;
  const opp = await db.opportunity.findUnique({ where: { id } });
  if (!opp) return;
  const existing = await db.pursuit.findFirst({ where: { opportunityId: id, state: { not: "dropped" } } });
  if (!existing)
    await db.pursuit.create({
      data: { opportunityId: id, state: "shortlisted", criterionIds: serializeIntArray(parseIntArray(opp.criterionIds)) },
    });
  revalidatePath("/opportunities");
  revalidatePath("/pipeline");
}

export async function saveVenue(fd: FormData) {
  const id = str(fd, "id");
  const data = venueData(fd);
  if (id) await db.venue.update({ where: { id }, data });
  else await db.venue.create({ data });
  revalidatePath("/opportunities/venues");
  redirect("/opportunities/venues");
}
