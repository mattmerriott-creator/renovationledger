import type { Metadata } from "next";
import Link from "next/link";
import { login } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your RenovationLedger account.",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Link href="/" className="nav-logo" style={{ display: "block", marginBottom: 24 }}>
          Renovation<span style={{ color: "var(--color-text-muted)" }}>Ledger</span>
        </Link>
        <div className="card">
          <h1 className="h3" style={{ marginBottom: 20 }}>Log in</h1>
          {error && <div className="form-error">{error}</div>}
          <form action={login}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Log in
            </button>
          </form>
        </div>
        <p className="small secondary" style={{ marginTop: 16 }}>
          New here? <Link href="/signup" style={{ fontWeight: 600 }}>Create a free account</Link>
        </p>
      </div>
    </main>
  );
}
