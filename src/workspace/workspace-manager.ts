import { mkdir } from "node:fs/promises";
import path from "node:path";

import { ghostpatchHome } from "../config-home.js";
import { runCommand, requireSuccess } from "../process/command.js";

export function repoDirName(repo: string): string {
  return repo.replace(/[\/\\:]/g, "__");
}

export function repoGitUrl(repo: string): string {
  return `https://github.com/${repo}.git`;
}

export function desiredWorkspaceRemotes(upstreamRepo: string, forkRepo: string): {
  originRepo: string;
  upstreamRepo: string;
} {
  return {
    originRepo: forkRepo,
    upstreamRepo
  };
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

export interface PreparedWorkspace {
  repoDir: string;
  originRepo: string;
  upstreamRepo: string;
}

async function ensureRemote(repoDir: string, remote: string, repo: string): Promise<void> {
  const url = repoGitUrl(repo);
  const current = await runCommand("git", ["remote", "get-url", remote], {
    cwd: repoDir,
    timeoutMs: 30000
  });

  if (current.exitCode === 0) {
    requireSuccess(await runCommand("git", ["remote", "set-url", remote, url], {
      cwd: repoDir,
      timeoutMs: 30000
    }), `Update remote ${remote}`);
    return;
  }

  requireSuccess(await runCommand("git", ["remote", "add", remote, url], {
    cwd: repoDir,
    timeoutMs: 30000
  }), `Add remote ${remote}`);
}

export async function prepareForkedWorkspace(
  upstreamRepo: string,
  forkRepo: string
): Promise<PreparedWorkspace> {
  const target = workspacePath(upstreamRepo);
  await mkdir(path.dirname(target), { recursive: true });
  const remotes = desiredWorkspaceRemotes(upstreamRepo, forkRepo);

  const status = await runCommand("git", ["-C", target, "status", "--short"], {
    timeoutMs: 30000
  });

  if (status.exitCode === 0) {
    if (status.stdout.trim()) {
      throw new Error(`Workspace has uncommitted changes: ${status.stdout.split(/\r?\n/).join(", ")}`);
    }

    await ensureRemote(target, "origin", remotes.originRepo);
    await ensureRemote(target, "upstream", remotes.upstreamRepo);
    requireSuccess(await runCommand("git", ["fetch", "--all", "--prune"], {
      cwd: target,
      timeoutMs: 180000
    }), `Update ${upstreamRepo}`);
    return {
      repoDir: target,
      originRepo: remotes.originRepo,
      upstreamRepo: remotes.upstreamRepo
    };
  }

  const clone = await runCommand("gh", ["repo", "clone", forkRepo, target], {
    timeoutMs: 180000
  });
  requireSuccess(clone, `Clone ${forkRepo}`);
  await ensureRemote(target, "origin", remotes.originRepo);
  await ensureRemote(target, "upstream", remotes.upstreamRepo);
  requireSuccess(await runCommand("git", ["fetch", "--all", "--prune"], {
    cwd: target,
    timeoutMs: 180000
  }), `Update ${upstreamRepo}`);
  return {
    repoDir: target,
    originRepo: remotes.originRepo,
    upstreamRepo: remotes.upstreamRepo
  };
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
