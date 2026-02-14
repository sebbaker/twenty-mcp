import { createMockServer, createMockClient, callTool } from './helpers';
import { registerPersonTools } from '../../src/tools/person';

describe('Person Tools', () => {
	let server: ReturnType<typeof createMockServer>;
	let client: ReturnType<typeof createMockClient>;

	beforeEach(() => {
		server = createMockServer();
		client = createMockClient();
		registerPersonTools(server as any, client as any);
	});

	it('registers all 6 person tools', () => {
		const toolNames = Object.keys(server.tools);
		expect(toolNames).toContain('create_person');
		expect(toolNames).toContain('get_person');
		expect(toolNames).toContain('list_people');
		expect(toolNames).toContain('update_person');
		expect(toolNames).toContain('delete_person');
		expect(toolNames).toContain('upsert_person');
	});

	describe('create_person', () => {
		it('calls POST /rest/people with transformed fields', async () => {
			client.request.mockResolvedValue({ data: { id: '123' } });

			await callTool(server, 'create_person', {
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
			});

			expect(client.request).toHaveBeenCalledWith('POST', '/rest/people', expect.objectContaining({
				name: { firstName: 'John', lastName: 'Doe' },
				emails: { primaryEmail: 'john@example.com', additionalEmails: [] },
			}));
		});
	});

	describe('list_people', () => {
		it('passes companyId and search filters', async () => {
			client.request.mockResolvedValue({ data: [] });

			await callTool(server, 'list_people', { companyId: 'comp-1', search: 'john' });

			expect(client.request).toHaveBeenCalledWith('GET', '/rest/people', undefined, expect.objectContaining({
				companyId: 'comp-1',
				search: 'john',
			}));
		});
	});

	describe('upsert_person', () => {
		it('creates when not found, updates when found', async () => {
			client.findRecordByField.mockResolvedValue({ id: 'p-123' });
			client.request.mockResolvedValue({ data: { id: 'p-123' } });

			const result = await callTool(server, 'upsert_person', {
				matchField: 'email',
				matchValue: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
			});

			expect(client.request).toHaveBeenCalledWith('PUT', '/rest/people/p-123', expect.any(Object));
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed._upsertAction).toBe('updated');
		});
	});
});
