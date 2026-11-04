import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that govern your use of RenovationLedger.",
};

const LAST_UPDATED = "November 4, 2026";

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <div className="container">
          <div className="report-page legal">
            <div className="overline">Legal</div>
            <h1 className="h2" style={{ margin: "8px 0 4px" }}>Terms of Use</h1>
            <p className="small muted" style={{ marginBottom: 32 }}>Last updated: {LAST_UPDATED}</p>

            <p>
              These Terms of Use (&ldquo;Terms&rdquo;) are a legal agreement between you and MJ Property Group
              LLC, a New Mexico limited liability company (&ldquo;RenovationLedger,&rdquo; &ldquo;we,&rdquo;
              &ldquo;us,&rdquo; or &ldquo;our&rdquo;), governing your access to and use of renovationledger.com and
              the RenovationLedger application (the &ldquo;Service&rdquo;). By creating an account or otherwise
              using the Service, you agree to these Terms. If you don&apos;t agree, don&apos;t use the Service.
            </p>

            <h2 className="h4">1. The Service</h2>
            <p>
              RenovationLedger is a project-tracking tool for real estate investors — rehab budgets,
              transactions, draw schedules, sold comps, photos, and lender-ready reports. RenovationLedger is
              currently offered in early access and may change, add, or remove features, and the underlying
              data model may evolve, as it matures. We&apos;ll do our best to avoid breaking changes without
              notice, but we don&apos;t guarantee the Service, or any specific feature, will remain available
              indefinitely.
            </p>

            <h2 className="h4">2. Eligibility and your account</h2>
            <ul>
              <li>You must be at least 18 years old and able to form a binding contract to use the Service.</li>
              <li>You&apos;re responsible for the accuracy of the information you provide and for keeping your login credentials and any API keys confidential.</li>
              <li>You&apos;re responsible for all activity that happens under your account, including through an API key you&apos;ve issued.</li>
              <li>Notify us promptly if you suspect unauthorized access to your account.</li>
            </ul>

            <h2 className="h4">3. Your content and data</h2>
            <p>
              You own the project, financial, and other data you enter into the Service (&ldquo;Your
              Content&rdquo;). You grant us a limited license to host, store, process, and display Your Content
              solely to provide and improve the Service to you. We don&apos;t claim ownership of Your Content, and
              we don&apos;t use it to train AI models.
            </p>
            <p>You&apos;re solely responsible for Your Content and for having the rights to use and share it through the Service.</p>

            <h2 className="h4">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose, or in a way that infringes anyone else&apos;s rights</li>
              <li>Attempt to gain unauthorized access to another user&apos;s account or data</li>
              <li>Interfere with, disrupt, or place undue load on the Service&apos;s infrastructure (including automated scraping or hammering the API outside normal use)</li>
              <li>Reverse-engineer the Service except as permitted by law</li>
              <li>Use the Service to build a directly competing product</li>
            </ul>
            <p>We may suspend or terminate accounts that violate this section.</p>

            <h2 className="h4">5. API access</h2>
            <p>
              Paid-plan accounts can generate API keys to connect their own tools, scripts, or an LLM to their
              RenovationLedger data. You&apos;re responsible for what you authorize any tool connected with your
              key to do, and for revoking a key if you no longer trust whatever holds it. We may rate-limit,
              suspend, or revoke API access that we reasonably believe is abusive, automated beyond normal use,
              or a security risk, with notice where practical.
            </p>

            <h2 className="h4">6. Third-party data and informational tools</h2>
            <p>
              Sold comps (via RentCast), receipt scanning (via Anthropic&apos;s API), and any deal-analysis
              figures the Service calculates (profit, ROI, DSCR, and similar) are provided for your
              convenience and are estimates based on the data available. They are not professional
              appraisal, legal, tax, or investment advice, and we don&apos;t guarantee their accuracy. Verify
              any figure before relying on it for a financial decision, a lender submission, or a report you
              share with a third party.
            </p>

            <h2 className="h4">7. Fees and plans</h2>
            <p>
              RenovationLedger is currently free during early access. Certain features (including API access)
              may be limited to a paid plan; today, paid-plan access is granted manually, without a payment
              processor in place. If and when we introduce paid billing, we&apos;ll post separate pricing and
              payment terms, and they&apos;ll apply going forward from the date they take effect.
            </p>

            <h2 className="h4">8. Disclaimer of warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE,&rdquo; WITHOUT WARRANTIES OF ANY
              KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT. WE DON&apos;T WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR
              SECURE, OR THAT ANY DATA WILL NEVER BE LOST.
            </p>

            <h2 className="h4">9. Limitation of liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, RENOVATIONLEDGER AND MJ PROPERTY GROUP LLC WILL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
              PROFITS, REVENUE, OR DATA, ARISING FROM YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE
              POSSIBILITY. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THE SERVICE WILL NOT EXCEED THE
              GREATER OF $100 OR THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM AROSE.
            </p>

            <h2 className="h4">10. Indemnification</h2>
            <p>
              You agree to indemnify and hold RenovationLedger and MJ Property Group LLC harmless from any
              claims, damages, or expenses (including reasonable attorneys&apos; fees) arising from Your Content,
              your use of the Service, or your violation of these Terms.
            </p>

            <h2 className="h4">11. Termination</h2>
            <p>
              You may stop using the Service and delete your account at any time by contacting us. We may
              suspend or terminate your access if you violate these Terms, or discontinue the Service (or any
              part of it) with reasonable notice where practical.
            </p>

            <h2 className="h4">12. Governing law</h2>
            <p>
              These Terms are governed by the laws of the State of New Mexico, without regard to its conflict
              of law principles. Any dispute arising from these Terms or the Service will be brought in the
              state or federal courts located in New Mexico, and you consent to their jurisdiction.
            </p>

            <h2 className="h4">13. Changes to these Terms</h2>
            <p>We may update these Terms from time to time. We&apos;ll update the &ldquo;Last updated&rdquo; date above, and continued use of the Service after a change means you accept the updated Terms.</p>

            <h2 className="h4">14. Contact us</h2>
            <p>
              Questions about these Terms? Email us at matt@631Digital.com or use our{" "}
              <Link href="/contact" style={{ fontWeight: 600, textDecoration: "underline" }}>Contact page</Link>.
              See also our{" "}
              <Link href="/privacy" style={{ fontWeight: 600, textDecoration: "underline" }}>Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
