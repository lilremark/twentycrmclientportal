import { describe, expect, it } from "vitest";

import type {
  PortalDashboardWidget,
  TwentyFieldMetadata,
} from "@/lib/db/schema";
import {
  buildDashboardResults,
  dashboardRequiredFields,
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
});
