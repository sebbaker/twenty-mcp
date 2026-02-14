import { createMockServer, createMockClient, callTool } from './helpers';
import { registerCustomObjectTools } from '../../src/tools/custom-object';

describe('Custom Object Tools', () => {
	let server: ReturnType<typeof createMockServer>;
	let client: ReturnType<typeof createMockClient>;

	beforeEach(() => {
		server = createMockServer();
		client = createMockClient();
		registerCustomObjectTools(server as any, client as any);
	});

	it('registers all 5 custom object tools', () => {
		const toolNames = Object.keys(server.tools);
		expect(toolNames).toContain('custom_object_create');
		expect(toolNames).toContain('custom_object_get');
		expect(toolNames).toContain('custom_object_list');
		expect(toolNames).toContain('custom_object_update');
		expect(toolNames).toContain('custom_object_delete');
	});

	describe('custom_object_create', () => {
		it('calls POST /rest/{objectApiName} with parsed fields', async () => {
			client.request.mockResolvedValue({ data: { id: '123' } });

			await callTool(server, 'custom_object_create', {
				objectApiName: 'customLeads',
				fields: JSON.stringify({ name: 'Lead 1', score: 85 }),
			});

			expect(client.request).toHaveBeenCalledWith('POST', '/rest/customLeads', { name: 'Lead 1', score: 85 });
		});
	});

	describe('custom_object_get', () => {
		it('calls GET /rest/{objectApiName}/:id with depth', async () => {
			client.request.mockResolvedValue({ data: { id: '123' } });

			await callTool(server, 'custom_object_get', {
				objectApiName: 'customLeads',
				id: '123',
				depth: 2,
			});

			expect(client.request).toHaveBeenCalledWith('GET', '/rest/customLeads/123', undefined, { depth: 2 });
		});
	});

	describe('custom_object_list', () => {
		it('passes filters and limit', async () => {
			client.request.mockResolvedValue({ data: [] });

			await callTool(server, 'custom_object_list', {
				objectApiName: 'customLeads',
				filters: '{"score":{"gt":50}}',
				limit: 10,
			});

			expect(client.request).toHaveBeenCalledWith('GET', '/rest/customLeads', undefined, expect.objectContaining({
				filter: '{"score":{"gt":50}}',
				limit: 10,
			}));
		});

		it('uses requestAllItems when returnAll', async () => {
			client.requestAllItems.mockResolvedValue([{ id: '1' }]);

			await callTool(server, 'custom_object_list', {
				objectApiName: 'customLeads',
				returnAll: true,
			});

			expect(client.requestAllItems).toHaveBeenCalledWith('GET', '/rest/customLeads', undefined, expect.any(Object));
		});
	});

	describe('custom_object_update', () => {
		it('calls PUT /rest/{objectApiName}/:id', async () => {
			client.request.mockResolvedValue({ data: { id: '123' } });

			await callTool(server, 'custom_object_update', {
				objectApiName: 'customLeads',
				id: '123',
				fields: JSON.stringify({ score: 95 }),
			});

			expect(client.request).toHaveBeenCalledWith('PUT', '/rest/customLeads/123', { score: 95 });
		});
	});

	describe('custom_object_delete', () => {
		it('calls DELETE /rest/{objectApiName}/:id', async () => {
			client.request.mockResolvedValue({});

			await callTool(server, 'custom_object_delete', {
				objectApiName: 'customLeads',
				id: '123',
			});

			expect(client.request).toHaveBeenCalledWith('DELETE', '/rest/customLeads/123');
		});
	});
});
