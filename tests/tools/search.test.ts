import { createMockServer, createMockClient, callTool } from './helpers';
import { registerSearchTools } from '../../src/tools/search';

describe('Search Tools', () => {
	let server: ReturnType<typeof createMockServer>;
	let client: ReturnType<typeof createMockClient>;

	beforeEach(() => {
		server = createMockServer();
		client = createMockClient();
		registerSearchTools(server as any, client as any);
	});

	it('registers the search tool', () => {
		expect(Object.keys(server.tools)).toContain('search');
	});

	describe('search', () => {
		it('calls searchRecords with correct params', async () => {
			client.searchRecords.mockResolvedValue([
				{ id: '1', _objectType: 'companies' },
				{ id: '2', _objectType: 'people' },
			]);

			const result = await callTool(server, 'search', {
				query: 'acme',
				objectTypes: ['companies', 'people'],
				limit: 10,
			});

			expect(client.searchRecords).toHaveBeenCalledWith('acme', ['companies', 'people'], 10);
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed).toHaveLength(2);
		});

		it('uses default objectTypes when not specified', async () => {
			client.searchRecords.mockResolvedValue([]);

			await callTool(server, 'search', { query: 'test' });

			expect(client.searchRecords).toHaveBeenCalledWith(
				'test',
				['people', 'companies', 'opportunities', 'notes', 'tasks'],
				20,
			);
		});
	});
});
