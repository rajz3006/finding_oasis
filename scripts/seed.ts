import { seedAll } from "../src/lib/seed";
import { db } from "../src/lib/db";

seedAll()
  .then((r) =>
    console.log(`Seeded ${r.criteria} criteria, ${r.sources} sources, +${r.venues} venues, +${r.opportunities} opportunities`),
  )
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
