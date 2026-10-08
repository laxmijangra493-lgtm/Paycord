import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (!code && !(tokenHash && type === "email")) {
    return NextResponse.redirect(new URL("/login?error=invalid_auth_link", request.url));
  }

  const supabase = await createServerSupabaseClient();
  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash! });

  if (result.error) {
    return NextResponse.redirect(new URL("/login?error=invalid_auth_link", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
