export {};

declare global {
  interface Window {
    conetecDesktop?: {
      isDesktop: boolean;
      hasOfflinePin(): Promise<boolean>;
      configureOfflinePin(pin: string, profile: { userId: string; email: string; roles: string[] }): Promise<{ ok: boolean; error?: string }>;
      unlockOffline(pin: string): Promise<{ ok: boolean; profile?: { userId: string; email: string; roles: string[] }; error?: string; retryAfter?: number }>;
      protectLocalData(value: string): Promise<string>;
      unprotectLocalData(value: string): Promise<string>;
    };
  }
}