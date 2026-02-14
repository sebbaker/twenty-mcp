import {
	isRetryableError,
	calculateDelay,
	extractRateLimitInfo,
	getErrorContext,
	DEFAULT_RETRY_CONFIG,
} from '../src/retry';

describe('isRetryableError', () => {
	it('returns true for retryable status codes (429, 502, 503, 504)', () => {
		expect(isRetryableError({ statusCode: 429 })).toBe(true);
		expect(isRetryableError({ statusCode: 502 })).toBe(true);
		expect(isRetryableError({ statusCode: 503 })).toBe(true);
		expect(isRetryableError({ statusCode: 504 })).toBe(true);
		expect(isRetryableError({ response: { status: 429 } })).toBe(true);
	});

	it('returns false for non-retryable status codes (400, 401, 403, 404, 422)', () => {
		expect(isRetryableError({ statusCode: 400 })).toBe(false);
		expect(isRetryableError({ statusCode: 401 })).toBe(false);
		expect(isRetryableError({ statusCode: 403 })).toBe(false);
		expect(isRetryableError({ statusCode: 404 })).toBe(false);
		expect(isRetryableError({ statusCode: 422 })).toBe(false);
	});

	it('returns true for retryable network error codes', () => {
		expect(isRetryableError({ code: 'ECONNREFUSED' })).toBe(true);
		expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
		expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true);
		expect(isRetryableError({ code: 'ENOTFOUND' })).toBe(true);
	});

	it('returns true for transient error messages', () => {
		expect(isRetryableError({ message: 'Request timeout' })).toBe(true);
		expect(isRetryableError({ message: 'socket hang up' })).toBe(true);
		expect(isRetryableError({ message: 'network error occurred' })).toBe(true);
		expect(isRetryableError({ message: 'ECONNREFUSED something' })).toBe(true);
	});

	it('returns false for unknown errors', () => {
		expect(isRetryableError({})).toBe(false);
		expect(isRetryableError({ message: 'some random error' })).toBe(false);
		expect(isRetryableError(null)).toBe(false);
	});
});

describe('calculateDelay', () => {
	it('returns exponential backoff values', () => {
		const config = { ...DEFAULT_RETRY_CONFIG };
		// With jitter, we can't test exact values, but we can test ranges
		const delay0 = calculateDelay(0, config);
		const delay1 = calculateDelay(1, config);
		const delay2 = calculateDelay(2, config);

		// Attempt 0: 1000ms ± 25% = 750-1250
		expect(delay0).toBeGreaterThanOrEqual(750);
		expect(delay0).toBeLessThanOrEqual(1250);

		// Attempt 1: 2000ms ± 25% = 1500-2500
		expect(delay1).toBeGreaterThanOrEqual(1500);
		expect(delay1).toBeLessThanOrEqual(2500);

		// Attempt 2: 4000ms ± 25% = 3000-5000
		expect(delay2).toBeGreaterThanOrEqual(3000);
		expect(delay2).toBeLessThanOrEqual(5000);
	});

	it('respects maxDelayMs cap', () => {
		const config = { ...DEFAULT_RETRY_CONFIG, maxDelayMs: 2000 };
		const delay = calculateDelay(10, config);
		expect(delay).toBeLessThanOrEqual(2000);
	});

	it('returns a rounded integer', () => {
		const delay = calculateDelay(0, DEFAULT_RETRY_CONFIG);
		expect(delay).toBe(Math.round(delay));
	});
});

describe('extractRateLimitInfo', () => {
	it('parses numeric Retry-After header', () => {
		const result = extractRateLimitInfo({
			response: { headers: { 'retry-after': '5' } },
		});
		expect(result.retryAfter).toBe(5000);
	});

	it('parses date Retry-After header', () => {
		const futureDate = new Date(Date.now() + 10000).toUTCString();
		const result = extractRateLimitInfo({
			response: { headers: { 'retry-after': futureDate } },
		});
		expect(result.retryAfter).toBeGreaterThan(0);
		expect(result.retryAfter).toBeLessThanOrEqual(11000);
	});

	it('returns empty object for missing header', () => {
		expect(extractRateLimitInfo({})).toEqual({});
		expect(extractRateLimitInfo({ response: { headers: {} } })).toEqual({});
		expect(extractRateLimitInfo(null)).toEqual({});
	});
});

describe('getErrorContext', () => {
	it('returns "Rate limit exceeded" for 429', () => {
		const context = getErrorContext({ statusCode: 429 }, 0, 3);
		expect(context).toContain('Rate limit exceeded');
	});

	it('returns "Service temporarily unavailable" for 503', () => {
		const context = getErrorContext({ statusCode: 503 }, 0, 3);
		expect(context).toContain('Service temporarily unavailable');
	});

	it('returns "Server gateway error" for 502/504', () => {
		expect(getErrorContext({ statusCode: 502 }, 0, 3)).toContain('Server gateway error');
		expect(getErrorContext({ statusCode: 504 }, 0, 3)).toContain('Server gateway error');
	});

	it('returns connection error context for ECONNREFUSED', () => {
		const context = getErrorContext({ code: 'ECONNREFUSED' }, 0, 3);
		expect(context).toContain('Connection refused');
	});

	it('includes attempt count when attempt > 0', () => {
		const context = getErrorContext({}, 2, 3);
		expect(context).toContain('Failed after 3 attempt(s)');
	});

	it('does not include attempt count for first attempt', () => {
		const context = getErrorContext({}, 0, 3);
		expect(context).not.toContain('attempt');
	});
});
