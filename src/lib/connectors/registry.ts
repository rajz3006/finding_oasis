import { developersEvents } from "@/connectors/developers-events";
import { openalex } from "@/connectors/openalex";
import { crossref } from "@/connectors/crossref";
import { doaj } from "@/connectors/doaj";
import { github } from "@/connectors/github";
import { orcid } from "@/connectors/orcid";
import { semanticScholar } from "@/connectors/semantic-scholar";
import { patentsview } from "@/connectors/patentsview";
import type { Connector } from "./types";

export const CONNECTORS: Record<string, Connector> = Object.fromEntries(
  [developersEvents, openalex, crossref, doaj, github, orcid, semanticScholar, patentsview].map((c) => [c.name, c]),
);
export const getConnector = (name: string): Connector | undefined => CONNECTORS[name];
