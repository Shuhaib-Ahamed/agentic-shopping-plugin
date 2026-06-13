import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { JunoMark } from "@/components/atoms/JunoMark";
import { ConsoleApiError } from "../api";
import { useConsoleAuth } from "../AuthContext";

export function LoginPage() {
  const auth = useConsoleAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@kapruka.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await auth.login(email, password);
      navigate("/admin");
    } catch (err) {
      if (err instanceof ConsoleApiError) {
        if (err.status === 429) setError("Too many attempts. Try again in a minute.");
        else if (err.status === 401) setError("Wrong email or password.");
        else setError("Could not sign in. Please try again.");
      } else {
        setError("Could not sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[color:var(--color-console-canvas)] px-4">
      <div className="w-full max-w-[380px] rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-7 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <JunoMark size={28} />
          <div className="leading-tight">
            <p className="font-display font-bold text-[17px] tracking-[-0.02em]">Juno Console</p>
            <p className="text-[12px] text-muted">Sign in to view the agent telemetry.</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-[12px] font-semibold text-muted">Email</span>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-muted">Password</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full"
            />
          </label>
          {error ? (
            <p className="text-[12px] text-[color:var(--color-status-err)]">{error}</p>
          ) : null}
          <Button type="submit" disabled={submitting} className="w-full mt-2">
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-[11px] text-muted text-center">
          Demo password: <code className="font-mono">kapruka-demo</code>
        </p>
      </div>
    </div>
  );
}
