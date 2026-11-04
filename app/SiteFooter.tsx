import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="nav-logo" style={{ color: "#fff" }}>RenovationLedger</div>
          <p className="small muted" style={{ marginTop: 8 }}>
            Project tracking for real estate investors.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="small muted" style={{ marginBottom: 8, display: "flex", gap: 16, justifyContent: "flex-end" }}>
            <Link href="/contact" style={{ color: "inherit" }}>Contact</Link>
            <Link href="/privacy" style={{ color: "inherit" }}>Privacy</Link>
            <Link href="/terms" style={{ color: "inherit" }}>Terms</Link>
          </p>
          <p className="small muted">© {new Date().getFullYear()} MJ Property Group LLC</p>
        </div>
      </div>
    </footer>
  );
}
