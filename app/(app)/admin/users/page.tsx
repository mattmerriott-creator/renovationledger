import type { Metadata } from "next";
import getDb from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { dateFmt } from "@/lib/format";

export const metadata: Metadata = { title: "Users", robots: { index: false } };

type UserRow = {
  id: number;
  email: string;
  name: string;
  plan: string;
  created_at: string;
  project_count: number;
};

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, u.plan, u.created_at, COUNT(p.id) as project_count
       FROM users u
       LEFT JOIN projects p ON p.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    .all() as UserRow[];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="overline">Admin</div>
          <h1 className="h2">Users</h1>
          <p className="small secondary" style={{ marginTop: 8 }}>
            {users.length} account{users.length === 1 ? "" : "s"} ·{" "}
            <a href="/api/admin/export/users" style={{ fontWeight: 600, textDecoration: "underline" }}>
              Download CSV
            </a>
          </p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="empty">
          <p className="small">No accounts yet.</p>
        </div>
      ) : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Plan</th>
                <th className="num">Projects</th>
                <th>Signed up</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.email}</td>
                  <td>{u.name}</td>
                  <td>
                    <span className={u.plan === "free" ? "tag tag-outline" : "tag tag-accent"}>{u.plan}</span>
                  </td>
                  <td className="num">{u.project_count}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{dateFmt(u.created_at.slice(0, 10))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
