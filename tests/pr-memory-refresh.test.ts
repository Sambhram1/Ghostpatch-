import assert from "node:assert/strict";

import { normalizePrFollowUp } from "../src/memory/pr-memory-refresh.js";

export async function testNormalizePrFollowUp(): Promise<void> {
  const events = normalizePrFollowUp({
    comments: [
      {
        id: 11,
        body: "Please update the docs.",
        created_at: "2026-05-05T01:00:00.000Z"
      }
    ],
    reviews: [
      {
        id: 22,
        body: "Need one more test.",
        state: "CHANGES_REQUESTED",
        submitted_at: "2026-05-05T02:00:00.000Z"
      }
    ],
    checks: [
      {
        name: "build",
        conclusion: "failure",
        status: "completed"
      }
    ]
  });

  assert.equal(events.some((event) => event.type === "review-request-changes"), true);
  assert.equal(events.some((event) => event.type === "ci-failed"), true);
  assert.equal(events.some((event) => event.type === "issue-comment"), true);
}
