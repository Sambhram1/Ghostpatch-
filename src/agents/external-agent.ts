import type { GhostpatchConfig } from "../config.js";
import { planPatch } from "../pipeline/patch.js";
import { reviewArtifacts } from "../pipeline/review.js";
import type {
  CodingAgentName,
  Opportunity,
  PatchPlan,
  ReproResult,
  ReviewResult
} from "../types.js";
import type { AgentConnection, CodingAgentProvider } from "./types.js";
import {
  invokeAgentCommand,
  quoteForShell,
  type AgentCommand
} from "./invoke-agent.js";

function buildPrompt(
  name: Exclude<CodingAgentName, "local">,
  opportunity: Opportunity,
  reproResult: ReproResult
): string {
  return [
    "You are running inside Ghostpatch dry-run mode.",
    "Do not edit files, run commands, create branches, open issues, or open pull requests.",
    "Return a concise patch plan only.",
    "",
    `Agent: ${name}`,
    `Repository: ${opportunity.repoProfile.repo}`,
    `Language: ${opportunity.repoProfile.language}`,
    `Opportunity: ${opportunity.title}`,
    `Expected: ${opportunity.expectedBehavior}`,
    `Actual: ${opportunity.actualBehavior}`,
    `Validation command: ${reproResult.validationCommand}`,
    "",
    "Suggested files:",
    ...opportunity.suggestedFiles.map((file) => `- ${file}`),
    "",
    "Reproduction evidence:",
    ...reproResult.evidence.map((item) => `- ${item}`),
    "",
    "Respond with:",
    "- risk assessment",
    "- minimal patch outline",
    "- tests to run",
    "- whether this should be direct-pr, issue-first, or skip"
  ].join("\n");
}

function defaultAgentCommand(
  name: Exclude<CodingAgentName, "local">,
  connection: AgentConnection | undefined,
  prompt: string
): AgentCommand | undefined {
  if (connection?.dryRunCommand) {
    const promptValue = quoteForShell(prompt);
    const commandText = connection.dryRunCommand.includes("{{prompt}}")
      ? connection.dryRunCommand.replaceAll("{{prompt}}", promptValue)
      : `${connection.dryRunCommand} ${promptValue}`;

    return {
      command: commandText,
      args: [],
      shell: true
    };
  }

  const command = connection?.command ?? name;

  if (name === "codex") {
    const args = [
      "exec",
      "--sandbox",
      "read-only",
      "--cd",
      process.cwd(),
      prompt
    ];

    return {
      command: [command, ...args].map(quoteForShell).join(" "),
      args: [],
      shell: true
    };
  }

  const args = [
    "-p",
    "--permission-mode",
    "default",
    prompt
  ];

  return {
    command: [command, ...args].map(quoteForShell).join(" "),
    args: [],
    shell: true
  };
}

export function createExternalAgent(
  name: Exclude<CodingAgentName, "local">,
  connection?: AgentConnection
): CodingAgentProvider {
  return {
    name,
    async status() {
      if (connection?.envVar && process.env[connection.envVar]) {
        return {
          ready: true,
          detail: `using ${connection.envVar} from environment`
        };
      }

      if (connection?.dryRunCommand) {
        return {
          ready: true,
          detail: `registered dry-run command`
        };
      }

      if (connection?.command) {
        return {
          ready: true,
          detail: `registered CLI command: ${connection.command}`
        };
      }

      return {
        ready: false,
        detail: `run ghostpatch login ${name} --command ${name}`
      };
    },
    async generatePatch(
      opportunity: Opportunity,
      reproResult: ReproResult,
      config: GhostpatchConfig
    ): Promise<PatchPlan> {
      const basePlan = planPatch(opportunity, reproResult, config);
      const prompt = buildPrompt(name, opportunity, reproResult);
      const command = defaultAgentCommand(name, connection, prompt);

      if (!command) {
        return {
          ...basePlan,
          outline: [
            ...basePlan.outline,
            `No ${name} dry-run command configured.`
          ],
          agentName: name,
          agentMode: "external-ready",
          agentExitCode: 1,
          agentOutput: `Run ghostpatch login ${name} --command ${name}`
        };
      }

      const invocation = await invokeAgentCommand(command);
      const output = [
        invocation.stdout,
        invocation.stderr ? `stderr: ${invocation.stderr}` : "",
        invocation.timedOut ? "timed out" : ""
      ].filter(Boolean).join("\n");

      return {
        ...basePlan,
        outline: [
          ...basePlan.outline,
          invocation.exitCode === 0
            ? `${name} dry-run completed without write access.`
            : `${name} dry-run failed before patch handoff.`
        ],
        agentName: name,
        agentMode: "external-dry-run",
        agentExitCode: invocation.exitCode,
        agentOutput: output
      };
    },
    async reviewPatch(
      opportunity: Opportunity,
      patch: PatchPlan
    ): Promise<ReviewResult> {
      return reviewArtifacts(opportunity, patch);
    }
  };
}
