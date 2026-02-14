import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TwentyCrmClient } from "../client.js";
import { buildFilterQuery, cleanObject } from "../transforms.js";

export function registerTaskTools(
  server: McpServer,
  client: TwentyCrmClient,
): void {
  server.registerTool(
    "create_task",
    {
      description: "Create a new task in Twenty CRM",
      inputSchema: {
        title: z.string().describe("Task title"),
        body: z.string().optional().describe("Task description"),
        status: z
          .enum(["TODO", "IN_PROGRESS", "DONE"])
          .optional()
          .describe("Task status"),
        dueAt: z.string().optional().describe("Due date (ISO 8601)"),
        assigneeId: z.string().optional().describe("Assignee person ID"),
        position: z.number().optional().describe("Task position/order"),
      },
    },
    async (args) => {
      try {
        const body = cleanObject(args);
        const result = await client.request("POST", "/rest/tasks", body);
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
              text: `Error creating task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_task",
    {
      description: "Get a task by ID from Twenty CRM",
      inputSchema: {
        id: z.string().describe("The task ID"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.request("GET", `/rest/tasks/${id}`);
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
              text: `Error getting task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "list_tasks",
    {
      description: "List tasks from Twenty CRM with optional filtering",
      inputSchema: {
        assigneeId: z.string().optional().describe("Filter by assignee ID"),
        status: z
          .enum(["TODO", "IN_PROGRESS", "DONE"])
          .optional()
          .describe("Filter by status"),
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
          cleanObject({ assigneeId: args.assigneeId, status: args.status }),
        );
        let result;
        if (args.returnAll) {
          result = await client.requestAllItems(
            "GET",
            "/rest/tasks",
            undefined,
            qs,
          );
        } else {
          qs.limit = args.limit || 20;
          const response = await client.request(
            "GET",
            "/rest/tasks",
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
              text: `Error listing tasks: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "update_task",
    {
      description: "Update an existing task in Twenty CRM",
      inputSchema: {
        id: z.string().describe("The task ID to update"),
        title: z.string().optional().describe("Task title"),
        body: z.string().optional().describe("Task description"),
        status: z
          .enum(["TODO", "IN_PROGRESS", "DONE"])
          .optional()
          .describe("Task status"),
        dueAt: z.string().optional().describe("Due date (ISO 8601)"),
        assigneeId: z.string().optional().describe("Assignee person ID"),
        position: z.number().optional().describe("Task position/order"),
      },
    },
    async (args) => {
      try {
        const { id, ...fields } = args;
        const body = cleanObject(fields);
        const result = await client.request("PUT", `/rest/tasks/${id}`, body);
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
              text: `Error updating task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "delete_task",
    {
      description: "Delete a task from Twenty CRM",
      inputSchema: {
        id: z.string().describe("The task ID to delete"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.request("DELETE", `/rest/tasks/${id}`);
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
              text: `Error deleting task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
