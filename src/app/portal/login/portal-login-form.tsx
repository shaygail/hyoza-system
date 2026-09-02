"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { portalLoginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Cloud } from "lucide-react";

interface PortalLoginProps {
  tenantName: string;
  portalTitle: string;
  logoUrl: string;
  primaryColor: string;
}

export function PortalLoginForm({ tenantName, portalTitle, logoUrl, primaryColor }: PortalLoginProps) {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/portal";
  const [state, formAction, pending] = useActionState(portalLoginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenantName} className="mb-4 h-12 w-auto" />
          ) : (
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Cloud className="h-7 w-7" />
            </div>
          )}
          <h1 className="text-xl font-semibold text-slate-900">
            {tenantName} {portalTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to view tickets and get help</p>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              placeholder="you@company.example"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button
            type="submit"
            className="w-full text-white hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
            disabled={pending}
          >
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-slate-500">
          <p>
            <Link href="/support" className="hover:underline" style={{ color: primaryColor }}>
              ← Back to support home
            </Link>
          </p>
          <p className="text-xs">
            Are you an agent?{" "}
            <Link href="/login" className="text-slate-600 hover:underline">
              Agent sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
