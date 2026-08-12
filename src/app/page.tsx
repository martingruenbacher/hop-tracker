"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    let supabase;
    try {
      supabase = createClient();
    } catch {
      setError("Supabase is not configured yet. See the setup instructions below.");
      setLoading(false);
      return;
    }
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email to confirm your account!");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        window.location.href = "/dashboard";
      }
    }

    setLoading(false);
  }

  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your_supabase_anon_key";

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-amber-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {!isSupabaseConfigured && (
          <div className="mb-4 p-4 bg-yellow-900/60 border border-yellow-600 rounded-lg text-sm text-yellow-200 space-y-2">
            <p className="font-semibold">⚙️ Setup required</p>
            <ol className="list-decimal list-inside space-y-1 text-yellow-300">
              <li>Create a free project at <strong>supabase.com</strong></li>
              <li>Run <strong>supabase-schema.sql</strong> in the SQL editor</li>
              <li>Copy your Project URL + anon key into <strong>.env.local</strong></li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        )}
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">🍺</div>
          <h1 className="text-4xl font-bold text-amber-100 tracking-tight">
            Hop Tracker
          </h1>
          <p className="text-amber-300 mt-1 text-sm">
            Czech Republic Boys Trip 2026
          </p>
          <div className="flex justify-center gap-4 mt-3 text-xl">
            <span title="Český Krumlov">🛶</span>
            <span title="České Budějovice">🏭</span>
            <span title="Prague">🏰</span>
          </div>
        </div>

        <Card className="bg-amber-950/60 border-amber-800 text-amber-100">
          <CardHeader>
            <CardTitle className="text-amber-100">
              {mode === "login" ? "Welcome back" : "Join the trip"}
            </CardTitle>
            <CardDescription className="text-amber-400">
              {mode === "login"
                ? "Sign in to see the leaderboard"
                : "Create your account to start logging beers"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-amber-200">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="bg-amber-900/50 border-amber-700 text-amber-100 placeholder:text-amber-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-amber-200">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-amber-900/50 border-amber-700 text-amber-100 placeholder:text-amber-600"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-950/30 p-2 rounded">
                  {error}
                </p>
              )}
              {message && (
                <p className="text-green-400 text-sm bg-green-950/30 p-2 rounded">
                  {message}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              >
                {loading
                  ? "Loading..."
                  : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                  setMessage("");
                }}
                className="text-amber-400 hover:text-amber-300 text-sm underline"
              >
                {mode === "login"
                  ? "No account yet? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
