const ONBOARDING_KEY = "hl_onboarding_seen_v1";

export function hasSeenOnboarding() {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function setSeenOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}