"use client";

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
import { MessageSquare } from "lucide-react";

interface SlugLoginFormProps {
  slug: string;
  pwaTitle: string;
  pwaIconUrl: string | null;
}

export function SlugLoginForm({
  slug,
  pwaTitle,
  pwaIconUrl,
}: SlugLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Perform top-level window redirect so cookies update on server
    window.location.href = "/dashboard";
  };

  return (
    <Card className="w-full border-border bg-card shadow-2xl">
      <CardHeader className="items-center text-center">
        <div className="mb-3 flex items-center justify-center">
          {pwaIconUrl ? (
            <img
              src={pwaIconUrl}
              alt={pwaTitle}
              className="h-16 w-16 rounded-2xl object-cover shadow-md border border-border"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <MessageSquare className="h-7 w-7" />
            </div>
          )}
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">
          {pwaTitle}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Acesse a sua conta no CRM em{" "}
          <span className="font-semibold text-foreground">/{slug}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-muted-foreground">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-muted-foreground">
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-11 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar no CRM"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
