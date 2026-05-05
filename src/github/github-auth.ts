import type { GhostpatchPreferences } from "../preferences/preferences-store.js";
import type { GitHubTokenEnvVar } from "../preferences/preferences-store.js";

export interface GitHubTokenResolution {
  envVar: GitHubTokenEnvVar;
  token?: string;
}

export interface GitHubTokenStatus {
  ok: boolean;
  envVar: GitHubTokenEnvVar;
  message: string;
}

type FetchLike = typeof fetch;

export function resolveGitHubToken(
  envVar: GitHubTokenEnvVar,
  env: NodeJS.ProcessEnv = process.env
): GitHubTokenResolution {
  const token = env[envVar]?.trim();
  return {
    envVar,
    token: token ? token : undefined
  };
}

export async function validateGitHubToken(
  envVar: GitHubTokenEnvVar,
  token?: string,
  fetchImpl: FetchLike = fetch
): Promise<GitHubTokenStatus> {
  if (!token) {
    return {
      ok: false,
      envVar,
      message: `${envVar} is not set.`
    };
  }

  try {
    const response = await fetchImpl("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ghostpatch"
      }
    });

    if (response.ok) {
      return {
        ok: true,
        envVar,
        message: `${envVar} is ready.`
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        envVar,
        message: `${envVar} is invalid or missing required scopes.`
      };
    }

    return {
      ok: false,
      envVar,
      message: `GitHub token validation failed with HTTP ${response.status}.`
    };
  } catch {
    return {
      ok: false,
      envVar,
      message: "GitHub could not be reached to validate the token."
    };
  }
}

export async function requireGitHubToken(
  envVar: GitHubTokenEnvVar,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: FetchLike = fetch
): Promise<string> {
  const { token } = resolveGitHubToken(envVar, env);
  const status = await validateGitHubToken(envVar, token, fetchImpl);
  if (!status.ok || !token) {
    throw new Error(status.message);
  }

  return token;
}

export async function requireConfiguredGitHubAuth(
  preferences: Pick<GhostpatchPreferences, "githubAuth">,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: FetchLike = fetch
): Promise<{ envVar: GitHubTokenEnvVar; token: string }> {
  const envVar = preferences.githubAuth.envVar;
  const token = await requireGitHubToken(envVar, env, fetchImpl);
  return { envVar, token };
}
