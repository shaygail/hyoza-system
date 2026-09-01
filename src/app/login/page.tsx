"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Cloud } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/app/dashboard",
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. If this is a fresh install, run: npm run db:setup");
      return;
    }

    if (result?.ok) {
      // Full page navigation ensures the session cookie is picked up by middleware
      window.location.href = "/app/dashboard";
    } else {
      setError("Sign in failed. Please try again.");
    }
  }

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@ourcloud.local"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-700">Demo accounts (click to fill)</p>
          <button
            type="button"
            className="mt-1 block text-left hover:text-ourcloud-600"
            onClick={() => { setEmail("agent@ourcloud.local"); setPassword("agent123"); }}
          >
            agent@ourcloud.local / agent123
          </button>
          <button
            type="button"
            className="block text-left hover:text-ourcloud-600"
            onClick={() => { setEmail("admin@ourcloud.local"); setPassword("admin123"); }}
          >
            admin@ourcloud.local / admin123
          </button>
          <p className="mt-2 text-slate-400">First time? Run <code className="bg-slate-200 px-1 rounded">npm run db:setup</code></p>
        </div>
      </div>
    </div>
  );
}
