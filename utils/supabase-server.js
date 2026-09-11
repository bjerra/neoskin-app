import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function CreateServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Helper to get current user/session server-side.
// NOTE: this only decodes the cookie, it does not verify the signature.
// Fine for rendering hints (e.g. showing an email in the header), never for
// authorization. Use requireUser() to gate anything that mutates data.
export async function getSession() {
  const supabase = await CreateServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Verified auth check for Server Actions.
 *
 * Server Actions are POST endpoints whose IDs ship in the client bundle, so
 * they are reachable without ever passing through middleware. Every action
 * that reads or writes Shopify data must call this first.
 *
 * getUser() revalidates the token against the Auth server rather than trusting
 * the cookie. Once the project is migrated to asymmetric (ECC) JWT signing
 * keys this can become `supabase.auth.getClaims()`, which verifies locally
 * against a cached JWKS and costs no network or database IO.
 *
 * @returns {Promise<import('@supabase/supabase-js').User>}
 * @throws {Error} if there is no valid session
 */
export async function requireUser() {
  const supabase = await CreateServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user;
}