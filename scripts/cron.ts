// Optional scheduler: `npm run cron`. Weekly for most sources, daily for GitHub, monthly for DOAJ.
import cron from "node-cron";
import { ensureSeeded } from "../src/lib/seed";
import { runConnector } from "../src/lib/connectors/runner";

const SCHEDULE: Record<string, string> = {
  "developers.events": "0 6 * * 1",
  OpenAlex: "15 6 * * 1",
  Crossref: "30 6 * * 1",
  DOAJ: "45 6 1 * *",
  GitHub: "0 7 * * *",
  arXiv: "20 7 * * 2",
  "NSF Awards": "40 7 1 * *",
  GDELT: "0 8 * * 3",
  "Google Alerts": "0 9 * * *",
  "GitHub Profile": "10 7 * * *",
  "Site Analytics": "20 7 * * *",
  "Newsletter RSS": "30 7 * * 1",
};

ensureSeeded().then(() => {
  for (const [name, expr] of Object.entries(SCHEDULE)) {
    cron.schedule(expr, () => void runConnector(name).then((r) => console.log(JSON.stringify(r))));
  }
  console.log("cron started:", Object.keys(SCHEDULE).join(", "));
});
