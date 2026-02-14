/**
 * Field transformation functions for Twenty CRM API
 */

import type { DataObject } from "./types.js";

/**
 * Build filter query string for Twenty CRM API
 */
export function buildFilterQuery(filters: DataObject): DataObject {
  const qs: DataObject = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      qs[key] = value;
    }
  }

  return qs;
}

/**
 * Clean undefined/null values from object (for request body)
 */
export function cleanObject(obj: DataObject): DataObject {
  const cleaned: DataObject = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Transform a simple URL string to Twenty CRM Links object format
 */
export function toLinkObject(url: string | undefined): DataObject | undefined {
  if (!url || url === "") {
    return undefined;
  }

  // Ensure URL has protocol
  let formattedUrl = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    formattedUrl = `https://${url}`;
  }

  return {
    primaryLinkLabel: "",
    primaryLinkUrl: formattedUrl,
    secondaryLinks: [],
  };
}

/**
 * Transform company fields to Twenty CRM API format
 * Converts simple strings to complex objects where needed
 */
export function transformCompanyFields(fields: DataObject): DataObject {
  const transformed: DataObject = { ...fields };

  // Transform domainName (string → Links object)
  if (typeof transformed.domainName === "string") {
    const linkObj = toLinkObject(transformed.domainName as string);
    if (linkObj) {
      transformed.domainName = linkObj;
    } else {
      delete transformed.domainName;
    }
  }

  // Transform linkedinUrl → linkedinLink (Links object)
  if (typeof transformed.linkedinUrl === "string") {
    const linkObj = toLinkObject(transformed.linkedinUrl as string);
    if (linkObj) {
      transformed.linkedinLink = linkObj;
    }
    delete transformed.linkedinUrl;
  }

  // Transform xUrl → xLink (Links object)
  if (typeof transformed.xUrl === "string") {
    const linkObj = toLinkObject(transformed.xUrl as string);
    if (linkObj) {
      transformed.xLink = linkObj;
    }
    delete transformed.xUrl;
  }

  return transformed;
}

/**
 * Transform person fields to Twenty CRM API format
 * Twenty CRM expects: name: {firstName, lastName}, emails: {primaryEmail}, phones: {primaryPhoneNumber}
 */
export function transformPersonFields(fields: DataObject): DataObject {
  const transformed: DataObject = {};

  // Transform firstName/lastName → name object
  if (fields.firstName || fields.lastName) {
    transformed.name = {
      firstName: fields.firstName || "",
      lastName: fields.lastName || "",
    };
  }

  // Transform email → emails object
  if (typeof fields.email === "string" && fields.email) {
    transformed.emails = {
      primaryEmail: fields.email,
      additionalEmails: [],
    };
  }

  // Transform phone → phones object
  if (typeof fields.phone === "string" && fields.phone) {
    transformed.phones = {
      primaryPhoneNumber: fields.phone,
      primaryPhoneCountryCode: "",
      primaryPhoneCallingCode: "",
      additionalPhones: [],
    };
  }

  // Transform linkedinUrl → linkedinLink (Links object)
  if (typeof fields.linkedinUrl === "string" && fields.linkedinUrl) {
    transformed.linkedinLink = toLinkObject(fields.linkedinUrl);
  }

  // Transform xUrl → xLink (Links object)
  if (typeof fields.xUrl === "string" && fields.xUrl) {
    transformed.xLink = toLinkObject(fields.xUrl);
  }

  // Copy other fields as-is (jobTitle, city, avatarUrl, companyId, position)
  const directFields = [
    "jobTitle",
    "city",
    "avatarUrl",
    "companyId",
    "position",
  ];
  for (const field of directFields) {
    if (
      fields[field] !== undefined &&
      fields[field] !== null &&
      fields[field] !== ""
    ) {
      transformed[field] = fields[field];
    }
  }

  return transformed;
}

/**
 * Transform note fields to Twenty CRM API format
 * Note: Twenty CRM notes don't have a 'body' field - only 'title' and 'position'
 */
export function transformNoteFields(fields: DataObject): DataObject {
  const transformed: DataObject = { ...fields };

  // Twenty CRM notes API doesn't support 'body' field
  // Remove it to prevent API errors
  if ("body" in transformed) {
    delete transformed.body;
  }

  return transformed;
}

/**
 * Get endpoint for a resource
 */
export function getResourceEndpoint(resource: string): string {
  const endpoints: Record<string, string> = {
    company: "/rest/companies",
    person: "/rest/people",
    opportunity: "/rest/opportunities",
    note: "/rest/notes",
    task: "/rest/tasks",
    activity: "/rest/activities",
    attachment: "/rest/attachments",
  };

  return endpoints[resource] || `/rest/${resource}`;
}
