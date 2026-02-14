import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TwentyCrmClient } from "../client.js";
import {
  buildFilterQuery,
  cleanObject,
  transformPersonFields,
} from "../transforms.js";

export function registerPersonTools(
  server: McpServer,
  client: TwentyCrmClient,
): void {
  server.registerTool(
    "create_person",
    {
      description: "Create a new person/contact in Twenty CRM",
      inputSchema: {
        firstName: z.string().describe("First name"),
        lastName: z.string().describe("Last name"),
        email: z.string().optional().describe("Email address"),
        phone: z.string().optional().describe("Phone number"),
        city: z.string().optional().describe("City"),
        jobTitle: z.string().optional().describe("Job title"),
        linkedinUrl: z.string().optional().describe("LinkedIn profile URL"),
        xUrl: z.string().optional().describe("X (Twitter) profile URL"),
        avatarUrl: z.string().optional().describe("Avatar URL"),
        companyId: z.string().optional().describe("Associated company ID"),
      },
    },
    async (args) => {
      try {
        const body = transformPersonFields(cleanObject(args));
        const result = await client.request("POST", "/rest/people", body);
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
              text: `Error creating person: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_person",
    {
      description: "Get a person/contact by ID from Twenty CRM",
      inputSchema: {
        id: z.string().describe("The person ID"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.request("GET", `/rest/people/${id}`);
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
              text: `Error getting person: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "list_people",
    {
      description:
        "List people/contacts from Twenty CRM with optional filtering",
      inputSchema: {
        companyId: z.string().optional().describe("Filter by company ID"),
        search: z.string().optional().describe("Search term for name or email"),
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
          cleanObject({ companyId: args.companyId, search: args.search }),
        );
        let result;
        if (args.returnAll) {
          result = await client.requestAllItems(
            "GET",
            "/rest/people",
            undefined,
            qs,
          );
        } else {
          qs.limit = args.limit || 20;
          const response = await client.request(
            "GET",
            "/rest/people",
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
              text: `Error listing people: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "update_person",
    {
      description: "Update an existing person/contact in Twenty CRM",
      inputSchema: {
        id: z.string().describe("The person ID to update"),
        firstName: z.string().optional().describe("First name"),
        lastName: z.string().optional().describe("Last name"),
        email: z.string().optional().describe("Email address"),
        phone: z.string().optional().describe("Phone number"),
        city: z.string().optional().describe("City"),
        jobTitle: z.string().optional().describe("Job title"),
        linkedinUrl: z.string().optional().describe("LinkedIn profile URL"),
        xUrl: z.string().optional().describe("X (Twitter) profile URL"),
        avatarUrl: z.string().optional().describe("Avatar URL"),
        companyId: z.string().optional().describe("Associated company ID"),
      },
    },
    async (args) => {
      try {
        const { id, ...fields } = args;
        const body = transformPersonFields(cleanObject(fields));
        const result = await client.request("PUT", `/rest/people/${id}`, body);
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
              text: `Error updating person: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "delete_person",
    {
      description: "Delete a person/contact from Twenty CRM",
      inputSchema: {
        id: z.string().describe("The person ID to delete"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.request("DELETE", `/rest/people/${id}`);
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
              text: `Error deleting person: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "upsert_person",
    {
      description:
        "Create or update a person/contact in Twenty CRM based on a matching field",
      inputSchema: {
        matchField: z
          .enum(["email", "linkedinUrl", "phone"])
          .describe("Field to match existing records on"),
        matchValue: z.string().describe("Value to match against"),
        firstName: z.string().describe("First name"),
        lastName: z.string().describe("Last name"),
        email: z.string().optional().describe("Email address"),
        phone: z.string().optional().describe("Phone number"),
        city: z.string().optional().describe("City"),
        jobTitle: z.string().optional().describe("Job title"),
        linkedinUrl: z.string().optional().describe("LinkedIn profile URL"),
        xUrl: z.string().optional().describe("X (Twitter) profile URL"),
        avatarUrl: z.string().optional().describe("Avatar URL"),
        companyId: z.string().optional().describe("Associated company ID"),
      },
    },
    async (args) => {
      try {
        const { matchField, matchValue, ...fields } = args;
        const existing = await client.findRecordByField(
          "person",
          matchField,
          matchValue,
        );
        const body = transformPersonFields(cleanObject(fields));

        let result;
        let action: string;
        if (existing) {
          result = await client.request(
            "PUT",
            `/rest/people/${existing.id}`,
            body,
          );
          action = "updated";
        } else {
          result = await client.request("POST", "/rest/people", body);
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
              text: `Error upserting person: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
