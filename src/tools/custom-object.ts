import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TwentyCrmClient } from "../client.js";
import type { DataObject } from "../types.js";

export function registerCustomObjectTools(
  server: McpServer,
  client: TwentyCrmClient,
): void {
  server.registerTool(
    "custom_object_create",
    {
      description: "Create a record in a custom object type in Twenty CRM",
      inputSchema: {
        objectApiName: z
          .string()
          .describe(
            'The plural API name of the custom object (e.g., "customLeads")',
          ),
        fields: z.string().describe("JSON object with field names and values"),
      },
    },
    async (args) => {
      try {
        const body: DataObject = JSON.parse(args.fields);
        const result = await client.request(
          "POST",
          `/rest/${args.objectApiName}`,
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
              text: `Error creating custom object: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "custom_object_get",
    {
      description: "Get a record from a custom object type by ID in Twenty CRM",
      inputSchema: {
        objectApiName: z
          .string()
          .describe("The plural API name of the custom object"),
        id: z.string().describe("The record ID"),
        depth: z
          .number()
          .min(0)
          .max(2)
          .optional()
          .describe("Depth of relations to include (0-2, default 1)"),
      },
    },
    async (args) => {
      try {
        const qs = args.depth !== undefined ? { depth: args.depth } : {};
        const result = await client.request(
          "GET",
          `/rest/${args.objectApiName}/${args.id}`,
          undefined,
          qs,
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
              text: `Error getting custom object: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "custom_object_list",
    {
      description: "List records from a custom object type in Twenty CRM",
      inputSchema: {
        objectApiName: z
          .string()
          .describe("The plural API name of the custom object"),
        filters: z
          .string()
          .optional()
          .describe("JSON filter object using Twenty CRM filter syntax"),
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
        depth: z
          .number()
          .min(0)
          .max(2)
          .optional()
          .describe("Depth of relations to include (0-2, default 1)"),
      },
    },
    async (args) => {
      try {
        const qs: DataObject = {};
        if (args.filters) {
          qs.filter = args.filters;
        }
        if (args.depth !== undefined) {
          qs.depth = args.depth;
        }

        const endpoint = `/rest/${args.objectApiName}`;
        let result;
        if (args.returnAll) {
          result = await client.requestAllItems("GET", endpoint, undefined, qs);
        } else {
          qs.limit = args.limit || 20;
          const response = await client.request("GET", endpoint, undefined, qs);
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
              text: `Error listing custom objects: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "custom_object_update",
    {
      description: "Update a record in a custom object type in Twenty CRM",
      inputSchema: {
        objectApiName: z
          .string()
          .describe("The plural API name of the custom object"),
        id: z.string().describe("The record ID to update"),
        fields: z
          .string()
          .describe("JSON object with field names and values to update"),
      },
    },
    async (args) => {
      try {
        const body: DataObject = JSON.parse(args.fields);
        const result = await client.request(
          "PUT",
          `/rest/${args.objectApiName}/${args.id}`,
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
              text: `Error updating custom object: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "custom_object_delete",
    {
      description: "Delete a record from a custom object type in Twenty CRM",
      inputSchema: {
        objectApiName: z
          .string()
          .describe("The plural API name of the custom object"),
        id: z.string().describe("The record ID to delete"),
      },
    },
    async (args) => {
      try {
        const result = await client.request(
          "DELETE",
          `/rest/${args.objectApiName}/${args.id}`,
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
              text: `Error deleting custom object: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
