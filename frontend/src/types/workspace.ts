export interface WorkspaceConfiguration {
  id: string; name: string; code: string; description: string | null; active: boolean;
  defaultCurrency: string; timeZone: string; createdAt: string; updatedAt: string;
}
export interface WorkspaceConfigurationRequest {
  name: string; code: string; description: string; active: boolean;
  defaultCurrency: string; timeZone: string;
}
