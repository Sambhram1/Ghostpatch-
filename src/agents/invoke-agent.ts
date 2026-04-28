import { spawn } from "node:child_process";

export interface AgentInvocation {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface AgentCommand {
  command: string;
  args: string[];
  shell?: boolean;
}

const maxCapturedChars = 6000;

function trimOutput(value: string): string {
  if (value.length <= maxCapturedChars) {
    return value.trim();
  }

  return `${value.slice(0, maxCapturedChars).trim()}\n[output truncated]`;
}

export function invokeAgentCommand(
  command: AgentCommand,
  timeoutMs = 60000
): Promise<AgentInvocation> {
  return new Promise((resolve) => {
    const child = spawn(command.command, command.args, {
      cwd: process.cwd(),
      shell: command.shell ?? false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      resolve({
        exitCode: typeof error.errno === "number" ? error.errno : 1,
        stdout: "",
        stderr: error.message,
        timedOut
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code ?? 1,
        stdout: trimOutput(stdout),
        stderr: trimOutput(stderr),
        timedOut
      });
    });
  });
}

export function quoteForShell(value: string): string {
  return `"${value.replaceAll("\"", "\\\"").replaceAll("\r", " ").replaceAll("\n", "\\n")}"`;
}
