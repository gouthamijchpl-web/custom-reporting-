/** Entity payloads exchanged with /api/v1/entities. */

/**
 * A business the account reports on — a client, company or legal entity.
 */
export interface ReportingEntity {
  id: string;
  name: string;
  /** Optional short label shown where the full name will not fit. */
  code: string | null;
  description: string | null;
  groupId: string | null;
  groupName: string | null;
  pan: string | null;
  primaryGstin: string | null;
  gstnUsername: string | null;
  gstnPasswordConfigured: boolean;
  tallyCompanyName: string | null;
  tallyHost: string;
  tallyPort: number;
  multipleBranches: boolean;
  eInvoiceEnabled: boolean;
  eWayBillEnabled: boolean;
  stockEnabled: boolean;
  costCentreExtractionEnabled: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * The account's entities together with the active one, returned as a single payload so
 * the switcher renders its list and its current value from one request.
 */
export interface EntityListResponse {
  entities: ReportingEntity[];
  selectedEntityId: string | null;
}

export interface CreateEntityRequest {
  groupId: string | null;
  primaryBranchName: string;
  name: string;
  code: string;
  description: string;
  pan: string;
  primaryGstin: string;
  gstnUsername: string;
  gstnPassword: string;
  tallyCompanyName: string;
  tallyHost: string;
  tallyPort: number;
  active: boolean;
  multipleBranches: boolean;
  eInvoiceEnabled: boolean;
  eWayBillEnabled: boolean;
  stockEnabled: boolean;
  costCentreExtractionEnabled: boolean;
}

export type UpdateEntityRequest = CreateEntityRequest;

export interface EntityBranch {
  id: string; name: string; code: string; primaryBranch: boolean; active: boolean;
  createdAt: string; updatedAt: string;
}
export interface BranchRequest { name: string; code: string; primaryBranch: boolean; active: boolean; }

export type RegistrationType = 'REGULAR' | 'COMPOSITION' | 'CASUAL_TAXABLE_PERSON' | 'SEZ' | 'OTHER';
export interface EntityGstin {
  id: string; gstin: string; linkedBookId: string | null; linkedBookName: string | null;
  linkedBranchId: string | null; linkedBranchName: string | null;
  stateName: string; registrationType: RegistrationType; gstnUsername: string | null;
  passwordConfigured: boolean; active: boolean; eInvoiceApplicable: boolean;
  createdAt: string; updatedAt: string;
}
export interface GstinRequest {
  gstin: string; linkedBookId: string | null; linkedBranchId: string | null; stateName: string; registrationType: RegistrationType;
  gstnUsername: string; gstnPassword: string; active: boolean; eInvoiceApplicable: boolean;
}

export type BookSource = 'TALLY' | 'ZOHO_BOOKS';
export interface EntityBook {
  id: string; name: string; source: BookSource; primaryBook: boolean; active: boolean;
  tallyCompanyName: string | null; tallyHost: string | null; tallyPort: number | null;
  clientId: string | null; accountsDomain: string | null; apiDomain: string | null;
  organizationId: string | null; organizationName: string | null; secretConfigured: boolean;
  tokenConnected: boolean; tokenExpiresAt: string | null; createdAt: string; updatedAt: string;
}
export interface BookRequest {
  name: string; source: BookSource; primaryBook: boolean; active: boolean;
  tallyCompanyName: string; tallyHost: string; tallyPort: number;
  clientId: string; clientSecret: string; accountsDomain: string; generatedCode: string;
  apiDomain: string; organizationId: string; organizationName: string; generateAndStoreToken: boolean;
}
