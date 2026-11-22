#!/usr/bin/env node

const usage = `Usage: software-factory [--help]

Start the local software factory workflow CLI.
`;

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  process.stdout.write(usage);
} else {
  process.stderr.write(`Unknown argument: ${args[0]}\n\n${usage}`);
  process.exitCode = 2;
}
