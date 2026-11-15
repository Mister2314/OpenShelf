export function userError(error: unknown, fallback = 'We couldn’t complete that request. Please try again.') {
  const message = error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : String(error);

  if (/choose an epub under 50 mb/i.test(message)) return message;
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match. Check them and try again.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email before signing in.';
  if (/user already registered/i.test(message)) return 'An account already exists for this email. Try signing in instead.';
  if (/access_denied|user is not an authorized test user|developer-approved testers/i.test(message)) return 'Google access is limited to approved testers while this app is in testing. The OpenShelf developer needs to add your Google account in Google Cloud Console → Google Auth Platform → Audience → Test users.';
  if (/drive file picker is not configured|set VITE_GOOGLE_API_KEY|set VITE_GOOGLE_CLIENT_ID/i.test(message)) return 'Google Drive file selection is not configured for this OpenShelf deployment yet. The developer needs to finish the Google Picker setup.';
  if (/auth session missing|jwt expired|refresh token/i.test(message)) return 'Your sign-in session has expired. Sign in again to continue.';
  if (/permission denied|not authorized|unauthorized|row.level security/i.test(message)) return 'This account doesn’t have access to that action. Sign in with an authorized account or contact the owner.';
  if (/speech synthesis is unavailable/i.test(message)) return 'Speech is unavailable in this browser.';
  if (/network|failed to fetch|fetch failed|load failed|timeout/i.test(message)) return 'There’s a connection problem. Check your internet and try again.';
  return fallback;
}
