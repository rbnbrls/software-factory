#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseWorkItem, validateWorkItems, type WorkItemInput, type WorkItemSchema } from "./work-items.ts";

const usage = `Usage: software-factory [--help]

       software-factory validate [work-item.md]

Validate all canonical work items, or a work item file together with the
canonical workflow. Work items remain local Markdown; no provider is needed.
`;

const args = process.argv.slice(2);

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workItemRoot = path.join(repositoryRoot, "factory", "work-items");
const schemaPath = path.join(repositoryRoot, "factory", "schemas", "work-item.schema.json");
const statuses = ["ready", "in-progress", "blocked", "done"] as const;

async function listMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listMarkdownFiles(fullPath)));
    else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") files.push(fullPath);
  }
  return files;
}

function statusForPath(filePath: string): string | undefined {
  const relative = path.relative(workItemRoot, filePath);
  if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) return undefined;
  const firstSegment = relative.split(path.sep)[0];
  return firstSegment;
}

async function validate(targetPath: string | undefined): Promise<number> {
  let schema: WorkItemSchema;
  try {
    schema = JSON.parse(await readFile(schemaPath, "utf8")) as WorkItemSchema;
  } catch (error) {
    process.stderr.write(`${path.relative(repositoryRoot, schemaPath)}: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  const canonicalFiles: string[] = [];
  for (const status of statuses) {
    const statusPath = path.join(workItemRoot, status);
    canonicalFiles.push(...(await listMarkdownFiles(statusPath)));
  }

  const target = targetPath === undefined ? undefined : path.resolve(process.cwd(), targetPath);
  const files = target === undefined
    ? canonicalFiles
    : [...canonicalFiles.filter((file) => path.resolve(file) !== target), target];
  const inputs: WorkItemInput[] = [];
  const loadIssues: { path: string; message: string }[] = [];
  for (const file of files) {
    let workflowStatus = statusForPath(file);
    if (workflowStatus !== undefined && !(statuses as readonly string[]).includes(workflowStatus)) {
      loadIssues.push({ path: file, message: "work item must be inside a workflow status directory" });
      continue;
    }
    try {
      const markdown = await readFile(file, "utf8");
      if (workflowStatus === undefined) {
        const frontmatter = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*$|\r?\n)/.exec(markdown)?.[1];
        try {
          const metadata = frontmatter === undefined ? undefined : JSON.parse(frontmatter) as { workflowStatus?: unknown };
          workflowStatus = typeof metadata?.workflowStatus === "string" ? metadata.workflowStatus : "";
        } catch {
          workflowStatus = "";
        }
      }
      inputs.push({ path: path.relative(repositoryRoot, file), markdown, workflowStatus });
    } catch (error) {
      loadIssues.push({ path: file, message: error instanceof Error ? error.message : String(error) });
    }
  }

  const parsed = inputs.map((input) => ({ input, result: parseWorkItem(input, schema) }));
  const items = parsed.flatMap(({ result }) => result.item === undefined ? [] : [result.item]);
  const itemIssues = parsed.flatMap(({ input, result }) => {
    const isTarget = target !== undefined && path.resolve(repositoryRoot, input.path) === target;
    return target === undefined || isTarget ? result.issues : [];
  });
  const issues = [
    ...loadIssues,
    ...itemIssues,
    ...validateWorkItems(items),
  ];
  if (issues.length > 0) {
    for (const issue of issues) process.stderr.write(`${issue.path}: ${issue.message}\n`);
    process.stderr.write(`Validation failed with ${issues.length} error(s).\n`);
    return 1;
  }
  process.stdout.write(`Validated ${items.length} work item(s).\n`);
  return 0;
}

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  process.stdout.write(usage);
} else if (args[0] === "validate" && args.length <= 2) {
  process.exitCode = await validate(args[1]);
} else {
  process.stderr.write(`Unknown argument: ${args[0]}\n\n${usage}`);
  process.exitCode = 2;
}
