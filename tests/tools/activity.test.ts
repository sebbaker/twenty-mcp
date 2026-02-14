import { createMockServer, createMockClient, callTool } from './helpers';
import { registerActivityTools } from '../../src/tools/activity';

describe('Activity Tools', () => {
	let server: ReturnType<typeof createMockServer>;
	let client: ReturnType<typeof createMockClient>;

	beforeEach(() => {
		server = createMockServer();
		client = createMockClient();
		registerActivityTools(server as any, client as any);
	});

	it('registers all 5 activity tools (no upsert)', () => {
		const toolNames = Object.keys(server.tools);
		expect(toolNames).toContain('create_activity');
		expect(toolNames).toContain('get_activity');
		expect(toolNames).toContain('list_activities');
		expect(toolNames).toContain('update_activity');
		expect(toolNames).toContain('delete_activity');
	});

	describe('create_activity', () => {
		it('calls POST /rest/activities', async () => {
			client.request.mockResolvedValue({ data: { id: '123' } });

			await callTool(server, 'create_activity', { title: 'Call John', type: 'Call', companyId: 'c-1' });

			expect(client.request).toHaveBeenCalledWith('POST', '/rest/activities', expect.objectContaining({
				title: 'Call John',
				type: 'Call',
				companyId: 'c-1',
			}));
		});
	});

	describe('list_activities', () => {
		it('passes type, companyId, and personId filters', async () => {
			client.request.mockResolvedValue({ data: [] });

			await callTool(server, 'list_activities', { type: 'Email', companyId: 'c-1', personId: 'p-1' });

			expect(client.request).toHaveBeenCalledWith('GET', '/rest/activities', undefined, expect.objectContaining({
				type: 'Email',
				companyId: 'c-1',
				personId: 'p-1',
			}));
		});
	});
});
