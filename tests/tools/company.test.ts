import { createMockServer, createMockClient, callTool } from './helpers';
import { registerCompanyTools } from '../../src/tools/company';

describe('Company Tools', () => {
	let server: ReturnType<typeof createMockServer>;
	let client: ReturnType<typeof createMockClient>;

	beforeEach(() => {
		server = createMockServer();
		client = createMockClient();
		registerCompanyTools(server as any, client as any);
	});

	it('registers all 6 company tools', () => {
		const toolNames = Object.keys(server.tools);
		expect(toolNames).toContain('create_company');
		expect(toolNames).toContain('get_company');
		expect(toolNames).toContain('list_companies');
		expect(toolNames).toContain('update_company');
		expect(toolNames).toContain('delete_company');
		expect(toolNames).toContain('upsert_company');
	});

	describe('create_company', () => {
		it('calls POST /rest/companies with transformed fields', async () => {
			client.request.mockResolvedValue({ data: { id: '123', name: 'Acme' } });

			const result = await callTool(server, 'create_company', {
				name: 'Acme',
				domainName: 'acme.com',
			});

			expect(client.request).toHaveBeenCalledWith('POST', '/rest/companies', expect.objectContaining({
				name: 'Acme',
				domainName: expect.objectContaining({ primaryLinkUrl: 'https://acme.com' }),
			}));
			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.data.id).toBe('123');
		});

		it('returns isError on failure', async () => {
			client.request.mockRejectedValue(new Error('API failed'));

			const result = await callTool(server, 'create_company', { name: 'Acme' });

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('API failed');
		});

		it('merges custom fields', async () => {
			client.request.mockResolvedValue({ data: { id: '123' } });

			await callTool(server, 'create_company', {
				name: 'Acme',
				customFields: { myField: 'value' },
			});

			expect(client.request).toHaveBeenCalledWith('POST', '/rest/companies', expect.objectContaining({
				name: 'Acme',
				myField: 'value',
			}));
		});
	});

	describe('get_company', () => {
		it('calls GET /rest/companies/:id', async () => {
			client.request.mockResolvedValue({ data: { id: '123', name: 'Acme' } });

			const result = await callTool(server, 'get_company', { id: '123' });

			expect(client.request).toHaveBeenCalledWith('GET', '/rest/companies/123');
			expect(result.isError).toBeUndefined();
		});
	});

	describe('list_companies', () => {
		it('passes search and limit as query params', async () => {
			client.request.mockResolvedValue({ data: [{ id: '1' }] });

			await callTool(server, 'list_companies', { search: 'acme', limit: 10 });

			expect(client.request).toHaveBeenCalledWith('GET', '/rest/companies', undefined, expect.objectContaining({
				search: 'acme',
				limit: 10,
			}));
		});

		it('uses requestAllItems when returnAll is true', async () => {
			client.requestAllItems.mockResolvedValue([{ id: '1' }, { id: '2' }]);

			const result = await callTool(server, 'list_companies', { returnAll: true });

			expect(client.requestAllItems).toHaveBeenCalledWith('GET', '/rest/companies', undefined, expect.any(Object));
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed).toHaveLength(2);
		});
	});

	describe('update_company', () => {
		it('calls PUT /rest/companies/:id with transformed fields', async () => {
			client.request.mockResolvedValue({ data: { id: '123', name: 'Updated' } });

			await callTool(server, 'update_company', { id: '123', name: 'Updated', domainName: 'new.com' });

			expect(client.request).toHaveBeenCalledWith('PUT', '/rest/companies/123', expect.objectContaining({
				name: 'Updated',
				domainName: expect.objectContaining({ primaryLinkUrl: 'https://new.com' }),
			}));
		});
	});

	describe('delete_company', () => {
		it('calls DELETE /rest/companies/:id', async () => {
			client.request.mockResolvedValue({});

			await callTool(server, 'delete_company', { id: '123' });

			expect(client.request).toHaveBeenCalledWith('DELETE', '/rest/companies/123');
		});
	});

	describe('upsert_company', () => {
		it('creates when record not found', async () => {
			client.findRecordByField.mockResolvedValue(null);
			client.request.mockResolvedValue({ data: { id: 'new-123' } });

			const result = await callTool(server, 'upsert_company', {
				matchField: 'name',
				matchValue: 'Acme',
				name: 'Acme',
			});

			expect(client.findRecordByField).toHaveBeenCalledWith('company', 'name', 'Acme');
			expect(client.request).toHaveBeenCalledWith('POST', '/rest/companies', expect.any(Object));
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed._upsertAction).toBe('created');
		});

		it('updates when record found', async () => {
			client.findRecordByField.mockResolvedValue({ id: 'existing-123' });
			client.request.mockResolvedValue({ data: { id: 'existing-123' } });

			const result = await callTool(server, 'upsert_company', {
				matchField: 'name',
				matchValue: 'Acme',
				name: 'Acme Updated',
			});

			expect(client.request).toHaveBeenCalledWith('PUT', '/rest/companies/existing-123', expect.any(Object));
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed._upsertAction).toBe('updated');
		});
	});
});
