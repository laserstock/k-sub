import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Semi-static exit data — allow Next fetch cache / revalidate (not no-store). */
const REVALIDATE_SECONDS = 3600;

function cachedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    next: { revalidate: REVALIDATE_SECONDS, tags: ["subway-exits"] },
  });
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
      global: { fetch: cachedFetch },
    });
  }

  return client;
}

export { REVALIDATE_SECONDS };
