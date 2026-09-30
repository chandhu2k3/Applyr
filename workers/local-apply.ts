// Local apply runner: `npm run apply:local -- <url> [--headed] [--dry-run]`
// Thin wrapper over the shared pipeline (same code the dashboard uses).
// --dry-run prints the full plan without touching the form.
import { runApplyPipeline } from "../lib/apply/pipeline";

const url = process.argv[2];
if (!url) {
  console.error("usage: npm run apply:local -- <url> [--headed] [--dry-run]");
  process.exit(1);
}

async function main(): Promise<void> {
  const result = await runApplyPipeline({
    url,
    headed: process.argv.includes("--headed"),
    dryRun: process.argv.includes("--dry-run"),
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
