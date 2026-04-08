export type ProviderStatus = 'available' | 'unavailable' | 'error';

export interface ProviderInfo {
  name: string;
  status: ProviderStatus;
  error?: string;
}

export interface BaseProvider {
  name: string;
  validateAvailability(): Promise<ProviderInfo>;
}
