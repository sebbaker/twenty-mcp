# twenty-crm-mcp

MCP server for [Twenty CRM](https://twenty.com), exposing tools for companies, people, opportunities, notes, tasks, activities, search, bulk operations, and custom objects.

## Transport

This server runs on **streamable-http** (remote MCP) and serves a single endpoint:

- `POST /mcp?apiUrl=YOUR_TWENTY_API_URL&apiKey=YOUR_TWENTY_API_KEY` for JSON-RPC requests
- `GET /mcp` and `DELETE /mcp` return `405 Method not allowed`

## Requirements

- Node.js `>=18.18`
- A Twenty CRM API URL
- A Twenty CRM API key

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Run

```bash
npm start
```

Server URL:

- `http://127.0.0.1:3000/mcp?apiUrl=YOUR_TWENTY_API_URL&apiKey=YOUR_TWENTY_API_KEY`
- Example:
  `http://127.0.0.1:3000/mcp?apiUrl=https%3A%2F%2Fyour-twenty-instance.com&apiKey=YOUR_TWENTY_API_KEY`

## Docker

Build and run with Docker Compose:

```bash
docker compose up --build -d
```

Stop:

```bash
docker compose down
```

The MCP endpoint is available at:

- `http://127.0.0.1:3000/mcp?apiUrl=YOUR_TWENTY_API_URL&apiKey=YOUR_TWENTY_API_KEY`

## Codex Desktop Setup (Verified Working)

Verified on **February 14, 2026** with Codex Desktop using this repo and endpoint.

1. Start the server locally (`npm start`) or with Docker (`docker compose up --build -d`).
2. Add the MCP server in Codex config:

```toml
[mcp_servers.twenty_crm]
url = "http://127.0.0.1:3000/mcp?apiUrl=https%3A%2F%2Fyour-twenty-instance.com&apiKey=YOUR_TWENTY_API_KEY"
```

3. Restart Codex Desktop.
4. Open a new chat and call a tool (for example, `list_opportunities`) to confirm it is connected.

## Troubleshooting

If you run into any problems, please raise an issue:

- https://github.com/sebbaker/twenty-mcp-maybe/issues

## Development

```bash
npm run dev
```

## Tests

Run all tests:

```bash
npm test
```

Coverage:

```bash
npm run test:coverage
```

### Integration Test (uses current shell environment)

The suite includes `tests/integration/core-models.integration.test.ts`.

It uses `TWENTY_API_URL` and `TWENTY_API_KEY` from your current shell environment and verifies the API can fetch at least one record for each core resource:

- companies
- people
- opportunities

If those env vars are missing, the integration suite is skipped.

## Exposed Tool Groups

- Company: create/get/list/update/delete/upsert
- Person: create/get/list/update/delete/upsert
- Opportunity: create/get/list/update/delete/upsert
- Note: create/get/list/update/delete
- Task: create/get/list/update/delete
- Activity: create/get/list/update/delete
- Bulk: create/update/delete
- Search: cross-object search
- Custom Object: create/get/list/update/delete

## License

MIT
