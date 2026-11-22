export const workflowStatuses = ["ready", "in-progress", "blocked", "done"] as const;
export const categories = ["incident", "issue", "planbaar-werk"] as const;
export const triageStatuses = [
  "needs-triage",
  "needs-info",
  "ready-for-agent",
  "ready-for-human",
  "wontfix",
] as const;

export type WorkflowStatus = (typeof workflowStatuses)[number];
export type WorkItemCategory = (typeof categories)[number];

export interface WorkItem {
  id: string;
  title: string;
  category: WorkItemCategory;
  priority: number;
  workflowStatus: WorkflowStatus;
  triageStatus: (typeof triageStatuses)[number];
  scopeApproval: "approved" | "pending" | "rejected";
  dependencies: string[];
  acceptanceCriteria: string[];
  runReferences: string[];
  path: string;
}

export interface WorkItemIssue {
  path: string;
  message: string;
}

export interface SchemaProperty {
  type?: "string" | "integer" | "array";
  enum?: unknown[];
  format?: string;
  pattern?: string;
  minimum?: number;
  minLength?: number;
  minItems?: number;
  uniqueItems?: boolean;
  items?: SchemaProperty;
}

export interface WorkItemSchema {
  type: "object";
  required: string[];
  additionalProperties?: boolean;
  properties: Record<string, SchemaProperty>;
}

export interface WorkItemInput {
  path: string;
  markdown: string;
  workflowStatus: string;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const frontmatterPattern = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*$|\r?\n)/;

function validateValue(
  name: string,
  value: unknown,
  property: SchemaProperty,
  path: string,
): WorkItemIssue[] {
  const issues: WorkItemIssue[] = [];
  if (property.type === "string" && typeof value !== "string") {
    return [{ path, message: `${name} must be a string` }];
  }
  if (property.type === "integer" && (!Number.isInteger(value) || typeof value !== "number")) {
    return [{ path, message: `${name} must be an integer` }];
  }
  if (property.type === "array" && !Array.isArray(value)) {
    return [{ path, message: `${name} must be an array` }];
  }
  if (property.enum !== undefined && !property.enum.includes(value)) {
    issues.push({ path, message: `${name} has an unsupported value` });
  }
  if (typeof value === "string") {
    if (property.minLength !== undefined && value.length < property.minLength) {
      issues.push({ path, message: `${name} must not be empty` });
    }
    if (property.format === "uuid" && !uuidPattern.test(value)) {
      issues.push({ path, message: `${name} must be a UUID` });
    }
    if (property.pattern !== undefined && !new RegExp(property.pattern).test(value)) {
      issues.push({ path, message: `${name} does not match the required format` });
    }
  }
  if (typeof value === "number" && property.minimum !== undefined && value < property.minimum) {
    issues.push({ path, message: `${name} must be at least ${property.minimum}` });
  }
  if (Array.isArray(value)) {
    if (property.minItems !== undefined && value.length < property.minItems) {
      issues.push({ path, message: `${name} must contain at least ${property.minItems} item(s)` });
    }
    if (property.uniqueItems && new Set(value).size !== value.length) {
      issues.push({ path, message: `${name} must not contain duplicates` });
    }
    if (property.items !== undefined) {
      for (const [index, item] of value.entries()) {
        issues.push(...validateValue(`${name}[${index}]`, item, property.items, path));
      }
    }
  }
  return issues;
}

function validateSchemaObject(value: unknown, schema: WorkItemSchema, path: string): WorkItemIssue[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [{ path, message: "frontmatter must be a JSON object" }];
  }
  const record = value as Record<string, unknown>;
  const issues: WorkItemIssue[] = [];
  for (const required of schema.required) {
    if (!(required in record)) issues.push({ path, message: `missing required field: ${required}` });
  }
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(record)) {
      if (!(key in schema.properties)) issues.push({ path, message: `unknown field: ${key}` });
    }
  }
  for (const [key, property] of Object.entries(schema.properties)) {
    if (key in record) issues.push(...validateValue(key, record[key], property, path));
  }
  return issues;
}

export function parseWorkItem(
  input: WorkItemInput,
  schema: WorkItemSchema,
): { item?: WorkItem; issues: WorkItemIssue[] } {
  const issues: WorkItemIssue[] = [];
  const frontmatter = frontmatterPattern.exec(input.markdown)?.[1];
  if (frontmatter === undefined) {
    return { issues: [{ path: input.path, message: "missing JSON frontmatter" }] };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(frontmatter) as unknown;
  } catch (error) {
    return {
      issues: [{ path: input.path, message: `invalid JSON frontmatter: ${error instanceof Error ? error.message : String(error)}` }],
    };
  }
  issues.push(...validateSchemaObject(raw, schema, input.path));
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { issues };
  const value = raw as Record<string, unknown>;
  const heading = /^#\s+(.+?)\s*$/m.exec(input.markdown)?.[1]?.trim();
  if (heading === undefined || heading.replace(/^\d+:\s*/, "").trim() !== value.title) {
    issues.push({ path: input.path, message: "frontmatter title must match the Markdown heading" });
  }

  if (typeof value.workflowStatus === "string" && value.workflowStatus !== input.workflowStatus) {
    issues.push({ path: input.path, message: `workflow status '${value.workflowStatus}' does not match directory '${input.workflowStatus}'` });
  }
  if (
    ["ready", "in-progress", "done"].includes(String(value.workflowStatus)) &&
    value.scopeApproval !== "approved"
  ) {
    issues.push({ path: input.path, message: `${String(value.workflowStatus)} work items require approved scope` });
  }

  const category = value.category;
  const priority = value.priority;
  if (typeof category === "string" && typeof priority === "number") {
    const validBand =
      (category === "incident" && priority >= 0 && priority <= 100) ||
      (category === "issue" && priority >= 101 && priority <= 200) ||
      (category === "planbaar-werk" && priority >= 201);
    if (!validBand) issues.push({ path: input.path, message: `priority ${priority} is outside the ${category} band` });
  }

  if (issues.length > 0) return { issues };
  return {
    item: {
      id: value.id as string,
      title: value.title as string,
      category: value.category as WorkItemCategory,
      priority: value.priority as number,
      workflowStatus: value.workflowStatus as WorkflowStatus,
      triageStatus: value.triageStatus as (typeof triageStatuses)[number],
      scopeApproval: value.scopeApproval as WorkItem["scopeApproval"],
      dependencies: value.dependencies as string[],
      acceptanceCriteria: value.acceptanceCriteria as string[],
      runReferences: value.runReferences as string[],
      path: input.path,
    },
    issues,
  };
}

export function validateWorkItems(items: WorkItem[]): WorkItemIssue[] {
  const issues: WorkItemIssue[] = [];
  const byId = new Map<string, WorkItem>();
  const openPriorities = new Map<number, WorkItem>();

  for (const item of items) {
    const previous = byId.get(item.id);
    if (previous !== undefined) {
      issues.push({ path: item.path, message: `duplicate work-item ID also used by ${previous.path}: ${item.id}` });
    } else {
      byId.set(item.id, item);
    }
    if (item.workflowStatus !== "done") {
      const previousPriority = openPriorities.get(item.priority);
      if (previousPriority !== undefined) {
        issues.push({ path: item.path, message: `duplicate open-work priority ${item.priority} also used by ${previousPriority.path}` });
      } else {
        openPriorities.set(item.priority, item);
      }
    }
  }

  for (const item of items) {
    for (const dependency of item.dependencies) {
      if (!byId.has(dependency)) issues.push({ path: item.path, message: `unknown dependency: ${dependency}` });
      if (dependency === item.id) issues.push({ path: item.path, message: "work item cannot depend on itself" });
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (item: WorkItem, chain: string[]): void => {
    if (visiting.has(item.id)) {
      issues.push({ path: item.path, message: `dependency cycle: ${[...chain, item.id].join(" -> ")}` });
      return;
    }
    if (visited.has(item.id)) return;
    visiting.add(item.id);
    for (const dependencyId of item.dependencies) {
      const dependency = byId.get(dependencyId);
      if (dependency !== undefined) visit(dependency, [...chain, item.id]);
    }
    visiting.delete(item.id);
    visited.add(item.id);
  };
  for (const item of items) visit(item, []);
  return issues;
}
