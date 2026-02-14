import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TwentyCrmClient } from "../client.js";

export function registerSearchTools(
  server: McpServer,
  client: TwentyCrmClient,
): void {
  server.registerTool(
    "search",
    {
      description:
        "Search across multiple object types in Twenty CRM (companies, people, opportunities, notes, tasks)",
      inputSchema: {
        query: z.string().describe("Search query string"),
        objectTypes: z
          .array(
            z.enum(["companies", "people", "opportunities", "notes", "tasks"]),
          )
          .optional()
          .describe(
            'Object types to search (defaults to ["people", "companies"])',
          ),
        limit: z
          .number()
          .min(1)
          .max(200)
          .optional()
          .describe("Max results per object type (1-200, default 20)"),
      },
    },
    async (args) => {
      try {
        const objectTypes = args.objectTypes || [
          "people",
          "companies",
          "opportunities",
          "notes",
          "tasks",
        ];
        const limit = args.limit || 20;
        const result = await client.searchRecords(
          args.query,
          objectTypes,
          limit,
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
              text: `Error searching: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
