// Optional local scheduler: `npm run cron`. On Vercel, /api/cron/dispatch does this instead.
import cron from "node-cron";
import { ensureSeeded } from "../src/lib/seed";
import { runConnector } from "../src/lib/connectors/runner";
import { SCHEDULE } from "../src/lib/cron-schedule";

ensureSeeded().then(() => {
  for (const [name, { expr }] of Object.entries(SCHEDULE)) {
    cron.schedule(expr, () => void runConnector(name).then((r) => console.log(JSON.stringify(r))));
  }
  console.log("cron started:", Object.keys(SCHEDULE).join(", "));
});
