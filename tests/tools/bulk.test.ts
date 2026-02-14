import { createMockServer, createMockClient, callTool } from './helpers';
import { registerBulkTools } from '../../src/tools/bulk';

describe('Bulk Tools', () => {
	let server: ReturnType<typeof createMockServer>;
	let client: ReturnType<typeof createMockClient>;

	beforeEach(() => {
		server = createMockServer();
		client = createMockClient();
		registerBulkTools(server as any, client as any);
	});

	it('registers all 3 bulk tools', () => {
		const toolNames = Object.keys(server.tools);
		expect(toolNames).toContain('bulk_create');
		expect(toolNames).toContain('bulk_update');
		expect(toolNames).toContain('bulk_delete');
	});

	describe('bulk_create', () => {
		it('parses JSON items and calls bulkOperation with create', async () => {
			client.bulkOperation.mockResolvedValue([{ success: true }, { success: true }]);

			const result = await callTool(server, 'bulk_create', {
				resourceType: 'company',
				items: JSON.stringify([{ name: 'A' }, { name: 'B' }]),
			});

			expect(client.bulkOperation).toHaveBeenCalledWith('create', 'company', [{ name: 'A' }, { name: 'B' }]);
			expect(result.isError).toBeUndefined();
		});

		it('returns error for invalid JSON', async () => {
			const result = await callTool(server, 'bulk_create', {
				resourceType: 'company',
				items: 'not-json',
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('bulk_update', () => {
		it('validates items have id field', async () => {
			const result = await callTool(server, 'bulk_update', {
				resourceType: 'company',
				items: JSON.stringify([{ name: 'A' }]),
			});

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('id');
		});

		it('calls bulkOperation with update for valid items', async () => {
			client.bulkOperation.mockResolvedValue([{ success: true }]);

			await callTool(server, 'bulk_update', {
				resourceType: 'company',
				items: JSON.stringify([{ id: '123', name: 'Updated' }]),
			});

			expect(client.bulkOperation).toHaveBeenCalledWith('update', 'company', [{ id: '123', name: 'Updated' }]);
		});
	});

	describe('bulk_delete', () => {
		it('converts string IDs to delete items', async () => {
			client.bulkOperation.mockResolvedValue([{ success: true }, { success: true }]);

			await callTool(server, 'bulk_delete', {
				resourceType: 'company',
				ids: ['123', '456'],
			});

			expect(client.bulkOperation).toHaveBeenCalledWith('delete', 'company', [{ id: '123' }, { id: '456' }]);
		});
	});
});
