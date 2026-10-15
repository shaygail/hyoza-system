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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-[400px] rounded-[4px] bg-white px-10 py-8 shadow-overlay">
        <div className="mb-8 flex flex-col items-center text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenantName} className="mb-4 h-12 w-auto" />
          ) : (
            <div
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-[4px] text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Cloud className="h-7 w-7" />
            </div>
          )}
          <h1 className="text-lg font-semibold text-slate-900">
            {tenantName} {portalTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600">Log in to view your requests and get help</p>
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
            className="h-10 w-full text-white hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
            disabled={pending}
          >
            {pending ? "Logging in…" : "Continue"}
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
