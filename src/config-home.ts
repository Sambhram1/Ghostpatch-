import os from "node:os";
import path from "node:path";

export function ghostpatchHome(): string {
  return process.env.GHOSTPATCH_HOME ?? path.join(os.homedir(), ".ghostpatch");
}

export function ghostpatchPath(...parts: string[]): string {
  return path.join(ghostpatchHome(), ...parts);
}
