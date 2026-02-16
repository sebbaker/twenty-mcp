import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TwentyCrmClient } from "../client.js";
import {
  buildFilterQuery,
  cleanObject,
  transformNoteFields,
} from "../transforms.js";

const blockNoteBlockSchema: z.ZodType<{
  type: "heading" | "paragraph";
  children?: Array<{
    type: "heading" | "paragraph";
    children?: Array<unknown>;
  }>;
}> = z
  .object({
    type: z.enum(["heading", "paragraph"]),
    children: z.array(z.lazy(() => blockNoteBlockSchema)).optional(),
  })
  .passthrough();

const blockNoteSchema = z
  .object({
    blocks: z.array(blockNoteBlockSchema),
  })
  .passthrough();

function stringifyBlockNoteInBodyV2(fields: Record<string, unknown>): void {
  if (
    fields.bodyV2 &&
    typeof fields.bodyV2 === "object" &&
    (fields.bodyV2 as Record<string, unknown>).blocknote
  ) {
    const bodyV2 = fields.bodyV2 as Record<string, unknown>;
    bodyV2.blocknote = JSON.stringify(bodyV2.blocknote);
  }
}

export function registerNoteTools(
  server: McpServer,
  client: TwentyCrmClient,
): void {
  server.registerTool(
    "create_note",
    {
      description:
        'Create a new note in Twenty CRM. Note: the "body" field is not supported by the Twenty CRM API.',
      inputSchema: {
        title: z.string().describe("Note title"),
        bodyV2: z
          .object({
            blocknote: blockNoteSchema.optional(),
          })
          .optional(),
        position: z.number().optional().describe("Note position/order"),
      },
    },
    async (args) => {
      try {
        const cleaned = cleanObject(args) as Record<string, unknown>;
        stringifyBlockNoteInBodyV2(cleaned);
        const body = transformNoteFields(cleaned);
        const result = await client.request("POST", "/rest/notes", body);
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
              text: `Error creating note: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_note",
    {
      description: "Get a note by ID from Twenty CRM",
      inputSchema: {
        id: z.string().describe("The note ID"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.request("GET", `/rest/notes/${id}`);
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
              text: `Error getting note: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "list_notes",
    {
      description: "List notes from Twenty CRM with optional filtering",
      inputSchema: {
        search: z.string().optional().describe("Search term"),
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
        const qs = buildFilterQuery(cleanObject({ search: args.search }));
        let result;
        if (args.returnAll) {
          result = await client.requestAllItems(
            "GET",
            "/rest/notes",
            undefined,
            qs,
          );
        } else {
          qs.limit = args.limit || 20;
          const response = await client.request(
            "GET",
            "/rest/notes",
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
              text: `Error listing notes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "update_note",
    {
      description: "Update an existing note in Twenty CRM",
      inputSchema: {
        id: z.string().describe("The note ID to update"),
        title: z.string().optional().describe("Note title"),
        bodyV2: z
          .object({
            blocknote: blockNoteSchema.optional(),
          })
          .optional(),
        position: z.number().optional().describe("Note position/order"),
      },
    },
    async (args) => {
      try {
        const { id, ...fields } = args;
        const cleaned = cleanObject(fields) as Record<string, unknown>;
        stringifyBlockNoteInBodyV2(cleaned);
        const body = transformNoteFields(cleaned);
        const result = await client.request("PUT", `/rest/notes/${id}`, body);
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
              text: `Error updating note: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "delete_note",
    {
      description: "Delete a note from Twenty CRM",
      inputSchema: {
        id: z.string().describe("The note ID to delete"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.request("DELETE", `/rest/notes/${id}`);
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
              text: `Error deleting note: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
