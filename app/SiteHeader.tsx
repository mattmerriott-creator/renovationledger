import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

// Shared marketing-site header — home and /contact both use it, so the nav
// and login-state logic live in one place instead of two.
export default async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" aria-label="RenovationLedger home">
          <img src="/logo.png" alt="" width={132} height={32} style={{ display: "block" }} />
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/#features" className="hide-mobile">Features</Link>
          <Link href="/#how-it-works" className="hide-mobile">How it works</Link>
          <Link href="/#faq" className="hide-mobile">FAQ</Link>
          <Link href="/contact" className="hide-mobile">Contact</Link>
          {user ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">Open dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="hide-mobile">Log in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">Start free</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
