export interface BusinessGroup {
  id: string;
  name: string;
  seriesCode: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupRequest {
  name: string;
  seriesCode: string;
  active: boolean;
}
