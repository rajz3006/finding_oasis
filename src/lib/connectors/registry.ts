import { developersEvents } from "@/connectors/developers-events";
import { openalex } from "@/connectors/openalex";
import { crossref } from "@/connectors/crossref";
import { doaj } from "@/connectors/doaj";
import { github } from "@/connectors/github";
import { orcid } from "@/connectors/orcid";
import { semanticScholar } from "@/connectors/semantic-scholar";
import { patentsview } from "@/connectors/patentsview";
import { arxiv } from "@/connectors/arxiv";
import { nsfAwards } from "@/connectors/nsf-awards";
import { gdelt } from "@/connectors/gdelt";
import { googleAlerts } from "@/connectors/google-alerts";
import { githubProfile } from "@/connectors/github-profile";
import { siteAnalytics } from "@/connectors/site-analytics";
import { newsletterRss } from "@/connectors/newsletter-rss";
import type { Connector } from "./types";

export const CONNECTORS: Record<string, Connector> = Object.fromEntries(
  [developersEvents, openalex, crossref, doaj, github, orcid, semanticScholar, patentsview, arxiv, nsfAwards, gdelt, googleAlerts, githubProfile, siteAnalytics, newsletterRss].map((c) => [c.name, c]),
);
export const getConnector = (name: string): Connector | undefined => CONNECTORS[name];
