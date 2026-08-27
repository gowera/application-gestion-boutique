const KEY = "conetec:offline-unlocked";
const PROFILE_KEY = "conetec:offline-profile";

export type OfflineProfile = { userId: string; email: string; roles: string[]; validatedAt?: string };

export function setOfflineUnlocked(profile: OfflineProfile): void {
  sessionStorage.setItem(KEY, "1");
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(`conetec:roles:${profile.userId}`, JSON.stringify(profile.roles));
}

export function clearOfflineUnlocked(): void {
  sessionStorage.removeItem(KEY);
  sessionStorage.removeItem(PROFILE_KEY);
}

export function getOfflineProfile(): OfflineProfile | null {
  if (typeof window === "undefined" || sessionStorage.getItem(KEY) !== "1") return null;
  try { return JSON.parse(sessionStorage.getItem(PROFILE_KEY) ?? "null") as OfflineProfile | null; } catch { return null; }
}

export function isOfflineUnlocked(): boolean {
  return Boolean(getOfflineProfile());
}