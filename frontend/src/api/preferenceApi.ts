import { httpClient } from './httpClient';

interface PreferenceResponse<TValue> {
  key: string;
  value: TValue | null;
  updatedAt?: string;
}

export const preferenceApi = {
  get: <TValue>(key: string) => httpClient.get<PreferenceResponse<TValue>>(`/preferences/${encodeURIComponent(key)}`),
  set: <TValue>(key: string, value: TValue) =>
    httpClient.put<PreferenceResponse<TValue>>(`/preferences/${encodeURIComponent(key)}`, { value }),
};
