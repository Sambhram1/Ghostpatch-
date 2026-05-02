import { spawn } from "node:child_process";

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CommandOptions {
  cwd?: string;
  timeoutMs?: number;
  input?: string;
}

const maxOutput = 12000;

function trim(value: string): string {
  if (value.length <= maxOutput) {
    return value.trim();
  }

  return `${value.slice(0, maxOutput).trim()}\n[output truncated]`;
}

export function runCommand(
  command: string,
  args: string[],
  options: CommandOptions = {}
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      shell: process.platform === "win32",
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill();
      stderr += "\ncommand timed out";
    }, options.timeoutMs ?? 120000);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      resolve({
        exitCode: typeof error.errno === "number" ? error.errno : 1,
        stdout: "",
        stderr: error.message
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code ?? 1,
        stdout: trim(stdout),
        stderr: trim(stderr)
      });
    });

    if (options.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();
  });
}

export function requireSuccess(result: CommandResult, context: string): void {
  if (result.exitCode !== 0) {
    throw new Error(`${context} failed: ${result.stderr || result.stdout}`);
  }
}
