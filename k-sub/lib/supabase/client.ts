import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Always hit Supabase fresh — avoid Next.js caching stale exit rows. */
function noStoreFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, { ...init, cache: "no-store" });
}

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase 환경 변수가 없습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정하세요.",
    );
  }

  if (!client) {
    client = createClient(url, anonKey, {
      global: { fetch: noStoreFetch },
    });
  }

  return client;
}
