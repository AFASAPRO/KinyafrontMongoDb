/**
 * Friendly messages for the machine codes the backend puts in
 * ?google_error=… when Google sign-in cannot complete.
 */
const MESSAGES = {
  cancelled: 'Google sign-in was cancelled. You can try again whenever you like.',
  not_configured: 'Google sign-in is not available right now. Please use email and password instead.',
  state_invalid: 'Your Google sign-in session expired or was interrupted. Please try again.',
  code_expired: 'The Google sign-in expired. Please try again.',
  config_error: 'Google sign-in is temporarily misconfigured. Please contact support.',
  verify_failed: "We couldn't verify your Google account. Please try again.",
  no_email: "Your Google account didn't share an email address, so we can't sign you in.",
  email_unverified: 'Your Google email is not verified. Verify it with Google, then try again.',
  account_suspended: 'This account is suspended. Please contact support.',
  link_conflict: 'This email is already linked to a different Google account.',
  maintenance: 'KinyaBot is in maintenance mode. Please check back soon.',
  google_unavailable: 'Google is not responding right now. Please try again shortly.',
  server_error: 'Something went wrong signing you in with Google. Please try again.'
}

export function googleErrorMessage(code) {
  if (!code) return ''
  return MESSAGES[String(code)] || MESSAGES.server_error
}
