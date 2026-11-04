import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requireUser, canUseApi, listApiKeys } from "@/lib/auth";
import { generateApiKey, deleteApiKey } from "@/lib/actions";
import { dateFmt } from "@/lib/format";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireUser();
  const store = await cookies();
  const newKey = store.get("bl_new_api_key")?.value;
  const hasApiAccess = canUseApi(user);
  const keys = hasApiAccess ? listApiKeys(user.id) : [];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="overline">Account</div>
          <h1 className="h2">Settings</h1>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 680 }}>
        <h2 className="h4" style={{ fontWeight: 600, marginBottom: 4 }}>API access</h2>
        <p className="small secondary" style={{ marginBottom: 20 }}>
          Connect an LLM or your own tools to your RenovationLedger data over a REST API.
        </p>

        {!hasApiAccess ? (
          <div className="empty">
            <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>
              API access is a paid-plan feature.
            </p>
            <p className="small">Upgrade your account to generate API keys and connect an LLM.</p>
          </div>
        ) : (
          <>
            {error && <div className="form-error">{error}</div>}
            {newKey && (
              <div className="form-success">
                <p style={{ marginBottom: 8 }}>Your new API key — copy it now, it won&apos;t be shown again:</p>
                <code
                  style={{
                    display: "block",
                    padding: "10px 12px",
                    background: "var(--color-white)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    fontWeight: 400,
                    wordBreak: "break-all",
                  }}
                >
                  {newKey}
                </code>
              </div>
            )}

            <form action={generateApiKey} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 24 }}>
              <div className="field" style={{ margin: 0, flex: 1 }}>
                <label htmlFor="name">Key name</label>
                <input id="name" name="name" placeholder="e.g. Claude, Zapier" />
              </div>
              <button type="submit" className="btn btn-primary">Generate key</button>
            </form>

            {keys.length === 0 ? (
              <p className="small muted" style={{ marginBottom: 24 }}>No API keys yet.</p>
            ) : (
              <div className="table-wrap" style={{ marginBottom: 24 }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Key</th>
                      <th>Created</th>
                      <th>Last used</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k.id}>
                        <td>{k.name}</td>
                        <td><code>{k.key_prefix}…</code></td>
                        <td style={{ whiteSpace: "nowrap" }}>{dateFmt(k.created_at.slice(0, 10))}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {k.last_used_at ? dateFmt(k.last_used_at.slice(0, 10)) : "Never"}
                        </td>
                        <td>
                          <form action={deleteApiKey}>
                            <input type="hidden" name="key_id" value={k.id} />
                            <button type="submit" className="btn btn-danger-ghost btn-sm">Revoke</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <details>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>How to connect</summary>
              <div style={{ marginTop: 12 }}>
                <p className="small secondary" style={{ marginBottom: 8 }}>
                  Send the key as a bearer token on every request:
                </p>
                <pre
                  className="small"
                  style={{
                    background: "var(--color-cream-alt)",
                    padding: 12,
                    borderRadius: "var(--radius-md)",
                    overflowX: "auto",
                  }}
                >
{`curl https://yourdomain.com/api/v1/projects \\
  -H "Authorization: Bearer rl_live_..."`}
                </pre>
                <p className="small secondary" style={{ marginTop: 12 }}>
                  Available endpoints:
                </p>
                <ul className="small secondary" style={{ paddingLeft: 20, marginTop: 4 }}>
                  <li><code>GET/POST /api/v1/projects</code></li>
                  <li><code>GET/PATCH /api/v1/projects/:id</code></li>
                  <li><code>GET/POST /api/v1/projects/:id/budget</code> (POST accepts <code>parent_id</code> to create a sub-item)</li>
                  <li><code>PATCH/DELETE /api/v1/projects/:id/budget/:itemId</code> (PATCH accepts <code>parent_id</code>, or <code>null</code> to un-nest)</li>
                  <li><code>GET/POST /api/v1/projects/:id/transactions</code></li>
                </ul>
                <p className="small muted" style={{ marginTop: 8 }}>
                  A sub-item&apos;s parent must be an existing top-level item in the same project — nesting is one level deep, so an item that already has its own sub-items can&apos;t be nested under another one.
                </p>
                <p className="small muted" style={{ marginTop: 8 }}>
                  Project deletion isn&apos;t exposed via the API — that stays in the app itself.
                </p>
              </div>
            </details>
          </>
        )}
      </div>
    </>
  );
}
