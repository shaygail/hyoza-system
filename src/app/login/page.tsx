"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Cloud } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-[400px] rounded-[4px] bg-white px-10 py-8 shadow-overlay">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-ourcloud-600 text-white">
              <Cloud className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="text-2xl font-semibold text-slate-600">HYOZA</span>
          </div>
          <h1 className="mt-6 text-base font-semibold text-slate-900">Log in to continue</h1>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              placeholder="Enter your email"
              className="h-10"
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
              placeholder="Enter password"
              className="h-10"
              required
            />
          </div>

          {state?.error && (
            <p className="rounded-[3px] bg-[#ffecec] px-3 py-2 text-sm text-[#ae2e24]">{state.error}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Logging in…" : "Continue"}
          </Button>
        </form>

        <div className="mt-6 rounded-[3px] bg-slate-100 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-900">Demo accounts</p>
          <p className="mt-1">agent@ourcloud.local / agent123</p>
          <p>admin@ourcloud.local / admin123</p>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-sm">
          <a href="/support" className="text-ourcloud-700 hover:underline">
            Customer? Go to the support portal
          </a>
        </div>
      </div>
      <p className="mt-6 text-xs text-slate-500">HYOZA System · IT service management</p>
    </div>
  );
}
