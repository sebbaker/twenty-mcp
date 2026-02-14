import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TwentyCrmClient } from "../client.js";
import type { DataObject } from "../types.js";

const resourceTypeEnum = z.enum([
  "company",
  "person",
  "opportunity",
  "note",
  "task",
  "activity",
]);

export function registerBulkTools(
  server: McpServer,
  client: TwentyCrmClient,
): void {
  server.registerTool(
    "bulk_create",
    {
      description:
        "Create multiple records at once in Twenty CRM. Processes up to 5 items concurrently.",
      inputSchema: {
        resourceType: resourceTypeEnum.describe(
          "The type of resource to create",
        ),
        items: z
          .string()
          .describe(
            'JSON array of objects to create, e.g., [{"name": "Company 1"}, {"name": "Company 2"}]',
          ),
      },
    },
    async (args) => {
      try {
        const items: DataObject[] = JSON.parse(args.items);
        if (!Array.isArray(items)) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: items must be a JSON array",
              },
            ],
            isError: true,
          };
        }
        const result = await client.bulkOperation(
          "create",
          args.resourceType,
          items,
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
              text: `Error in bulk create: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "bulk_update",
    {
      description:
        'Update multiple records at once in Twenty CRM. Each item must include an "id" field.',
      inputSchema: {
        resourceType: resourceTypeEnum.describe(
          "The type of resource to update",
        ),
        items: z
          .string()
          .describe(
            'JSON array of objects to update, each must have "id", e.g., [{"id": "abc", "name": "Updated"}]',
          ),
      },
    },
    async (args) => {
      try {
        const items: DataObject[] = JSON.parse(args.items);
        if (!Array.isArray(items)) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: items must be a JSON array",
              },
            ],
            isError: true,
          };
        }
        const missingIds = items.filter((item) => !item.id);
        if (missingIds.length > 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: 'Error: all items must have an "id" field',
              },
            ],
            isError: true,
          };
        }
        const result = await client.bulkOperation(
          "update",
          args.resourceType,
          items,
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
              text: `Error in bulk update: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "bulk_delete",
    {
      description: "Delete multiple records at once in Twenty CRM.",
      inputSchema: {
        resourceType: resourceTypeEnum.describe(
          "The type of resource to delete",
        ),
        ids: z.array(z.string()).describe("Array of record IDs to delete"),
      },
    },
    async (args) => {
      try {
        const items: DataObject[] = args.ids.map((id) => ({ id }));
        const result = await client.bulkOperation(
          "delete",
          args.resourceType,
          items,
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
              text: `Error in bulk delete: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
