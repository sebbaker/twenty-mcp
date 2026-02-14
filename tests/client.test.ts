import { TwentyCrmClient } from '../src/client';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockResponse(data: any, status = 200) {
	return {
		ok: status >= 200 && status < 300,
		status,
		text: jest.fn().mockResolvedValue(JSON.stringify(data)),
		headers: new Map(Object.entries({})),
	};
}

function mockErrorResponse(status: number, body: string, headers: Record<string, string> = {}) {
	return {
		ok: false,
		status,
		text: jest.fn().mockResolvedValue(body),
		headers: {
			entries: () => Object.entries(headers),
		},
	};
}

describe('TwentyCrmClient', () => {
	let client: TwentyCrmClient;

	beforeEach(() => {
		client = new TwentyCrmClient({ apiUrl: 'https://crm.example.com', apiKey: 'test-key' });
		mockFetch.mockReset();
	});

	describe('request', () => {
		it('sends correct Authorization header', async () => {
			mockFetch.mockResolvedValue(mockResponse({ data: [] }));

			await client.request('GET', '/rest/companies');

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const [, options] = mockFetch.mock.calls[0];
			expect(options.headers['Authorization']).toBe('Bearer test-key');
			expect(options.headers['Content-Type']).toBe('application/json');
		});

		it('builds URL with query params', async () => {
			mockFetch.mockResolvedValue(mockResponse({ data: [] }));

			await client.request('GET', '/rest/companies', undefined, { search: 'acme', limit: 10 });

			const [url] = mockFetch.mock.calls[0];
			expect(url).toContain('https://crm.example.com/rest/companies?');
			expect(url).toContain('search=acme');
			expect(url).toContain('limit=10');
		});

		it('sends JSON body for POST', async () => {
			mockFetch.mockResolvedValue(mockResponse({ data: { id: '123' } }));

			await client.request('POST', '/rest/companies', { name: 'Acme' });

			const [, options] = mockFetch.mock.calls[0];
			expect(options.method).toBe('POST');
			expect(options.body).toBe(JSON.stringify({ name: 'Acme' }));
		});

		it('omits body for GET requests', async () => {
			mockFetch.mockResolvedValue(mockResponse({ data: [] }));

			await client.request('GET', '/rest/companies', { name: 'Acme' });

			const [, options] = mockFetch.mock.calls[0];
			expect(options.body).toBeUndefined();
		});

		it('omits body for DELETE requests', async () => {
			mockFetch.mockResolvedValue(mockResponse({}));

			await client.request('DELETE', '/rest/companies/123', { extra: 'data' });

			const [, options] = mockFetch.mock.calls[0];
			expect(options.body).toBeUndefined();
		});

		it('throws on non-ok response with status code', async () => {
			mockFetch.mockResolvedValue(mockErrorResponse(404, 'Not found'));

			await expect(client.request('GET', '/rest/companies/bad-id'))
				.rejects.toThrow('Twenty CRM API error (404)');
		});

		it('removes trailing slash from baseUrl', async () => {
			const clientWithSlash = new TwentyCrmClient({
				apiUrl: 'https://crm.example.com/',
				apiKey: 'key',
			});
			mockFetch.mockResolvedValue(mockResponse({ data: [] }));

			await clientWithSlash.request('GET', '/rest/companies');

			const [url] = mockFetch.mock.calls[0];
			expect(url).toBe('https://crm.example.com/rest/companies');
		});

		it('returns empty object for empty response', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				text: jest.fn().mockResolvedValue(''),
				headers: new Map(),
			});

			const result = await client.request('DELETE', '/rest/companies/123');
			expect(result).toEqual({});
		});
	});

	describe('requestWithRetry', () => {
		it('retries on 429 error', async () => {
			mockFetch
				.mockResolvedValueOnce(mockErrorResponse(429, 'Rate limited', {}))
				.mockResolvedValue(mockResponse({ data: { id: '123' } }));

			const result = await client.requestWithRetry('GET', '/rest/companies/123', undefined, undefined, {
				baseDelayMs: 1,
				maxDelayMs: 10,
			});

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(result.data.id).toBe('123');
		});

		it('does not retry on 401 error', async () => {
			mockFetch.mockResolvedValue(mockErrorResponse(401, 'Unauthorized'));

			await expect(
				client.requestWithRetry('GET', '/rest/companies', undefined, undefined, {
					baseDelayMs: 1,
				}),
			).rejects.toThrow();

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('does not retry on 400 error', async () => {
			mockFetch.mockResolvedValue(mockErrorResponse(400, 'Bad request'));

			await expect(
				client.requestWithRetry('GET', '/rest/companies', undefined, undefined, {
					baseDelayMs: 1,
				}),
			).rejects.toThrow();

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('respects maxRetries', async () => {
			mockFetch.mockResolvedValue(mockErrorResponse(503, 'Unavailable', {}));

			await expect(
				client.requestWithRetry('GET', '/rest/companies', undefined, undefined, {
					maxRetries: 2,
					baseDelayMs: 1,
					maxDelayMs: 5,
				}),
			).rejects.toThrow();

			// 1 initial + 2 retries = 3 calls
			expect(mockFetch).toHaveBeenCalledTimes(3);
		});
	});

	describe('requestAllItems', () => {
		it('paginates until fewer items than limit', async () => {
			mockFetch
				.mockResolvedValueOnce(mockResponse({
					data: Array.from({ length: 200 }, (_, i) => ({ id: `page1-${i}` })),
				}))
				.mockResolvedValueOnce(mockResponse({
					data: Array.from({ length: 30 }, (_, i) => ({ id: `page2-${i}` })),
				}));

			const result = await client.requestAllItems('GET', '/rest/companies');

				expect(result).toHaveLength(230);
			expect(mockFetch).toHaveBeenCalledTimes(2);

			// Check offset was incremented
			const firstUrl = mockFetch.mock.calls[0][0];
			const secondUrl = mockFetch.mock.calls[1][0];
			expect(firstUrl).toContain('offset=0');
			expect(secondUrl).toContain('offset=200');
		});

		it('stops after single page if fewer items', async () => {
			mockFetch.mockResolvedValue(mockResponse({
				data: [{ id: '1' }, { id: '2' }],
			}));

			const result = await client.requestAllItems('GET', '/rest/companies');

			expect(result).toHaveLength(2);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});

	describe('searchRecords', () => {
		it('searches multiple object types in parallel', async () => {
			mockFetch
				.mockResolvedValueOnce(mockResponse({ data: [{ id: '1', name: 'Acme' }] }))
				.mockResolvedValueOnce(mockResponse({ data: [{ id: '2', name: 'John' }] }));

			const result = await client.searchRecords('test', ['companies', 'people']);

			expect(result).toHaveLength(2);
			expect(result[0]._objectType).toBe('companies');
			expect(result[1]._objectType).toBe('people');
		});

		it('continues if one object type fails', async () => {
			mockFetch
				.mockResolvedValueOnce(mockErrorResponse(500, 'Server error', {}))
				.mockResolvedValueOnce(mockResponse({ data: [{ id: '1' }] }));

			const result = await client.searchRecords('test', ['companies', 'people']);

			// companies failed, people succeeded
			expect(result).toHaveLength(1);
			expect(result[0]._objectType).toBe('people');
		});
	});

	describe('findRecordByField', () => {
		it('finds record using filter', async () => {
			mockFetch.mockResolvedValue(mockResponse({
				data: [{ id: '123', name: 'Acme' }],
			}));

			const result = await client.findRecordByField('company', 'name', 'Acme');

			expect(result).toEqual({ id: '123', name: 'Acme' });
			const [url] = mockFetch.mock.calls[0];
			expect(url).toContain('filter=');
		});

		it('falls back to search if filter fails', async () => {
			mockFetch
				.mockResolvedValueOnce(mockErrorResponse(400, 'Filter not supported', {}))
				.mockResolvedValueOnce(mockResponse({
					data: [{ id: '123', name: 'Acme' }],
				}));

			const result = await client.findRecordByField('company', 'name', 'Acme');

			expect(result).toEqual({ id: '123', name: 'Acme' });
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('returns null when no match', async () => {
			mockFetch.mockResolvedValue(mockResponse({ data: [] }));

			const result = await client.findRecordByField('company', 'name', 'Nonexistent');

			expect(result).toBeNull();
		});

		it('returns null when both filter and search fail', async () => {
			mockFetch
				.mockResolvedValue(mockErrorResponse(500, 'Server error', {}));

			const result = await client.findRecordByField('company', 'name', 'Acme');

			expect(result).toBeNull();
		});
	});

	describe('bulkOperation', () => {
		it('processes create operations', async () => {
			mockFetch.mockResolvedValue(mockResponse({ data: { id: '123' } }));

			const result = await client.bulkOperation('create', 'company', [
				{ name: 'Acme' },
				{ name: 'Beta' },
			]);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ success: true, data: { data: { id: '123' } } });
		});

		it('processes update operations (removes id from body)', async () => {
			mockFetch.mockResolvedValue(mockResponse({ data: { id: '123' } }));

			await client.bulkOperation('update', 'company', [
				{ id: '123', name: 'Updated Acme' },
			]);

			const [url, options] = mockFetch.mock.calls[0];
			expect(url).toContain('/rest/companies/123');
			expect(options.method).toBe('PUT');
			const body = JSON.parse(options.body);
			expect(body.id).toBeUndefined();
			expect(body.name).toBe('Updated Acme');
		});

		it('processes delete operations', async () => {
			mockFetch.mockResolvedValue(mockResponse({}));

			await client.bulkOperation('delete', 'company', [
				{ id: '123' },
				{ id: '456' },
			]);

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(mockFetch.mock.calls[0][0]).toContain('/rest/companies/123');
			expect(mockFetch.mock.calls[1][0]).toContain('/rest/companies/456');
		});

		it('returns error for failed items', async () => {
			mockFetch.mockResolvedValue(mockErrorResponse(400, 'Bad request', {}));

			const result = await client.bulkOperation('create', 'company', [{ name: 'Bad' }]);

			expect(result).toHaveLength(1);
			expect(result[0].success).toBe(false);
			expect(result[0].error).toBeDefined();
		});

		it('processes items with concurrency limit of 5', async () => {
			// Create 7 items — should be 2 batches (5 + 2)
			const items = Array.from({ length: 7 }, (_, i) => ({ name: `Company ${i}` }));
			let concurrentCalls = 0;
			let maxConcurrent = 0;

			mockFetch.mockImplementation(async () => {
				concurrentCalls++;
				maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
				await new Promise((r) => setTimeout(r, 10));
				concurrentCalls--;
				return mockResponse({ data: { id: '123' } });
			});

			const result = await client.bulkOperation('create', 'company', items);

			expect(result).toHaveLength(7);
			expect(maxConcurrent).toBeLessThanOrEqual(5);
		});
	});
});
