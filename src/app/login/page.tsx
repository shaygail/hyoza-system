"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Cloud } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ourcloud-50 to-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ourcloud-600 text-white">
            <Cloud className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">OurCloud Service Desk</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to the agent console</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              placeholder="agent@ourcloud.local"
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

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-700">Demo accounts</p>
          <p>agent@ourcloud.local / agent123</p>
          <p>admin@ourcloud.local / admin123</p>
          <p className="mt-2">
            Customer?{" "}
            <a href="/portal/login" className="font-medium text-ourcloud-700 hover:underline">
              Sign in to the support portal
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
