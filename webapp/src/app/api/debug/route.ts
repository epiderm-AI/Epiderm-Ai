import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasStorageBucket: !!process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    nodeVersion: process.env.NODE_VERSION || "unknown",
    // Ne jamais exposer les vraies valeurs, juste vérifier leur présence
    supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) || "missing",
  };

  return NextResponse.json({
    message: "Environment check",
    env,
    timestamp: new Date().toISOString(),
  });
}
