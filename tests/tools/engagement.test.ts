import { createMockServer, createMockClient, callTool } from "./helpers";
import { registerEngagementTools } from "../../src/tools/engagement";

describe("Engagement Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerEngagementTools(server as any, client as any);
  });

  it("registers all 6 engagement tools", () => {
    const toolNames = Object.keys(server.tools);
    expect(toolNames).toContain("get_messages_by_person");
    expect(toolNames).toContain("get_messages_by_company");
    expect(toolNames).toContain("get_calendar_events_by_person");
    expect(toolNames).toContain("get_calendar_events_by_company");
    expect(toolNames).toContain("get_activities_by_person");
    expect(toolNames).toContain("get_activities_by_company");
  });

  it("gets messages by person via messageParticipants", async () => {
    client.request
      .mockResolvedValueOnce({
        messageParticipants: [{ messageId: "m-1" }, { messageId: "m-2" }],
      })
      .mockResolvedValueOnce({ messages: [{ id: "m-1" }, { id: "m-2" }] });

    await callTool(server, "get_messages_by_person", {
      personId: "p-1",
      returnAll: true,
    });

    expect(client.request).toHaveBeenNthCalledWith(
      1,
      "GET",
      "/rest/messageParticipants",
      undefined,
      expect.objectContaining({ filter: "personId[eq]:p-1", limit: 200, offset: 0 }),
    );
    expect(client.request).toHaveBeenNthCalledWith(
      2,
      "GET",
      "/rest/messages",
      undefined,
      expect.objectContaining({
        filter: expect.stringContaining("id[in]:"),
        limit: 200,
        offset: 0,
      }),
    );
  });

  it("gets messages by company via people then messageParticipants", async () => {
    client.request
      .mockResolvedValueOnce({ people: [{ id: "p-1" }, { id: "p-2" }] })
      .mockResolvedValueOnce({ messageParticipants: [{ messageId: "m-1" }] })
      .mockResolvedValueOnce({ data: [{ id: "m-1" }] });

    await callTool(server, "get_messages_by_company", { companyId: "c-1" });

    expect(client.request).toHaveBeenNthCalledWith(
      1,
      "GET",
      "/rest/people",
      undefined,
      expect.objectContaining({ filter: "companyId[eq]:c-1", limit: 200, offset: 0 }),
    );
    expect(client.request).toHaveBeenNthCalledWith(
      2,
      "GET",
      "/rest/messageParticipants",
      undefined,
      expect.objectContaining({
        filter: expect.stringContaining("personId[in]:"),
        limit: 200,
        offset: 0,
      }),
    );
    expect(client.request).toHaveBeenNthCalledWith(
      3,
      "GET",
      "/rest/messages",
      undefined,
      expect.objectContaining({ filter: expect.stringContaining("id[in]:") }),
    );
  });

  it("gets calendar events by person via calendarEventParticipants", async () => {
    client.request
      .mockResolvedValueOnce({
        calendarEventParticipants: [{ calendarEventId: "e-1" }],
      })
      .mockResolvedValueOnce({ calendarEvents: [{ id: "e-1" }] });

    await callTool(server, "get_calendar_events_by_person", {
      personId: "p-1",
      returnAll: true,
    });

    expect(client.request).toHaveBeenNthCalledWith(
      1,
      "GET",
      "/rest/calendarEventParticipants",
      undefined,
      expect.objectContaining({ filter: "personId[eq]:p-1", limit: 200, offset: 0 }),
    );
    expect(client.request).toHaveBeenNthCalledWith(
      2,
      "GET",
      "/rest/calendarEvents",
      undefined,
      expect.objectContaining({
        filter: expect.stringContaining("id[in]:"),
        limit: 200,
        offset: 0,
      }),
    );
  });

  it("gets calendar events by company via people then calendarEventParticipants", async () => {
    client.request
      .mockResolvedValueOnce({ people: [{ id: "p-1" }] })
      .mockResolvedValueOnce({
        calendarEventParticipants: [{ calendarEventId: "e-1" }],
      })
      .mockResolvedValueOnce({ data: [{ id: "e-1" }] });

    await callTool(server, "get_calendar_events_by_company", {
      companyId: "c-1",
    });

    expect(client.request).toHaveBeenNthCalledWith(
      1,
      "GET",
      "/rest/people",
      undefined,
      expect.objectContaining({ filter: "companyId[eq]:c-1", limit: 200, offset: 0 }),
    );
    expect(client.request).toHaveBeenNthCalledWith(
      2,
      "GET",
      "/rest/calendarEventParticipants",
      undefined,
      expect.objectContaining({ filter: "personId[eq]:p-1", limit: 200, offset: 0 }),
    );
    expect(client.request).toHaveBeenNthCalledWith(
      3,
      "GET",
      "/rest/calendarEvents",
      undefined,
      expect.objectContaining({ filter: expect.stringContaining("id[in]:") }),
    );
  });

  it("gets activities by person from timelineActivities", async () => {
    client.request.mockResolvedValue({ data: [{ id: "a-1" }] });

    await callTool(server, "get_activities_by_person", { personId: "p-1" });

    expect(client.request).toHaveBeenCalledWith(
      "GET",
      "/rest/timelineActivities",
      undefined,
      expect.objectContaining({ targetPerson: "p-1" }),
    );
  });

  it("gets activities by company from timelineActivities", async () => {
    client.request.mockResolvedValue({ data: [{ id: "a-1" }] });

    await callTool(server, "get_activities_by_company", { companyId: "c-1" });

    expect(client.request).toHaveBeenCalledWith(
      "GET",
      "/rest/timelineActivities",
      undefined,
      expect.objectContaining({ targetCompany: "c-1" }),
    );
  });
});
