import type { Metadata } from "next";
import { SignIn } from "@/components/sign-in";
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true } };
export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const params = await searchParams; return <SignIn authError={typeof params.error === "string" ? params.error : undefined} />; }
