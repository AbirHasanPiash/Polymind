import { useFeatures } from "../../hooks/useFeatures";
import { GOOGLE_CLIENT_ID } from "../../lib/env";

/**
 * True when Google sign-in can be offered at all: the client has an OAuth
 * client id and the backend reports the feature as configured. Shared by the
 * button and the card that draws the divider above it.
 */
export function useGoogleLoginAvailable(): boolean {
  const { features } = useFeatures();
  return Boolean(GOOGLE_CLIENT_ID) && features.google_login;
}
