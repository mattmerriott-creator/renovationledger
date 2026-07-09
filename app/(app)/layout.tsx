import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth";
import { logout } from "@/lib/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <header className="app-nav no-print">
        <div className="container nav-inner">
          <Link href="/dashboard" className="nav-logo">
            Renovation<span style={{ color: "var(--color-text-muted)" }}>Ledger</span>
          </Link>
          <nav className="nav-links" aria-label="App navigation">
            <Link href="/dashboard" className="hide-mobile">Projects</Link>
            {isAdmin(user) && <Link href="/admin/users" className="hide-mobile">Users</Link>}
            <span className="hide-mobile muted small">{user.name}</span>
            <form action={logout}>
              <button type="submit" className="btn btn-ghost btn-sm">Log out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <div className="container">{children}</div>
      </main>
    </>
  );
}
