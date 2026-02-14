import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TwentyCrmClient } from "../client.js";
import { buildFilterQuery, cleanObject } from "../transforms.js";

export function registerActivityTools(
  server: McpServer,
  client: TwentyCrmClient,
): void {
  server.registerTool(
    "create_activity",
    {
      description: "Create a new activity in Twenty CRM",
      inputSchema: {
        title: z.string().describe("Activity title"),
        type: z
          .enum(["Call", "Email", "Meeting", "Note", "Task"])
          .describe("Activity type"),
        body: z.string().optional().describe("Activity description"),
        dueAt: z.string().optional().describe("Due date (ISO 8601)"),
        completedAt: z
          .string()
          .optional()
          .describe("Completion date (ISO 8601)"),
        reminderAt: z.string().optional().describe("Reminder date (ISO 8601)"),
        companyId: z.string().optional().describe("Associated company ID"),
        personId: z.string().optional().describe("Associated person ID"),
      },
    },
    async (args) => {
      try {
        const body = cleanObject(args);
        const result = await client.request("POST", "/rest/activities", body);
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
              text: `Error creating activity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_activity",
    {
      description: "Get an activity by ID from Twenty CRM",
      inputSchema: {
        id: z.string().describe("The activity ID"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.request("GET", `/rest/activities/${id}`);
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
              text: `Error getting activity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "list_activities",
    {
      description: "List activities from Twenty CRM with optional filtering",
      inputSchema: {
        type: z
          .enum(["Call", "Email", "Meeting", "Note", "Task"])
          .optional()
          .describe("Filter by activity type"),
        companyId: z.string().optional().describe("Filter by company ID"),
        personId: z.string().optional().describe("Filter by person ID"),
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
          cleanObject({
            type: args.type,
            companyId: args.companyId,
            personId: args.personId,
          }),
        );
        let result;
        if (args.returnAll) {
          result = await client.requestAllItems(
            "GET",
            "/rest/activities",
            undefined,
            qs,
          );
        } else {
          qs.limit = args.limit || 20;
          const response = await client.request(
            "GET",
            "/rest/activities",
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
              text: `Error listing activities: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "update_activity",
    {
      description: "Update an existing activity in Twenty CRM",
      inputSchema: {
        id: z.string().describe("The activity ID to update"),
        title: z.string().optional().describe("Activity title"),
        type: z
          .enum(["Call", "Email", "Meeting", "Note", "Task"])
          .optional()
          .describe("Activity type"),
        body: z.string().optional().describe("Activity description"),
        dueAt: z.string().optional().describe("Due date (ISO 8601)"),
        completedAt: z
          .string()
          .optional()
          .describe("Completion date (ISO 8601)"),
        reminderAt: z.string().optional().describe("Reminder date (ISO 8601)"),
        companyId: z.string().optional().describe("Associated company ID"),
        personId: z.string().optional().describe("Associated person ID"),
      },
    },
    async (args) => {
      try {
        const { id, ...fields } = args;
        const body = cleanObject(fields);
        const result = await client.request(
          "PUT",
          `/rest/activities/${id}`,
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
              text: `Error updating activity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "delete_activity",
    {
      description: "Delete an activity from Twenty CRM",
      inputSchema: {
        id: z.string().describe("The activity ID to delete"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.request("DELETE", `/rest/activities/${id}`);
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
              text: `Error deleting activity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
