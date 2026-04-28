export interface CliOptions {
  command: "run";
  fixture?: string;
}

export function parseCli(argv: string[]): CliOptions {
  const [command = "run", ...rest] = argv;
  if (command !== "run") {
    throw new Error(`Unsupported command: ${command}`);
  }

  const fixtureIndex = rest.indexOf("--fixture");
  const fixture = fixtureIndex >= 0 ? rest[fixtureIndex + 1] : undefined;

  return {
    command,
    fixture
  };
}
