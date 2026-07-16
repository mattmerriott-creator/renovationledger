import type { Metadata } from "next";
import { submitContactForm } from "@/lib/actions";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions, feedback, or an improvement suggestion for RenovationLedger? Send it straight to the team.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main>
        <div className="container" style={{ maxWidth: 560, padding: "48px 24px" }}>
          <div className="overline">Contact</div>
          <h1 className="h2" style={{ margin: "8px 0 8px" }}>Get in touch</h1>
          <p className="small secondary" style={{ marginBottom: 24 }}>
            Questions, bugs, or an idea for how this should work better — it goes straight to the team.
          </p>
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">Message sent. Thanks — we&apos;ll get back to you.</div>}
          <form action={submitContactForm} className="card">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" required placeholder="Jane Investor" />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required placeholder="jane@example.com" />
            </div>
            <div className="field">
              <label htmlFor="category">What&apos;s this about?</label>
              <select id="category" name="category" defaultValue="general">
                <option value="general">General</option>
                <option value="improvement">Improvement suggestion</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="comment">Message</label>
              <textarea id="comment" name="comment" required rows={6} placeholder="What's on your mind?" />
            </div>
            <button type="submit" className="btn btn-primary">Send message</button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
