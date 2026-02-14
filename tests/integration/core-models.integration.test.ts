import { TwentyCrmClient } from "../../src/client";

const apiUrl = process.env.TWENTY_API_URL;
const apiKey = process.env.TWENTY_API_KEY || process.env.TOTWENTY_API_KEYKEN;
const hasApiCredentials = Boolean(apiUrl) && Boolean(apiKey);

const describeIfConfigured = hasApiCredentials ? describe : describe.skip;

describeIfConfigured("Twenty API integration: core models", () => {
  const coreResources = [
    { name: "companies", endpoint: "/rest/companies" },
    { name: "people", endpoint: "/rest/people" },
    { name: "opportunities", endpoint: "/rest/opportunities" },
  ] as const;

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  it("fetches at least one record for each core resource", async () => {
    const client = new TwentyCrmClient({
      apiUrl: apiUrl as string,
      apiKey: apiKey as string,
    });

    for (const resource of coreResources) {
      const response = await client.request(
        "GET",
        resource.endpoint,
        undefined,
        { limit: 10 },
      );

      const data = response?.data ?? response;
      const items = Array.isArray(data) ? data : data ? [data] : [];

      expect(items.length).toBeGreaterThan(0);
    }
  });
});
