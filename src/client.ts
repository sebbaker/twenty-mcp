/**
 * Twenty CRM API Client
 */

import type { DataObject, ITwentyCrmCredentials } from "./types.js";
import {
  DEFAULT_RETRY_CONFIG,
  isRetryableError,
  calculateDelay,
  sleep,
  extractRateLimitInfo,
  getErrorContext,
  type IRetryConfig,
} from "./retry.js";
import { getResourceEndpoint } from "./transforms.js";

export class TwentyCrmClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(credentials: ITwentyCrmCredentials) {
    this.baseUrl = credentials.apiUrl.replace(/\/$/, "");
    this.apiKey = credentials.apiKey;
  }

  /**
   * Make an authenticated request to Twenty CRM API
   */
  async request(
    method: string,
    endpoint: string,
    body?: DataObject,
    qs?: DataObject,
  ): Promise<any> {
    let url = `${this.baseUrl}${endpoint}`;

    // Build query string
    if (qs && Object.keys(qs).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(qs)) {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };

    // Add body for POST/PUT/PATCH (not GET/DELETE)
    if (
      body &&
      Object.keys(body).length > 0 &&
      !["GET", "DELETE"].includes(method.toUpperCase())
    ) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const responseText = await response.text();
      const error: any = new Error(
        `Twenty CRM API error (${response.status}): ${responseText}`,
      );
      error.statusCode = response.status;
      error.response = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      };
      throw error;
    }

    const text = await response.text();
    if (!text) return {};
    return JSON.parse(text);
  }

  /**
   * Make an authenticated request with automatic retry on transient errors
   */
  async requestWithRetry(
    method: string,
    endpoint: string,
    body?: DataObject,
    qs?: DataObject,
    retryConfig: Partial<IRetryConfig> = {},
  ): Promise<any> {
    const config: IRetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await this.request(method, endpoint, body, qs);
      } catch (error) {
        lastError = error as Error;

        const shouldRetry =
          isRetryableError(error) && attempt < config.maxRetries;

        if (!shouldRetry) {
          const context = getErrorContext(error, attempt, config.maxRetries);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          throw new Error(`Twenty CRM API error: ${context}${errorMessage}`);
        }

        // Calculate delay (respect rate limit headers if present)
        const rateLimitInfo = extractRateLimitInfo(error);
        const delay =
          rateLimitInfo.retryAfter || calculateDelay(attempt, config);

        await sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Make an authenticated request and return all items (handles pagination)
   */
  async requestAllItems(
    method: string,
    endpoint: string,
    body?: DataObject,
    qs?: DataObject,
  ): Promise<DataObject[]> {
    const returnData: DataObject[] = [];
    const paginatedQs: DataObject = { ...qs };

    paginatedQs.limit = paginatedQs.limit || 200;
    paginatedQs.offset = 0;

    let responseData;

    do {
      responseData = await this.requestWithRetry(
        method,
        endpoint,
        body,
        paginatedQs,
      );

      const data = responseData.data || responseData;
      const items = Array.isArray(data) ? data : [data];

      returnData.push(...items);

      paginatedQs.offset =
        (paginatedQs.offset as number) + (paginatedQs.limit as number);
    } while (
      responseData.data &&
      Array.isArray(responseData.data) &&
      responseData.data.length === paginatedQs.limit
    );

    return returnData;
  }

  /**
   * Search across multiple object types
   */
  async searchRecords(
    query: string,
    objectTypes: string[],
    limit: number = 20,
  ): Promise<DataObject[]> {
    const searchPromises = objectTypes.map(async (objectType) => {
      try {
        const response = await this.requestWithRetry(
          "GET",
          `/rest/${objectType}`,
          undefined,
          { search: query, limit },
        );

        const data = response.data || response;
        const items = Array.isArray(data) ? data : [data];

        return items.map((item: DataObject) => ({
          ...item,
          _objectType: objectType,
        }));
      } catch {
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    return searchResults.flat();
  }

  /**
   * Find record by field value (for upsert operations)
   */
  async findRecordByField(
    resource: string,
    fieldName: string,
    fieldValue: string,
  ): Promise<DataObject | null> {
    const endpoint = getResourceEndpoint(resource);

    try {
      const response = await this.requestWithRetry("GET", endpoint, undefined, {
        filter: JSON.stringify({ [fieldName]: { eq: fieldValue } }),
        limit: 1,
      });

      const data = response.data || response;
      if (Array.isArray(data) && data.length > 0) {
        return data[0] as DataObject;
      }

      return null;
    } catch {
      // If filter doesn't work, try search
      try {
        const response = await this.requestWithRetry(
          "GET",
          endpoint,
          undefined,
          { search: fieldValue, limit: 10 },
        );

        const data = response.data || response;
        if (Array.isArray(data)) {
          const match = data.find((item: DataObject) => {
            const itemValue = item[fieldName];
            if (typeof itemValue === "string") {
              return itemValue.toLowerCase() === fieldValue.toLowerCase();
            }
            return String(itemValue) === fieldValue;
          });
          return (match as DataObject) || null;
        }

        return null;
      } catch {
        return null;
      }
    }
  }

  /**
   * Perform bulk operation (create, update, or delete multiple records)
   */
  async bulkOperation(
    operation: "create" | "update" | "delete",
    resource: string,
    items: DataObject[],
  ): Promise<DataObject[]> {
    const endpoint = getResourceEndpoint(resource);
    const results: DataObject[] = [];

    const concurrencyLimit = 5;
    for (let i = 0; i < items.length; i += concurrencyLimit) {
      const batch = items.slice(i, i + concurrencyLimit);
      const promises = batch.map(async (item) => {
        try {
          let response: DataObject;

          if (operation === "create") {
            response = await this.requestWithRetry("POST", endpoint, item);
          } else if (operation === "update") {
            const id = item.id as string;
            const updateData = { ...item };
            delete updateData.id;
            response = await this.requestWithRetry(
              "PUT",
              `${endpoint}/${id}`,
              updateData,
            );
          } else {
            const id = item.id as string;
            response = await this.requestWithRetry(
              "DELETE",
              `${endpoint}/${id}`,
            );
          }

          return { success: true, data: response };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: errorMessage, item };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    return results;
  }
}
