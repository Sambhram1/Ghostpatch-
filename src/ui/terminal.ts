import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export const ansi = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m"
};

export function color(value: string, code: string): string {
  return `${code}${value}${ansi.reset}`;
}

export function brand(): void {
  output.write(`${color("Ghostpatch", ansi.bold + ansi.cyan)} ${color("terminal operator", ansi.gray)}\n`);
  output.write(`${color("Find. Verify. Decide. Then act.", ansi.dim)}\n\n`);
}

export function divider(label?: string): void {
  const text = label ? ` ${label} ` : "";
  output.write(`${color(`-${text}${"-".repeat(Math.max(8, 54 - text.length))}`, ansi.gray)}\n`);
}

export async function typeLine(text: string, delayMs = 8): Promise<void> {
  if (!output.isTTY || process.env.CI) {
    output.write(`${text}\n`);
    return;
  }

  for (const char of text) {
    output.write(char);
    await sleep(delayMs);
  }
  output.write("\n");
}

export async function spinner<T>(
  label: string,
  task: () => Promise<T>
): Promise<T> {
  if (!output.isTTY || process.env.CI) {
    output.write(`${label}...\n`);
    return task();
  }

  const frames = ["|", "/", "-", "\\"];
  let index = 0;
  const timer = setInterval(() => {
    output.write(`\r${color(frames[index % frames.length], ansi.cyan)} ${label}`);
    index += 1;
  }, 80);

  try {
    const result = await task();
    clearInterval(timer);
    output.write(`\r${color("✓", ansi.green)} ${label}\n`);
    return result;
  } catch (error) {
    clearInterval(timer);
    output.write(`\r${color("x", ansi.red)} ${label}\n`);
    throw error;
  }
}

export async function promptText(question: string, defaultValue?: string): Promise<string> {
  const rl = createInterface({ input, output });
  const suffix = defaultValue ? ` ${color(`(${defaultValue})`, ansi.gray)}` : "";
  const answer = await rl.question(`${question}${suffix}: `);
  rl.close();
  return answer.trim() || defaultValue || "";
}

export async function promptChoice<T extends string>(
  question: string,
  choices: Array<{ label: string; value: T }>
): Promise<T> {
  output.write(`${question}\n`);
  choices.forEach((choice, index) => {
    output.write(`  ${index + 1}. ${choice.label}\n`);
  });

  while (true) {
    const answer = await promptText("Choose", "1");
    const index = Number(answer) - 1;
    if (choices[index]) {
      return choices[index].value;
    }
    output.write(color("Choose one of the listed numbers.\n", ansi.yellow));
  }
}

export async function promptMultiChoice<T extends string>(
  question: string,
  choices: Array<{ label: string; value: T }>,
  defaultValues: T[]
): Promise<T[]> {
  output.write(`${question}\n`);
  choices.forEach((choice, index) => {
    output.write(`  ${index + 1}. ${choice.label}\n`);
  });
  const defaultIndexes = choices
    .map((choice, index) => defaultValues.includes(choice.value) ? String(index + 1) : "")
    .filter(Boolean)
    .join(",");

  while (true) {
    const answer = await promptText("Choose comma-separated numbers", defaultIndexes);
    const indexes = answer.split(",").map((item) => Number(item.trim()) - 1);
    const selected = indexes.map((index) => choices[index]).filter(Boolean);
    if (selected.length > 0) {
      return [...new Set(selected.map((choice) => choice.value))];
    }
    output.write(color("Choose at least one listed number.\n", ansi.yellow));
  }
}

export async function promptConfirm(question: string, defaultYes = true): Promise<boolean> {
  const answer = await promptText(question, defaultYes ? "Y" : "n");
  return ["y", "yes"].includes(answer.toLowerCase());
}

export function printKeyValue(label: string, value: string): void {
  output.write(`${color(label.padEnd(18), ansi.gray)} ${value}\n`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
