import { createMockServer, createMockClient, callTool } from './helpers';
import { registerNoteTools } from '../../src/tools/note';

describe('Note Tools', () => {
	let server: ReturnType<typeof createMockServer>;
	let client: ReturnType<typeof createMockClient>;

	beforeEach(() => {
		server = createMockServer();
		client = createMockClient();
		registerNoteTools(server as any, client as any);
	});

	it('registers all 5 note tools (no upsert)', () => {
		const toolNames = Object.keys(server.tools);
		expect(toolNames).toContain('create_note');
		expect(toolNames).toContain('get_note');
		expect(toolNames).toContain('list_notes');
		expect(toolNames).toContain('update_note');
		expect(toolNames).toContain('delete_note');
		expect(toolNames).not.toContain('upsert_note');
	});

	describe('create_note', () => {
		it('calls POST /rest/notes with transformed fields (body removed)', async () => {
			client.request.mockResolvedValue({ data: { id: '123' } });

			await callTool(server, 'create_note', { title: 'My Note', position: 1 });

			expect(client.request).toHaveBeenCalledWith('POST', '/rest/notes', expect.objectContaining({
				title: 'My Note',
				position: 1,
			}));
		});
	});
});
