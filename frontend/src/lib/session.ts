import { getString, isRecord } from "@/lib/api";

export type FairDropProfile = {
  name?: string;
  email?: string;
  picture?: string;
  isDemo?: boolean;
};

const profileKey = "fairdrop:user-profile";

export function profileFromGoogleCredential(credential: string): FairDropProfile {
  try {
    const encodedPayload = credential.split(".")[1];
    if (!encodedPayload) return {};
    const base64Payload = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const binaryPayload = atob(base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binaryPayload, (character) => character.charCodeAt(0));
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!isRecord(payload)) return {};
    const picture = getString(payload.picture);
    return {
      name: getString(payload.name),
      email: getString(payload.email),
      picture: picture && new URL(picture).protocol === "https:" ? picture : undefined,
    };
  } catch {
    return {};
  }
}

export function saveProfile(profile: FairDropProfile): void {
  window.localStorage.setItem(profileKey, JSON.stringify(profile));
  window.dispatchEvent(new Event("fairdrop:auth-change"));
}

export function readProfile(): FairDropProfile | undefined {
  try {
    const rawProfile = window.localStorage.getItem(profileKey);
    if (!rawProfile) return undefined;
    const profile: unknown = JSON.parse(rawProfile);
    if (!isRecord(profile)) return undefined;
    return {
      name: getString(profile.name),
      email: getString(profile.email),
      picture: getString(profile.picture),
      isDemo: profile.isDemo === true,
    };
  } catch {
    return undefined;
  }
}

export function clearProfile(): void {
  window.localStorage.removeItem(profileKey);
}
