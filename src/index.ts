import { loadFixtures } from "./fixtures/load-fixtures.js";
import { parseCli } from "./cli.js";
import { runGhostpatch } from "./pipeline/orchestrator.js";
import { renderReport } from "./report/render-report.js";

async function main(): Promise<void> {
  const options = parseCli(process.argv.slice(2));
  const opportunities = await loadFixtures(options.fixture);
  const report = runGhostpatch(opportunities);
  console.log(renderReport(report));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
