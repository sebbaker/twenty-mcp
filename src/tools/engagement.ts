import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TwentyCrmClient } from "../client.js";
import type { DataObject } from "../types.js";

type ListArgs = {
  limit?: number;
  returnAll?: boolean;
};

function eqFilter(field: string, value: string): DataObject {
  return { filter: `${field}[eq]:${value}` };
}

async function listAllNested(
  client: TwentyCrmClient,
  endpoint: string,
  nestedKey: string,
  baseQs: DataObject,
): Promise<DataObject[]> {
  const limit = 200;
  let offset = 0;
  const all: DataObject[] = [];

  while (true) {
    const response = await client.request("GET", endpoint, undefined, {
      ...baseQs,
      limit,
      offset,
    });
    const items = extractItems(response, nestedKey);
    all.push(...items);

    if (items.length < limit) {
      break;
    }
    offset += limit;
  }

  return all;
}

function extractItems(response: unknown, nestedKey: string): DataObject[] {
  if (!response || typeof response !== "object") {
    return [];
  }

  const root = response as { data?: unknown };
  const data = root.data ?? response;

  if (Array.isArray(data)) {
    return data as DataObject[];
  }

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as Record<string, unknown>)[nestedKey])
  ) {
    return (data as Record<string, unknown>)[nestedKey] as DataObject[];
  }

  return [];
}

function uniqueIds(items: DataObject[], idField: string): string[] {
  const ids = items
    .map((item) => item[idField])
    .filter((value): value is string => typeof value === "string");

  return Array.from(new Set(ids));
}

async function listByIds(
  client: TwentyCrmClient,
  endpoint: string,
  nestedKey: string,
  ids: string[],
  args: ListArgs,
): Promise<DataObject[]> {
  if (ids.length === 0) {
    return [];
  }

  const qs: DataObject = {
    filter: `id[in]:${JSON.stringify(ids)}`,
  };

  if (args.returnAll) {
    return listAllNested(client, endpoint, nestedKey, qs);
  }

  qs.limit = args.limit || 20;
  const response = await client.request("GET", endpoint, undefined, qs);
  return extractItems(response, nestedKey);
}

async function getPeopleIdsByCompany(
  client: TwentyCrmClient,
  companyId: string,
): Promise<string[]> {
  const people = await listAllNested(
    client,
    "/rest/people",
    "people",
    eqFilter("companyId", companyId),
  );
  return uniqueIds(people, "id");
}

async function listParticipantRowsByPersonIds(
  client: TwentyCrmClient,
  endpoint: string,
  nestedKey: string,
  personIds: string[],
): Promise<DataObject[]> {
  if (personIds.length === 0) {
    return [];
  }

  const qs =
    personIds.length === 1
      ? eqFilter("personId", personIds[0])
      : ({ filter: `personId[in]:${JSON.stringify(personIds)}` } as DataObject);

  return listAllNested(client, endpoint, nestedKey, qs);
}

export function registerEngagementTools(
  server: McpServer,
  client: TwentyCrmClient,
): void {
  server.registerTool(
    "get_messages_by_person",
    {
      description: "Get messages associated with a person in Twenty CRM",
      inputSchema: {
        personId: z.string().describe("The person ID"),
        limit: z
          .number()
          .min(1)
          .max(200)
          .optional()
          .describe("Max number of messages to return (1-200, default 20)"),
        returnAll: z
          .boolean()
          .optional()
          .describe("Return all matching messages with automatic pagination"),
      },
    },
    async (args) => {
      try {
        const participants = await listAllNested(
          client,
          "/rest/messageParticipants",
          "messageParticipants",
          eqFilter("personId", args.personId),
        );
        const messageIds = uniqueIds(participants, "messageId");
        const result = await listByIds(
          client,
          "/rest/messages",
          "messages",
          messageIds,
          args,
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
              text: `Error getting messages by person: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_messages_by_company",
    {
      description: "Get messages associated with a company in Twenty CRM",
      inputSchema: {
        companyId: z.string().describe("The company ID"),
        limit: z
          .number()
          .min(1)
          .max(200)
          .optional()
          .describe("Max number of messages to return (1-200, default 20)"),
        returnAll: z
          .boolean()
          .optional()
          .describe("Return all matching messages with automatic pagination"),
      },
    },
    async (args) => {
      try {
        const personIds = await getPeopleIdsByCompany(client, args.companyId);
        const participants = await listParticipantRowsByPersonIds(
          client,
          "/rest/messageParticipants",
          "messageParticipants",
          personIds,
        );
        const messageIds = uniqueIds(participants, "messageId");
        const result = await listByIds(
          client,
          "/rest/messages",
          "messages",
          messageIds,
          args,
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
              text: `Error getting messages by company: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_calendar_events_by_person",
    {
      description: "Get calendar events associated with a person in Twenty CRM",
      inputSchema: {
        personId: z.string().describe("The person ID"),
        limit: z
          .number()
          .min(1)
          .max(200)
          .optional()
          .describe(
            "Max number of calendar events to return (1-200, default 20)",
          ),
        returnAll: z
          .boolean()
          .optional()
          .describe(
            "Return all matching calendar events with automatic pagination",
          ),
      },
    },
    async (args) => {
      try {
        const participants = await listAllNested(
          client,
          "/rest/calendarEventParticipants",
          "calendarEventParticipants",
          eqFilter("personId", args.personId),
        );
        const calendarEventIds = uniqueIds(participants, "calendarEventId");
        const result = await listByIds(
          client,
          "/rest/calendarEvents",
          "calendarEvents",
          calendarEventIds,
          args,
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
              text: `Error getting calendar events by person: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_calendar_events_by_company",
    {
      description: "Get calendar events associated with a company in Twenty CRM",
      inputSchema: {
        companyId: z.string().describe("The company ID"),
        limit: z
          .number()
          .min(1)
          .max(200)
          .optional()
          .describe(
            "Max number of calendar events to return (1-200, default 20)",
          ),
        returnAll: z
          .boolean()
          .optional()
          .describe(
            "Return all matching calendar events with automatic pagination",
          ),
      },
    },
    async (args) => {
      try {
        const personIds = await getPeopleIdsByCompany(client, args.companyId);
        const participants = await listParticipantRowsByPersonIds(
          client,
          "/rest/calendarEventParticipants",
          "calendarEventParticipants",
          personIds,
        );
        const calendarEventIds = uniqueIds(participants, "calendarEventId");
        const result = await listByIds(
          client,
          "/rest/calendarEvents",
          "calendarEvents",
          calendarEventIds,
          args,
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
              text: `Error getting calendar events by company: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_activities_by_person",
    {
      description: "Get timeline activities associated with a person",
      inputSchema: {
        personId: z.string().describe("The person ID"),
        limit: z
          .number()
          .min(1)
          .max(200)
          .optional()
          .describe("Max number of activities to return (1-200, default 20)"),
        returnAll: z
          .boolean()
          .optional()
          .describe("Return all matching activities with automatic pagination"),
      },
    },
    async (args) => {
      try {
        const qs: DataObject = { targetPerson: args.personId };
        let result: DataObject[];
        if (args.returnAll) {
          result = await client.requestAllItems(
            "GET",
            "/rest/timelineActivities",
            undefined,
            qs,
          );
        } else {
          qs.limit = args.limit || 20;
          const response = await client.request(
            "GET",
            "/rest/timelineActivities",
            undefined,
            qs,
          );
          result = extractItems(response, "timelineActivities");
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
              text: `Error getting activities by person: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_activities_by_company",
    {
      description: "Get timeline activities associated with a company",
      inputSchema: {
        companyId: z.string().describe("The company ID"),
        limit: z
          .number()
          .min(1)
          .max(200)
          .optional()
          .describe("Max number of activities to return (1-200, default 20)"),
        returnAll: z
          .boolean()
          .optional()
          .describe("Return all matching activities with automatic pagination"),
      },
    },
    async (args) => {
      try {
        const qs: DataObject = { targetCompany: args.companyId };
        let result: DataObject[];
        if (args.returnAll) {
          result = await client.requestAllItems(
            "GET",
            "/rest/timelineActivities",
            undefined,
            qs,
          );
        } else {
          qs.limit = args.limit || 20;
          const response = await client.request(
            "GET",
            "/rest/timelineActivities",
            undefined,
            qs,
          );
          result = extractItems(response, "timelineActivities");
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
              text: `Error getting activities by company: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
