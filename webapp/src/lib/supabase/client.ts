import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const envMissing = !supabaseUrl || !supabaseAnonKey;
const missingError = { message: "Missing Supabase public env vars." };

const missingQuery = {
  select: () => missingQuery,
  insert: () => missingQuery,
  update: () => missingQuery,
  upsert: () => missingQuery,
  delete: () => missingQuery,
  eq: () => missingQuery,
  order: () => missingQuery,
  limit: () => missingQuery,
  maybeSingle: () => Promise.resolve({ data: null, error: missingError }),
  single: () => Promise.resolve({ data: null, error: missingError }),
  then: (resolve: (value: unknown) => void) =>
    Promise.resolve({ data: null, error: missingError }).then(resolve),
};

const missingStorageBucket = {
  upload: () => Promise.resolve({ data: null, error: missingError }),
  remove: () => Promise.resolve({ data: null, error: missingError }),
  createSignedUrl: () => Promise.resolve({ data: null, error: missingError }),
};

const missingClient = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: missingError }),
    getUser: () => Promise.resolve({ data: { user: null }, error: missingError }),
    signInWithOtp: () => Promise.resolve({ data: null, error: missingError }),
    signInWithPassword: () => Promise.resolve({ data: null, error: missingError }),
    signUp: () => Promise.resolve({ data: null, error: missingError }),
    signOut: () => Promise.resolve({ data: null, error: missingError }),
  },
  from: () => missingQuery,
  storage: {
    from: () => missingStorageBucket,
  },
};

const safeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    return await fetch(input, init);
  } catch {
    return new Response(null, { status: 503, statusText: "Network error" });
  }
};

export const supabaseBrowser = envMissing
  ? (missingClient as ReturnType<typeof createBrowserClient>)
  : createBrowserClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: safeFetch },
    });

export const supabaseEnvMissing = envMissing;
