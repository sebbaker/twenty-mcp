#!/usr/bin/env node

import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { TwentyCrmClient } from "./client.js";

import { registerActivityTools } from "./tools/activity.js";
import { registerBulkTools } from "./tools/bulk.js";
import { registerCompanyTools } from "./tools/company.js";
import { registerCustomObjectTools } from "./tools/custom-object.js";
import { registerNoteTools } from "./tools/note.js";
import { registerOpportunityTools } from "./tools/opportunity.js";
import { registerPersonTools } from "./tools/person.js";
import { registerSearchTools } from "./tools/search.js";
import { registerTaskTools } from "./tools/task.js";

const host = "0.0.0.0";
const port = 3000;

function createServer(client: TwentyCrmClient): McpServer {
  const server = new McpServer({
    name: "twenty-crm",
    version: "1.0.0",
  });

  registerCompanyTools(server, client);
  registerPersonTools(server, client);
  registerOpportunityTools(server, client);
  registerNoteTools(server, client);
  registerTaskTools(server, client);
  registerActivityTools(server, client);
  registerBulkTools(server, client);
  registerSearchTools(server, client);
  registerCustomObjectTools(server, client);

  return server;
}

function getRequestApiKey(req: Request): string | undefined {
  const rawApiKey = req.query.apiKey;
  if (typeof rawApiKey === "string" && rawApiKey.trim().length > 0) {
    return rawApiKey.trim();
  }

  if (Array.isArray(rawApiKey) && rawApiKey.length > 0) {
    const first = rawApiKey[0];
    if (typeof first === "string" && first.trim().length > 0) {
      return first.trim();
    }
  }

  return undefined;
}

function getRequestApiUrl(req: Request): string | undefined {
  const rawApiUrl = req.query.apiUrl;
  if (typeof rawApiUrl === "string" && rawApiUrl.trim().length > 0) {
    return rawApiUrl.trim();
  }

  if (Array.isArray(rawApiUrl) && rawApiUrl.length > 0) {
    const first = rawApiUrl[0];
    if (typeof first === "string" && first.trim().length > 0) {
      return first.trim();
    }
  }

  return undefined;
}

async function main() {
  const app = createMcpExpressApp({ host });
  app.post("/mcp", async (req: Request, res: Response) => {
    const requestApiUrl = getRequestApiUrl(req);
    const requestApiKey = getRequestApiKey(req);
    if (!requestApiUrl) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32002,
          message:
            "Missing Twenty API URL. Provide it as the `apiUrl` query parameter, for example: /mcp?apiUrl=https%3A%2F%2Fyour-twenty-instance.com&apiKey=YOUR_KEY",
        },
        id: null,
      });
      return;
    }

    if (!requestApiKey) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message:
            "Missing Twenty API key. Provide it as the `apiKey` query parameter, for example: /mcp?apiUrl=https%3A%2F%2Fyour-twenty-instance.com&apiKey=YOUR_KEY",
        },
        id: null,
      });
      return;
    }

    const client = new TwentyCrmClient({
      apiUrl: requestApiUrl,
      apiKey: requestApiKey,
    });
    const server = createServer(client);

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", async (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    });
  });

  app.delete("/mcp", async (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    });
  });

  const httpServer = app.listen(port, host, () => {
    console.error(
      `Twenty CRM MCP Server listening at http://${host}:${port}/mcp (streamable-http)`,
    );
  });

  httpServer.on("error", (error: Error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
