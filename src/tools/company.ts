import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TwentyCrmClient } from "../client.js";
import {
  transformCompanyFields,
  cleanObject,
  buildFilterQuery,
} from "../transforms.js";

export function registerCompanyTools(
  server: McpServer,
  client: TwentyCrmClient,
): void {
  server.registerTool(
    "create_company",
    {
      description: "Create a new company in Twenty CRM",
      inputSchema: {
        name: z.string().describe("Company name"),
        address: z.string().optional().describe("Company address"),
        annualRecurringRevenue: z
          .number()
          .optional()
          .describe("Annual recurring revenue"),
        domainName: z
          .string()
          .optional()
          .describe("Company domain (e.g., example.com)"),
        employees: z.number().optional().describe("Number of employees"),
        idealCustomerProfile: z
          .boolean()
          .optional()
          .describe("Whether this is an ideal customer profile"),
        industry: z.string().optional().describe("Company industry"),
        linkedinUrl: z
          .string()
          .optional()
          .describe("LinkedIn company page URL"),
        xUrl: z.string().optional().describe("X (Twitter) profile URL"),
        customFields: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Custom fields as key-value pairs"),
      },
    },
    async (args) => {
      try {
        const { customFields, ...fields } = args;
        const body = transformCompanyFields(
          cleanObject({ ...fields, ...customFields }),
        );
        const result = await client.request("POST", "/rest/companies", body);
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
              text: `Error creating company: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_company",
    {
      description: "Get a company by ID from Twenty CRM",
      inputSchema: {
        id: z.string().describe("The company ID"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.request("GET", `/rest/companies/${id}`);
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
              text: `Error getting company: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "list_companies",
    {
      description:
        "List companies from Twenty CRM with optional filtering and pagination",
      inputSchema: {
        search: z.string().optional().describe("Search term for company name"),
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
            "/rest/companies",
            undefined,
            qs,
          );
        } else {
          qs.limit = args.limit || 20;
          const response = await client.request(
            "GET",
            "/rest/companies",
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
              text: `Error listing companies: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "update_company",
    {
      description: "Update an existing company in Twenty CRM",
      inputSchema: {
        id: z.string().describe("The company ID to update"),
        name: z.string().optional().describe("Company name"),
        address: z.string().optional().describe("Company address"),
        annualRecurringRevenue: z
          .number()
          .optional()
          .describe("Annual recurring revenue"),
        domainName: z.string().optional().describe("Company domain"),
        employees: z.number().optional().describe("Number of employees"),
        idealCustomerProfile: z
          .boolean()
          .optional()
          .describe("Whether this is an ideal customer profile"),
        industry: z.string().optional().describe("Company industry"),
        linkedinUrl: z
          .string()
          .optional()
          .describe("LinkedIn company page URL"),
        xUrl: z.string().optional().describe("X (Twitter) profile URL"),
        customFields: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Custom fields as key-value pairs"),
      },
    },
    async (args) => {
      try {
        const { id, customFields, ...fields } = args;
        const body = transformCompanyFields(
          cleanObject({ ...fields, ...customFields }),
        );
        const result = await client.request(
          "PUT",
          `/rest/companies/${id}`,
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
              text: `Error updating company: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "delete_company",
    {
      description: "Delete a company from Twenty CRM",
      inputSchema: {
        id: z.string().describe("The company ID to delete"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.request("DELETE", `/rest/companies/${id}`);
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
              text: `Error deleting company: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "upsert_company",
    {
      description:
        "Create or update a company in Twenty CRM based on a matching field",
      inputSchema: {
        matchField: z
          .enum(["domainName", "name", "linkedinUrl"])
          .describe("Field to match existing records on"),
        matchValue: z.string().describe("Value to match against"),
        name: z.string().describe("Company name"),
        address: z.string().optional().describe("Company address"),
        annualRecurringRevenue: z
          .number()
          .optional()
          .describe("Annual recurring revenue"),
        domainName: z.string().optional().describe("Company domain"),
        employees: z.number().optional().describe("Number of employees"),
        idealCustomerProfile: z
          .boolean()
          .optional()
          .describe("Whether this is an ideal customer profile"),
        industry: z.string().optional().describe("Company industry"),
        linkedinUrl: z
          .string()
          .optional()
          .describe("LinkedIn company page URL"),
        xUrl: z.string().optional().describe("X (Twitter) profile URL"),
        customFields: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Custom fields as key-value pairs"),
      },
    },
    async (args) => {
      try {
        const { matchField, matchValue, customFields, ...fields } = args;
        const existing = await client.findRecordByField(
          "company",
          matchField,
          matchValue,
        );
        const body = transformCompanyFields(
          cleanObject({ ...fields, ...customFields }),
        );

        let result;
        let action: string;
        if (existing) {
          result = await client.request(
            "PUT",
            `/rest/companies/${existing.id}`,
            body,
          );
          action = "updated";
        } else {
          result = await client.request("POST", "/rest/companies", body);
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
              text: `Error upserting company: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
