import type { Metadata } from "next";
import Link from "next/link";
import { signup } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Create your free account",
  description: "Create a free RenovationLedger account and start tracking your first rehab or new build project in under five minutes.",
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Link href="/" aria-label="RenovationLedger home" style={{ display: "block", marginBottom: 24 }}>
          <img src="/logo.png" alt="" width={132} height={32} style={{ display: "block" }} />
        </Link>
        <div className="card">
          <h1 className="h3" style={{ marginBottom: 4 }}>Create your account</h1>
          <p className="small secondary" style={{ marginBottom: 20 }}>Free while in early access.</p>
          {error && <div className="form-error">{error}</div>}
          <form action={signup}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" required autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
              <p className="small muted" style={{ marginTop: 4 }}>At least 8 characters.</p>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Create account
            </button>
          </form>
        </div>
        <p className="small secondary" style={{ marginTop: 16 }}>
          Already have an account? <Link href="/login" style={{ fontWeight: 600 }}>Log in</Link>
        </p>
      </div>
    </main>
  );
}
