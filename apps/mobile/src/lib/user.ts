/**
 * Who owns the rows being written.
 *
 * An account is required on first use, so `user_id` is never nullable and every record
 * has an owner from the moment it is created. That decision is what deletes the
 * local-to-account merge problem, and it is worth not quietly reintroducing.
 *
 * Sign-in does not exist yet — it needs the token-verification endpoint, which needs a
 * Google Cloud project and an Apple membership. Until it lands, writes go to a fixed
 * development subject. This is NOT a local account and must never become one: there is
 * no merge path off it, and the development database gets wiped rather than migrated.
 *
 * When auth arrives, this is the one function that changes.
 */
const DEVELOPMENT_USER_ID = 'dev-00000000-0000-4000-8000-000000000000';

export function useCurrentUserId(): string {
  return DEVELOPMENT_USER_ID;
}

export function currentUserId(): string {
  return DEVELOPMENT_USER_ID;
}
