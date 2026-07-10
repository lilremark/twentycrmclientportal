import { describe, expect, it } from "vitest";

import type {
  PortalDashboardWidget,
  TwentyFieldMetadata,
} from "@/lib/db/schema";
import {
  buildDashboardResults,
  dashboardRequiredFields,
  resolveDashboardLayouts,
  validatePortalDashboardWidgets,
} from "@/lib/portal-dashboard";

const fields: TwentyFieldMetadata[] = [
  {
    id: "amount",
    name: "amount",
    label: "Amount",
    type: "NUMBER",
    isNullable: true,
  },
  {
    id: "status",
    name: "status",
    label: "Status",
    type: "SELECT",
    isNullable: true,
    options: [
      { value: "OPEN", label: "Open" },
      { value: "WON", label: "Won" },
    ],
  },
  {
    id: "updatedAt",
    name: "updatedAt",
    label: "Updated at",
    type: "DATE_TIME",
    isNullable: true,
  },
];

describe("portal dashboards", () => {
  it("validates metric and chart fields against synchronized metadata", () => {
    const widgets: PortalDashboardWidget[] = [
      {
        id: "total",
        type: "number",
        label: "Total value",
        aggregate: "sum",
        field: "status",
      },
      {
        id: "by-status",
        type: "bar",
        label: "By status",
        aggregate: "count",
        groupBy: "missing",
      },
    ];

    expect(validatePortalDashboardWidgets(widgets, fields)).toEqual([
      'Dashboard widget "Total value" must calculate a numeric field.',
      'Dashboard chart "By status" needs a group field.',
    ]);
  });

  it("loads only the fields required by configured widgets", () => {
    expect(
      dashboardRequiredFields(
        [
          {
            id: "total",
            type: "number",
            label: "Total value",
            aggregate: "sum",
            field: "amount",
          },
          {
            id: "by-status",
            type: "donut",
            label: "By status",
            aggregate: "count",
            groupBy: "status",
          },
        ],
        fields,
      ),
    ).toEqual([
      { name: "amount", label: "Amount" },
      { name: "status", label: "Status" },
    ]);
  });

  it("builds metric and chart results from portal records", () => {
    const results = buildDashboardResults({
      fields,
      widgets: [
        {
          id: "count",
          type: "number",
          label: "Open items",
          aggregate: "count",
        },
        {
          id: "value",
          type: "number",
          label: "Average value",
          aggregate: "average",
          field: "amount",
        },
        {
          id: "by-status",
          type: "bar",
          label: "By status",
          aggregate: "count",
          groupBy: "status",
        },
      ],
      records: [
        { id: "1", amount: 10, status: "OPEN" },
        { id: "2", amount: 20, status: "WON" },
        { id: "3", amount: 30, status: "OPEN" },
      ],
    });

    expect(results[0]).toMatchObject({ label: "Open items", value: "3" });
    expect(results[1]).toMatchObject({ label: "Average value", value: "20" });
    expect(results[2]).toMatchObject({
      label: "By status",
      points: [
        { label: "Open", value: 2 },
        { label: "Won", value: 1 },
      ],
    });
  });

  it("builds live list and date trend widgets from portal records", () => {
    const results = buildDashboardResults({
      fields,
      widgets: [
        {
          id: "recent",
          type: "list",
          label: "Recent records",
          aggregate: "count",
          groupBy: "status",
        },
        {
          id: "trend",
          type: "trend",
          label: "Updates over time",
          aggregate: "count",
          groupBy: "updatedAt",
        },
      ],
      records: [
        { id: "1", status: "OPEN", updatedAt: "2026-07-01T12:00:00.000Z" },
        { id: "2", status: "WON", updatedAt: "2026-07-02T12:00:00.000Z" },
        { id: "3", status: "OPEN", updatedAt: "2026-07-02T18:00:00.000Z" },
      ],
    });

    expect(results[0]).toMatchObject({
      type: "list",
      total: 3,
      items: [
        { id: "1", label: "Open", meta: "Status" },
        { id: "2", label: "Won", meta: "Status" },
        { id: "3", label: "Open", meta: "Status" },
      ],
    });
    expect(results[1]).toMatchObject({
      type: "trend",
      points: [
        { label: "Jul 1", value: 1 },
        { label: "Jul 2", value: 2 },
      ],
    });
  });

  it("requires date metadata for trend widgets", () => {
    expect(
      validatePortalDashboardWidgets(
        [
          {
            id: "trend",
            type: "trend",
            label: "Status trend",
            aggregate: "count",
            groupBy: "status",
          },
        ],
        fields,
      ),
    ).toEqual(['Dashboard trend "Status trend" must use a date field.']);
  });

  it("repacks overlapping widget layouts without hiding dashboard data", () => {
    const layouts = resolveDashboardLayouts([
      { type: "number", layout: { x: 0, y: 0, w: 3, h: 2 } },
      { type: "number", layout: { x: 3, y: 0, w: 3, h: 2 } },
      { type: "donut", layout: { x: 0, y: 1, w: 6, h: 2 } },
    ]);

    expect(layouts).toEqual([
      { x: 0, y: 0, w: 3, h: 2 },
      { x: 3, y: 0, w: 3, h: 2 },
      { x: 6, y: 0, w: 6, h: 4 },
    ]);
  });
});
