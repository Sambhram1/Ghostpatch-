import { mkdir } from "node:fs/promises";
import path from "node:path";

import { ghostpatchHome } from "../config-home.js";
import { runCommand, requireSuccess } from "../process/command.js";

function repoDirName(repo: string): string {
  return repo.replace(/[\/\\:]/g, "__");
}

export function workspacePath(repo: string): string {
  return path.join(ghostpatchHome(), "workspaces", repoDirName(repo));
}

export async function cloneOrUpdateRepo(repo: string): Promise<string> {
  const target = workspacePath(repo);
  await mkdir(path.dirname(target), { recursive: true });

  const status = await runCommand("git", ["-C", target, "status", "--short"], {
    timeoutMs: 30000
  });

  if (status.exitCode === 0) {
    const fetch = await runCommand("git", ["fetch", "--all", "--prune"], {
      cwd: target,
      timeoutMs: 180000
    });
    requireSuccess(fetch, `Update ${repo}`);
    return target;
  }

  const clone = await runCommand("gh", ["repo", "clone", repo, target], {
    timeoutMs: 180000
  });
  requireSuccess(clone, `Clone ${repo}`);
  return target;
}

export async function createBranch(repoDir: string, branch: string): Promise<void> {
  const result = await runCommand("git", ["checkout", "-B", branch], { cwd: repoDir });
  requireSuccess(result, `Create branch ${branch}`);
}

export async function currentBranch(repoDir: string): Promise<string> {
  const result = await runCommand("git", ["branch", "--show-current"], { cwd: repoDir });
  requireSuccess(result, "Read current branch");
  return result.stdout;
}

export async function ensureCleanWorkspace(repoDir: string): Promise<void> {
  const files = await changedFiles(repoDir);
  if (files.length > 0) {
    throw new Error(`Workspace has uncommitted changes: ${files.join(", ")}`);
  }
}

export async function remoteBranchExists(repoDir: string, branch: string): Promise<boolean> {
  const result = await runCommand("git", ["ls-remote", "--heads", "origin", branch], {
    cwd: repoDir,
    timeoutMs: 30000
  });
  requireSuccess(result, `Check remote branch ${branch}`);
  return result.stdout.trim().length > 0;
}

export async function changedFiles(repoDir: string): Promise<string[]> {
  const result = await runCommand("git", ["status", "--short"], { cwd: repoDir });
  requireSuccess(result, "Read changed files");
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

export async function diffStat(repoDir: string): Promise<string> {
  const result = await runCommand("git", ["diff", "--stat", "HEAD"], { cwd: repoDir });
  requireSuccess(result, "Read diff stat");
  return result.stdout || "No diff";
}

export async function fullDiff(repoDir: string): Promise<string> {
  const result = await runCommand("git", ["diff", "HEAD"], { cwd: repoDir });
  requireSuccess(result, "Read diff");
  return result.stdout || "No diff";
}

export async function commitAll(repoDir: string, message: string): Promise<void> {
  requireSuccess(await runCommand("git", ["add", "-A"], { cwd: repoDir }), "Git add");
  requireSuccess(await runCommand("git", ["commit", "-m", message], { cwd: repoDir }), "Git commit");
}

export async function pushBranch(repoDir: string, branch: string): Promise<void> {
  requireSuccess(await runCommand("git", ["push", "-u", "origin", branch], {
    cwd: repoDir,
    timeoutMs: 180000
  }), `Push branch ${branch}`);
}
