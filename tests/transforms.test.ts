import {
	cleanObject,
	toLinkObject,
	transformCompanyFields,
	transformPersonFields,
	transformNoteFields,
	getResourceEndpoint,
	buildFilterQuery,
} from '../src/transforms';

describe('cleanObject', () => {
	it('removes null, undefined, and empty string values', () => {
		const result = cleanObject({
			name: 'Test',
			empty: '',
			nullVal: null,
			undefVal: undefined,
			zero: 0,
			falseVal: false,
		});
		expect(result).toEqual({ name: 'Test', zero: 0, falseVal: false });
	});

	it('returns empty object for all-empty input', () => {
		expect(cleanObject({ a: '', b: null, c: undefined })).toEqual({});
	});
});

describe('toLinkObject', () => {
	it('converts plain URL to Links format with https', () => {
		const result = toLinkObject('example.com');
		expect(result).toEqual({
			primaryLinkLabel: '',
			primaryLinkUrl: 'https://example.com',
			secondaryLinks: [],
		});
	});

	it('preserves existing https protocol', () => {
		const result = toLinkObject('https://example.com');
		expect(result?.primaryLinkUrl).toBe('https://example.com');
	});

	it('preserves http protocol', () => {
		const result = toLinkObject('http://example.com');
		expect(result?.primaryLinkUrl).toBe('http://example.com');
	});

	it('returns undefined for empty input', () => {
		expect(toLinkObject(undefined)).toBeUndefined();
		expect(toLinkObject('')).toBeUndefined();
	});
});

describe('transformCompanyFields', () => {
	it('converts domainName string to Links object', () => {
		const result = transformCompanyFields({ name: 'Acme', domainName: 'acme.com' });
		expect(result.name).toBe('Acme');
		expect(result.domainName).toEqual({
			primaryLinkLabel: '',
			primaryLinkUrl: 'https://acme.com',
			secondaryLinks: [],
		});
	});

	it('renames linkedinUrl to linkedinLink', () => {
		const result = transformCompanyFields({ linkedinUrl: 'https://linkedin.com/company/acme' });
		expect(result.linkedinLink).toBeDefined();
		expect(result.linkedinUrl).toBeUndefined();
		expect((result.linkedinLink as any).primaryLinkUrl).toBe('https://linkedin.com/company/acme');
	});

	it('renames xUrl to xLink', () => {
		const result = transformCompanyFields({ xUrl: 'https://x.com/acme' });
		expect(result.xLink).toBeDefined();
		expect(result.xUrl).toBeUndefined();
	});

	it('passes through other fields unchanged', () => {
		const result = transformCompanyFields({
			name: 'Acme',
			address: '123 Main St',
			employees: 50,
		});
		expect(result.name).toBe('Acme');
		expect(result.address).toBe('123 Main St');
		expect(result.employees).toBe(50);
	});

	it('removes domainName if empty after transform', () => {
		const result = transformCompanyFields({ domainName: '' });
		expect(result.domainName).toBeUndefined();
	});
});

describe('transformPersonFields', () => {
	it('wraps firstName/lastName into name object', () => {
		const result = transformPersonFields({ firstName: 'John', lastName: 'Doe' });
		expect(result.name).toEqual({ firstName: 'John', lastName: 'Doe' });
		expect(result.firstName).toBeUndefined();
		expect(result.lastName).toBeUndefined();
	});

	it('wraps email into emails object', () => {
		const result = transformPersonFields({ email: 'john@example.com' });
		expect(result.emails).toEqual({
			primaryEmail: 'john@example.com',
			additionalEmails: [],
		});
		expect(result.email).toBeUndefined();
	});

	it('wraps phone into phones object', () => {
		const result = transformPersonFields({ phone: '+1234567890' });
		expect(result.phones).toEqual({
			primaryPhoneNumber: '+1234567890',
			primaryPhoneCountryCode: '',
			primaryPhoneCallingCode: '',
			additionalPhones: [],
		});
	});

	it('converts linkedinUrl and xUrl to link objects', () => {
		const result = transformPersonFields({
			linkedinUrl: 'https://linkedin.com/in/johndoe',
			xUrl: 'https://x.com/johndoe',
		});
		expect(result.linkedinLink).toBeDefined();
		expect(result.xLink).toBeDefined();
	});

	it('passes through direct fields', () => {
		const result = transformPersonFields({
			firstName: 'John',
			lastName: 'Doe',
			jobTitle: 'Engineer',
			city: 'NYC',
			companyId: 'comp-123',
			avatarUrl: 'https://example.com/avatar.jpg',
		});
		expect(result.jobTitle).toBe('Engineer');
		expect(result.city).toBe('NYC');
		expect(result.companyId).toBe('comp-123');
		expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
	});

	it('does not include empty email or phone', () => {
		const result = transformPersonFields({ email: '', phone: '' });
		expect(result.emails).toBeUndefined();
		expect(result.phones).toBeUndefined();
	});
});

describe('transformNoteFields', () => {
	it('removes body field', () => {
		const result = transformNoteFields({ title: 'Test', body: 'Some content' });
		expect(result.title).toBe('Test');
		expect(result.body).toBeUndefined();
	});

	it('keeps title and position', () => {
		const result = transformNoteFields({ title: 'Test', position: 1 });
		expect(result).toEqual({ title: 'Test', position: 1 });
	});
});

describe('getResourceEndpoint', () => {
	it('returns correct paths for known resources', () => {
		expect(getResourceEndpoint('company')).toBe('/rest/companies');
		expect(getResourceEndpoint('person')).toBe('/rest/people');
		expect(getResourceEndpoint('opportunity')).toBe('/rest/opportunities');
		expect(getResourceEndpoint('note')).toBe('/rest/notes');
		expect(getResourceEndpoint('task')).toBe('/rest/tasks');
		expect(getResourceEndpoint('activity')).toBe('/rest/activities');
	});

	it('falls back to /rest/{name} for unknown resources', () => {
		expect(getResourceEndpoint('customLeads')).toBe('/rest/customLeads');
	});
});

describe('buildFilterQuery', () => {
	it('filters out undefined, null, and empty values', () => {
		const result = buildFilterQuery({
			search: 'test',
			empty: '',
			nullVal: null,
			undef: undefined,
			limit: 20,
		});
		expect(result).toEqual({ search: 'test', limit: 20 });
	});

	it('returns empty object for all-empty input', () => {
		expect(buildFilterQuery({ a: '', b: null })).toEqual({});
	});
});
