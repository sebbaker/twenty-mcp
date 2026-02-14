import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TwentyCrmClient } from "../client.js";
import { buildFilterQuery, cleanObject } from "../transforms.js";

export function registerOpportunityTools(
  server: McpServer,
  client: TwentyCrmClient,
): void {
  server.registerTool(
    "create_opportunity",
    {
      description: "Create a new opportunity/deal in Twenty CRM",
      inputSchema: {
        name: z.string().describe("Opportunity name"),
        amount: z
          .number()
          .optional()
          .describe("Deal amount (in micros, e.g., 1000000 = $1)"),
        closeDate: z
          .string()
          .optional()
          .describe("Expected close date (ISO 8601)"),
        stage: z
          .string()
          .optional()
          .describe(
            "Sales stage (e.g., NEW, SCREENING, MEETING, PROPOSAL, CUSTOMER)",
          ),
        companyId: z.string().optional().describe("Associated company ID"),
        pointOfContactId: z
          .string()
          .optional()
          .describe("Point of contact person ID"),
      },
    },
    async (args) => {
      try {
        const body = cleanObject(args);
        const result = await client.request(
          "POST",
          "/rest/opportunities",
          body,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating opportunity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_opportunity",
    {
      description: "Get an opportunity/deal by ID from Twenty CRM",
      inputSchema: {
        id: z.string().describe("The opportunity ID"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.request("GET", `/rest/opportunities/${id}`);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting opportunity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "list_opportunities",
    {
      description:
        "List opportunities/deals from Twenty CRM with optional filtering",
      inputSchema: {
        companyId: z.string().optional().describe("Filter by company ID"),
        stage: z.string().optional().describe("Filter by stage"),
        limit: z
          .number()
          .min(1)
          .max(200)
          .optional()
          .describe("Max number of results (1-200, default 20)"),
        returnAll: z
          .boolean()
          .optional()
          .describe("Return all results with automatic pagination"),
      },
    },
    async (args) => {
      try {
        const qs = buildFilterQuery(
          cleanObject({ companyId: args.companyId, stage: args.stage }),
        );
        let result;
        if (args.returnAll) {
          result = await client.requestAllItems(
            "GET",
            "/rest/opportunities",
            undefined,
            qs,
          );
        } else {
          qs.limit = args.limit || 20;
          const response = await client.request(
            "GET",
            "/rest/opportunities",
            undefined,
            qs,
          );
          result = response.data || response;
        }
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing opportunities: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "update_opportunity",
    {
      description: "Update an existing opportunity/deal in Twenty CRM",
      inputSchema: {
        id: z.string().describe("The opportunity ID to update"),
        name: z.string().optional().describe("Opportunity name"),
        amount: z.number().optional().describe("Deal amount"),
        closeDate: z
          .string()
          .optional()
          .describe("Expected close date (ISO 8601)"),
        stage: z.string().optional().describe("Sales stage"),
        companyId: z.string().optional().describe("Associated company ID"),
        pointOfContactId: z
          .string()
          .optional()
          .describe("Point of contact person ID"),
      },
    },
    async (args) => {
      try {
        const { id, ...fields } = args;
        const body = cleanObject(fields);
        const result = await client.request(
          "PUT",
          `/rest/opportunities/${id}`,
          body,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error updating opportunity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "delete_opportunity",
    {
      description: "Delete an opportunity/deal from Twenty CRM",
      inputSchema: {
        id: z.string().describe("The opportunity ID to delete"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.request(
          "DELETE",
          `/rest/opportunities/${id}`,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error deleting opportunity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "upsert_opportunity",
    {
      description:
        "Create or update an opportunity/deal in Twenty CRM based on name",
      inputSchema: {
        matchField: z
          .literal("name")
          .describe('Field to match on (only "name" supported)'),
        matchValue: z.string().describe("Value to match against"),
        name: z.string().describe("Opportunity name"),
        amount: z.number().optional().describe("Deal amount"),
        closeDate: z
          .string()
          .optional()
          .describe("Expected close date (ISO 8601)"),
        stage: z.string().optional().describe("Sales stage"),
        companyId: z.string().optional().describe("Associated company ID"),
        pointOfContactId: z
          .string()
          .optional()
          .describe("Point of contact person ID"),
      },
    },
    async (args) => {
      try {
        const { matchField, matchValue, ...fields } = args;
        const existing = await client.findRecordByField(
          "opportunity",
          matchField,
          matchValue,
        );
        const body = cleanObject(fields);

        let result;
        let action: string;
        if (existing) {
          result = await client.request(
            "PUT",
            `/rest/opportunities/${existing.id}`,
            body,
          );
          action = "updated";
        } else {
          result = await client.request("POST", "/rest/opportunities", body);
          action = "created";
        }

        const response = { ...result, _upsertAction: action };
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(response, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error upserting opportunity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
