/**
 * Test helpers for tool tests.
 * Creates a mock McpServer that captures registered tools and their callbacks.
 */

type ToolCallback = (...args: any[]) => Promise<any>;

export interface RegisteredMockTool {
	name: string;
	config: { description?: string; inputSchema?: any };
	callback: ToolCallback;
}

export function createMockServer() {
	const tools: Record<string, RegisteredMockTool> = {};

	return {
		tools,
		registerTool(name: string, config: any, callback: ToolCallback) {
			(tools as any)[name] = { name, config, callback };
		},
	};
}

export function createMockClient() {
	return {
		request: jest.fn(),
		requestWithRetry: jest.fn(),
		requestAllItems: jest.fn(),
		searchRecords: jest.fn(),
		findRecordByField: jest.fn(),
		bulkOperation: jest.fn(),
	};
}

export async function callTool(
	server: ReturnType<typeof createMockServer>,
	toolName: string,
	args: any,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
	const tool = (server.tools as any)[toolName];
	if (!tool) {
		throw new Error(`Tool "${toolName}" not registered`);
	}
	return tool.callback(args, {});
}
