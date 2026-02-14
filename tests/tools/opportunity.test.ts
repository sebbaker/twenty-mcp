import { createMockServer, createMockClient, callTool } from './helpers';
import { registerOpportunityTools } from '../../src/tools/opportunity';

describe('Opportunity Tools', () => {
	let server: ReturnType<typeof createMockServer>;
	let client: ReturnType<typeof createMockClient>;

	beforeEach(() => {
		server = createMockServer();
		client = createMockClient();
		registerOpportunityTools(server as any, client as any);
	});

	it('registers all 6 opportunity tools', () => {
		const toolNames = Object.keys(server.tools);
		expect(toolNames).toContain('create_opportunity');
		expect(toolNames).toContain('get_opportunity');
		expect(toolNames).toContain('list_opportunities');
		expect(toolNames).toContain('update_opportunity');
		expect(toolNames).toContain('delete_opportunity');
		expect(toolNames).toContain('upsert_opportunity');
	});

	describe('create_opportunity', () => {
		it('calls POST /rest/opportunities', async () => {
			client.request.mockResolvedValue({ data: { id: '123' } });

			await callTool(server, 'create_opportunity', { name: 'Big Deal', amount: 1000000, stage: 'NEW' });

			expect(client.request).toHaveBeenCalledWith('POST', '/rest/opportunities', expect.objectContaining({
				name: 'Big Deal',
				amount: 1000000,
				stage: 'NEW',
			}));
		});
	});

	describe('list_opportunities', () => {
		it('passes companyId and stage filters', async () => {
			client.request.mockResolvedValue({ data: [] });

			await callTool(server, 'list_opportunities', { companyId: 'c-1', stage: 'MEETING' });

			expect(client.request).toHaveBeenCalledWith('GET', '/rest/opportunities', undefined, expect.objectContaining({
				companyId: 'c-1',
				stage: 'MEETING',
			}));
		});
	});
});
