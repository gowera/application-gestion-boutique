export {};

declare global {
  interface Window {
    conetecDesktop?: {
      isDesktop: boolean;
      hasOfflinePin(): Promise<boolean>;
      isLocalOnly(): Promise<boolean>;
      configureOfflinePin(pin: string, profile: { userId: string; email: string; roles: string[] }): Promise<{ ok: boolean; error?: string }>;
      unlockOffline(pin: string): Promise<{ ok: boolean; profile?: { userId: string; email: string; roles: string[] }; error?: string; retryAfter?: number }>;
      localRequest(request: { pathname: string; search: string; method: string; headers: [string, string][]; body?: string }): Promise<{ status: number; headers: Record<string, string>; body: string }>;
      protectLocalData(value: string): Promise<string>;
      unprotectLocalData(value: string): Promise<string>;
      dbGet?(key: string): Promise<unknown>;
      dbSet?(key: string, value: unknown): Promise<{ ok: boolean; error?: string }>;
      dbDel?(key: string): Promise<{ ok: boolean }>;
      dbKeys?(): Promise<string[]>;
    };
  }
}
