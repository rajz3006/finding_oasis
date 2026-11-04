// Usage: npm run connector -- <source name | all>
import { ensureSeeded } from "../src/lib/seed";
import { CONNECTORS } from "../src/lib/connectors/registry";
import { runConnector } from "../src/lib/connectors/runner";

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.log(`Usage: npm run connector -- <name|all>\nAvailable: ${Object.keys(CONNECTORS).join(", ")}`);
    return;
  }
  await ensureSeeded();
  const names = arg === "all" ? Object.keys(CONNECTORS) : [arg];
  for (const n of names) console.log(JSON.stringify(await runConnector(n)));
}
main().then(() => process.exit(0));
