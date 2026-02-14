import { createMockServer, createMockClient, callTool } from './helpers';
import { registerTaskTools } from '../../src/tools/task';

describe('Task Tools', () => {
	let server: ReturnType<typeof createMockServer>;
	let client: ReturnType<typeof createMockClient>;

	beforeEach(() => {
		server = createMockServer();
		client = createMockClient();
		registerTaskTools(server as any, client as any);
	});

	it('registers all 5 task tools (no upsert)', () => {
		const toolNames = Object.keys(server.tools);
		expect(toolNames).toContain('create_task');
		expect(toolNames).toContain('get_task');
		expect(toolNames).toContain('list_tasks');
		expect(toolNames).toContain('update_task');
		expect(toolNames).toContain('delete_task');
	});

	describe('create_task', () => {
		it('calls POST /rest/tasks', async () => {
			client.request.mockResolvedValue({ data: { id: '123' } });

			await callTool(server, 'create_task', { title: 'Do thing', status: 'TODO', body: 'Details' });

			expect(client.request).toHaveBeenCalledWith('POST', '/rest/tasks', expect.objectContaining({
				title: 'Do thing',
				status: 'TODO',
				body: 'Details',
			}));
		});
	});

	describe('list_tasks', () => {
		it('passes assigneeId and status filters', async () => {
			client.request.mockResolvedValue({ data: [] });

			await callTool(server, 'list_tasks', { assigneeId: 'p-1', status: 'IN_PROGRESS' });

			expect(client.request).toHaveBeenCalledWith('GET', '/rest/tasks', undefined, expect.objectContaining({
				assigneeId: 'p-1',
				status: 'IN_PROGRESS',
			}));
		});
	});
});
