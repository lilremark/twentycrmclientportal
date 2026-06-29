import { randomUUID } from "node:crypto";

import type { TwentyObjectMetadata } from "@/lib/db/schema";

const statusOptions = [
  { value: "PLANNING", label: "Planning", color: "blue" },
  { value: "IN_PROGRESS", label: "In progress", color: "blue" },
  { value: "AT_RISK", label: "At risk", color: "red" },
  { value: "COMPLETE", label: "Complete", color: "green" },
];

const invoiceStatusOptions = [
  { value: "DRAFT", label: "Draft", color: "gray" },
  { value: "SENT", label: "Sent", color: "blue" },
  { value: "PAID", label: "Paid", color: "green" },
  { value: "OVERDUE", label: "Overdue", color: "red" },
];

function fields(
  object: string,
  definitions: Array<
    [string, string, string, boolean?, Array<{ value: string; label: string; color?: string }>?,]
  >,
) {
  return definitions.map(([name, label, type, isNullable = true, options]) => ({
    id: `demo-${object}-${name}`,
    name,
    label,
    type,
    isNullable,
    options,
  }));
}

export const demoTwentyMetadata: TwentyObjectMetadata[] = [
  {
    id: "demo-object-project",
    nameSingular: "project",
    namePlural: "projects",
    labelSingular: "Project",
    labelPlural: "Projects",
    fields: fields("project", [
      ["id", "ID", "UUID", false],
      ["name", "Project", "TEXT", false],
      ["status", "Status", "SELECT", false, statusOptions],
      ["priority", "Priority", "SELECT", true, [
        { value: "LOW", label: "Low", color: "gray" },
        { value: "MEDIUM", label: "Medium", color: "blue" },
        { value: "HIGH", label: "High", color: "orange" },
        { value: "URGENT", label: "Urgent", color: "red" },
      ]],
      ["owner", "Owner", "TEXT"],
      ["budget", "Budget", "NUMBER"],
      ["progress", "Progress", "NUMBER"],
      ["dueDate", "Due date", "DATE"],
      ["description", "Description", "RICH_TEXT"],
      ["clientId", "Client ID", "TEXT", false],
    ]),
  },
  {
    id: "demo-object-invoice",
    nameSingular: "invoice",
    namePlural: "invoices",
    labelSingular: "Invoice",
    labelPlural: "Invoices",
    fields: fields("invoice", [
      ["id", "ID", "UUID", false],
      ["invoiceNumber", "Invoice", "TEXT", false],
      ["project", "Project", "TEXT"],
      ["status", "Status", "SELECT", false, invoiceStatusOptions],
      ["amount", "Amount", "NUMBER", false],
      ["issuedDate", "Issued date", "DATE"],
      ["dueDate", "Due date", "DATE"],
      ["notes", "Notes", "RICH_TEXT"],
      ["clientId", "Client ID", "TEXT", false],
    ]),
  },
];

const store: Record<string, Array<Record<string, unknown>>> = {
  projects: [
    { id: "project-atlas", name: "Atlas website launch", status: "IN_PROGRESS", priority: "HIGH", owner: "Maya Chen", budget: 48000, progress: 72, dueDate: "2026-07-18", description: "Launch the new customer-facing website and migration plan.", clientId: "demo-person-1" },
    { id: "project-northstar", name: "Northstar research sprint", status: "AT_RISK", priority: "URGENT", owner: "Theo Martin", budget: 26500, progress: 43, dueDate: "2026-07-08", description: "Validate the onboarding journey with priority customer groups.", clientId: "demo-person-1" },
    { id: "project-orbit", name: "Orbit analytics rollout", status: "PLANNING", priority: "MEDIUM", owner: "Priya Shah", budget: 32000, progress: 18, dueDate: "2026-08-22", description: "Deploy analytics dashboards and stakeholder reporting.", clientId: "demo-person-1" },
    { id: "project-beacon", name: "Beacon support program", status: "COMPLETE", priority: "LOW", owner: "Jon Bell", budget: 14500, progress: 100, dueDate: "2026-06-12", description: "Create the customer enablement and support playbook.", clientId: "demo-person-1" },
    { id: "project-summit", name: "Summit brand refresh", status: "IN_PROGRESS", priority: "MEDIUM", owner: "Amara Cole", budget: 19000, progress: 61, dueDate: "2026-07-30", description: "Refresh the visual system across customer touchpoints.", clientId: "demo-person-1" },
  ],
  invoices: [
    { id: "invoice-1048", invoiceNumber: "INV-1048", project: "Atlas website launch", status: "PAID", amount: 12000, issuedDate: "2026-06-01", dueDate: "2026-06-15", notes: "Discovery and design milestone.", clientId: "demo-person-1" },
    { id: "invoice-1052", invoiceNumber: "INV-1052", project: "Northstar research sprint", status: "SENT", amount: 13250, issuedDate: "2026-06-20", dueDate: "2026-07-05", notes: "Research execution milestone.", clientId: "demo-person-1" },
    { id: "invoice-1044", invoiceNumber: "INV-1044", project: "Beacon support program", status: "OVERDUE", amount: 7250, issuedDate: "2026-05-12", dueDate: "2026-05-27", notes: "Final delivery and enablement.", clientId: "demo-person-1" },
    { id: "invoice-1055", invoiceNumber: "INV-1055", project: "Orbit analytics rollout", status: "DRAFT", amount: 8000, issuedDate: "2026-06-27", dueDate: "2026-07-12", notes: "Initial analytics configuration.", clientId: "demo-person-1" },
  ],
};

const projectNames = [
  "Cedar onboarding redesign",
  "Harbor client dashboard",
  "Lighthouse content migration",
  "Monarch partner portal",
  "Pioneer workflow automation",
  "Redwood data cleanup",
  "Solstice campaign launch",
  "Vista customer research",
  "Willow mobile experience",
  "Aurora reporting suite",
  "Cascade service blueprint",
  "Drift knowledge base",
  "Evergreen retention program",
  "Foundry design system",
  "Grove billing integration",
  "Horizon accessibility audit",
  "Juniper account expansion",
  "Keystone API rollout",
  "Meadow lifecycle mapping",
];
const demoOwners = [
  "Maya Chen",
  "Theo Martin",
  "Priya Shah",
  "Jon Bell",
  "Amara Cole",
  "Nina Patel",
  "Eli Brooks",
];

store.projects.push(
  ...projectNames.map((name, index) => ({
    id: `project-demo-${String(index + 1).padStart(2, "0")}`,
    name,
    status: ["PLANNING", "IN_PROGRESS", "IN_PROGRESS", "AT_RISK", "COMPLETE"][index % 5],
    priority: ["LOW", "MEDIUM", "HIGH", "URGENT"][index % 4],
    owner: demoOwners[index % demoOwners.length],
    budget: 12000 + index * 2750,
    progress: [12, 28, 46, 63, 81, 100][index % 6],
    dueDate: `2026-${String(7 + Math.floor(index / 8)).padStart(2, "0")}-${String(4 + (index * 3) % 24).padStart(2, "0")}`,
    description: `${name} delivery plan, milestones, and client review activity.`,
    clientId: "demo-person-1",
  })),
);

store.invoices.push(
  ...Array.from({ length: 20 }, (_, index) => ({
    id: `invoice-demo-${1060 + index}`,
    invoiceNumber: `INV-${1060 + index}`,
    project: projectNames[index % projectNames.length],
    status: ["DRAFT", "SENT", "PAID", "PAID", "OVERDUE"][index % 5],
    amount: 3250 + index * 725,
    issuedDate: `2026-${String(5 + Math.floor(index / 9)).padStart(2, "0")}-${String(2 + (index * 2) % 24).padStart(2, "0")}`,
    dueDate: `2026-${String(6 + Math.floor(index / 9)).padStart(2, "0")}-${String(4 + (index * 2) % 24).padStart(2, "0")}`,
    notes: `Milestone billing for ${projectNames[index % projectNames.length]}.`,
    clientId: "demo-person-1",
  })),
);

function comparable(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : value;
}

function matchesOperator(value: unknown, operator: string, expected: unknown) {
  const actual = comparable(value);
  const wanted = comparable(expected);
  if (operator === "eq" || operator === "is") return actual === wanted;
  if (operator === "neq") return actual !== wanted;
  if (operator === "contains") return String(actual ?? "").includes(String(wanted));
  if (operator === "startsWith") return String(actual ?? "").startsWith(String(wanted));
  if (operator === "in" || operator === "containsAny") return Array.isArray(expected) && expected.map(comparable).includes(actual);
  if (operator === "gt") return Number(actual) > Number(wanted);
  if (operator === "gte") return Number(actual) >= Number(wanted);
  if (operator === "lt") return Number(actual) < Number(wanted);
  if (operator === "lte") return Number(actual) <= Number(wanted);
  return true;
}

function matches(record: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  if (Array.isArray(filter.and)) {
    return filter.and.every((item) => matches(record, item as Record<string, unknown>));
  }
  return Object.entries(filter).every(([field, condition]) => {
    if (!condition || typeof condition !== "object") return true;
    const relation = condition as Record<string, unknown>;
    const operators = relation.id && typeof relation.id === "object"
      ? relation.id as Record<string, unknown>
      : relation;
    return Object.entries(operators).every(([operator, expected]) =>
      matchesOperator(record[field], operator, expected),
    );
  });
}

export function listDemoRecords(input: {
  objectNamePlural: string;
  filter: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
}) {
  const records = [...(store[input.objectNamePlural] ?? [])].filter((record) => matches(record, input.filter));
  const [sortField, sortDirection] = Object.entries(input.orderBy ?? {})[0] ?? [];
  if (sortField) {
    records.sort((left, right) => String(left[sortField] ?? "").localeCompare(String(right[sortField] ?? "")) * (sortDirection === "DescNullsLast" || sortDirection === "DESC" ? -1 : 1));
  }
  return {
    edges: records.map((node) => ({ node: { ...node } })),
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: undefined,
      endCursor: undefined,
    },
  };
}

export function getDemoRecord(input: { objectNameSingular: string; filter: Record<string, unknown> }) {
  const records = store[`${input.objectNameSingular}s`] ?? [];
  return records.find((record) => matches(record, input.filter)) ?? null;
}

export function writeDemoRecord(input: { operation: "create" | "update"; objectNameSingular: string; data: Record<string, unknown>; id?: string }) {
  const records = store[`${input.objectNameSingular}s`] ?? (store[`${input.objectNameSingular}s`] = []);
  if (input.operation === "update") {
    const index = records.findIndex((record) => record.id === input.id);
    if (index < 0) throw new Error("The demo record no longer exists.");
    records[index] = { ...records[index], ...input.data };
    return { ...records[index] };
  }
  const record = { id: randomUUID(), ...input.data };
  records.unshift(record);
  return { ...record };
}

export function deleteDemoRecord(input: { objectNamePlural: string; recordId: string }) {
  const records = store[input.objectNamePlural] ?? [];
  const index = records.findIndex((record) => record.id === input.recordId);
  if (index >= 0) records.splice(index, 1);
}
