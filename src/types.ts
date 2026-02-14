/**
 * Type definitions for Twenty CRM MCP Server
 */

export type DataObject = Record<string, unknown>;

// API Response types
export interface ITwentyApiResponse {
  data: DataObject | DataObject[];
  pageInfo?: {
    hasNextPage: boolean;
    endCursor: string;
  };
}

// Company types
export interface ICompany {
  id?: string;
  name: string;
  domainName?: string;
  address?: string;
  employees?: number;
  linkedinUrl?: string;
  xUrl?: string;
  annualRecurringRevenue?: number;
  idealCustomerProfile?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Person types
export interface IPerson {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  city?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  avatarUrl?: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Opportunity types
export type OpportunityStage =
  | "NEW"
  | "SCREENING"
  | "MEETING"
  | "PROPOSAL"
  | "CUSTOMER"
  | string;

export interface IOpportunity {
  id?: string;
  name: string;
  amount?: number;
  closeDate?: string;
  stage?: OpportunityStage;
  companyId?: string;
  pointOfContactId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Note types
export interface INote {
  id?: string;
  title: string;
  position?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Task types
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export interface ITask {
  id?: string;
  title: string;
  body?: string;
  status?: TaskStatus;
  dueAt?: string;
  assigneeId?: string;
  position?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Activity types
export type ActivityType = "Call" | "Email" | "Meeting" | "Note" | "Task";

export interface IActivity {
  id?: string;
  title: string;
  type: ActivityType;
  body?: string;
  dueAt?: string;
  completedAt?: string;
  reminderAt?: string;
  companyId?: string;
  personId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Search types
export type SearchObjectType =
  | "people"
  | "companies"
  | "opportunities"
  | "notes"
  | "tasks";

// Credentials
export interface ITwentyCrmCredentials {
  apiUrl: string;
  apiKey: string;
}
