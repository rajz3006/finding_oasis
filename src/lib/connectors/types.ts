import type { Effort, OppType, VenueKind } from "@/lib/enums";

export interface SourceConfig {
  /** Free-form per-source settings (query overrides, limits). */
  [key: string]: unknown;
}

export interface ProfileCtx {
  name: string;
  orcid: string;
  email: string;
}

export interface NormalizedVenue {
  name: string;
  kind: VenueKind;
  homepage?: string;
  selectivity?: string;
  indexing?: string;
  cost?: string;
  fieldTags?: string[];
  notes?: string;
}

export interface NormalizedOpp {
  venue?: NormalizedVenue;
  title: string;
  type: OppType;
  criterionIds: number[];
  deadline?: Date | null;
  url: string; // required: dedupe key with sourceId
  effort?: Effort;
  raw?: unknown;
}

export interface ConnectorContext {
  fetch: typeof fetch;
  profile: ProfileCtx;
  /** Extra metric notes (e.g. citation counts); stored in Source.config. */
  note: (key: string, value: unknown) => void;
  /** Throttle wait. Resolves false (without waiting) if the time budget can't cover it: stop and return partial results. */
  pause?: (ms: number) => Promise<boolean>;
}

export interface Connector {
  name: string;
  fetch(config: SourceConfig, fieldScope: string[], ctx: ConnectorContext): Promise<NormalizedOpp[]>;
}

export interface RunResult {
  source: string;
  ok: boolean;
  found: number;
  created: number;
  updated: number;
  error?: string;
  /** Stopped early at the time budget; progress so far was saved. */
  partial?: boolean;
}
