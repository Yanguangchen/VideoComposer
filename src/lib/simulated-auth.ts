/** localStorage key for simulated dashboard gate (client-only). */
export const SIMULATED_AUTH_STORAGE_KEY = "video-composer-simulated-auth";

/** Demo password for the simulated sign-in modal. */
export const SIMULATED_AUTH_PASSWORD = "webwizards@01";

export function readSimulatedSignedIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIMULATED_AUTH_STORAGE_KEY) === "1";
}

export function writeSimulatedSignedIn(signedIn: boolean): void {
  if (typeof window === "undefined") return;
  if (signedIn) {
    window.localStorage.setItem(SIMULATED_AUTH_STORAGE_KEY, "1");
  } else {
    window.localStorage.removeItem(SIMULATED_AUTH_STORAGE_KEY);
  }
}
