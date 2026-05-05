import {
  fetchPullRequestChecks,
  fetchPullRequestComments,
  fetchPullRequestReviews,
  type GitHubCheckSummary,
  type GitHubPullRequestComment,
  type GitHubPullRequestReview
} from "../github/github-cli.js";
import {
  appendPrMemoryEvent,
  type PrMemoryEvent,
  type PrMemoryRecord
} from "./pr-memory-store.js";

export interface PrFollowUpPayload {
  comments: GitHubPullRequestComment[];
  reviews: GitHubPullRequestReview[];
  checks: GitHubCheckSummary[];
}

export function normalizePrFollowUp(payload: PrFollowUpPayload): PrMemoryEvent[] {
  const events: PrMemoryEvent[] = [];

  for (const comment of payload.comments) {
    events.push({
      type: "issue-comment",
      createdAt: comment.created_at,
      source: "github",
      content: comment.body,
      githubId: `comment-${comment.id}`
    });
  }

  for (const review of payload.reviews) {
    const state = review.state.toUpperCase();
    const type = state === "CHANGES_REQUESTED"
      ? "review-request-changes"
      : state === "APPROVED"
        ? "review-approved"
        : "review-comment";
    events.push({
      type,
      createdAt: review.submitted_at ?? new Date().toISOString(),
      source: "github",
      content: review.body?.trim() || `Review state: ${review.state}`,
      githubId: `review-${review.id}`
    });
  }

  for (const check of payload.checks) {
    const conclusion = check.conclusion?.toLowerCase() ?? "";
    if (conclusion === "success") {
      events.push({
        type: "ci-passed",
        createdAt: new Date().toISOString(),
        source: "github",
        content: `${check.name ?? "check"} passed`,
        githubId: `check-${check.name ?? "unknown"}-passed`
      });
    } else if (conclusion && conclusion !== "neutral" && conclusion !== "skipped") {
      events.push({
        type: "ci-failed",
        createdAt: new Date().toISOString(),
        source: "github",
        content: `${check.name ?? "check"} failed with ${conclusion}`,
        githubId: `check-${check.name ?? "unknown"}-${conclusion}`
      });
    }
  }

  return events;
}

export async function refreshPrMemoryFromGitHub(record: PrMemoryRecord): Promise<PrMemoryRecord> {
  if (!record.prNumber) {
    return record;
  }

  const [comments, reviews, checks] = await Promise.all([
    fetchPullRequestComments(record.repo, record.prNumber),
    fetchPullRequestReviews(record.repo, record.prNumber),
    fetchPullRequestChecks(record.repo, record.prNumber)
  ]);

  let next = appendPrMemoryEvent(record, {
    type: "resume-attempt",
    createdAt: new Date().toISOString(),
    source: "ghostpatch",
    content: `Refreshing follow-up context for PR #${record.prNumber}.`
  });

  for (const event of normalizePrFollowUp({ comments, reviews, checks })) {
    next = appendPrMemoryEvent(next, event);
  }

  return next;
}
