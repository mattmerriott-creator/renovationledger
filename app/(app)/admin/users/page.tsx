import type { Metadata } from "next";
import getDb from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateUserPlan } from "@/lib/actions";
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
                    {/* Keyed on plan: React resets an uncontrolled form's
                        fields to their original defaultValue once its action
                        completes, so without this the dropdown snaps back to
                        the old plan right after a successful save. Keying it
                        on the value that just changed forces a remount with
                        the new one instead. */}
                    <form
                      key={u.plan}
                      action={updateUserPlan}
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <input type="hidden" name="user_id" value={u.id} />
                      <select
                        name="plan"
                        defaultValue={u.plan}
                        style={{ width: "auto", padding: "4px 8px", fontSize: 13 }}
                      >
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                      </select>
                      <button type="submit" className="btn btn-outline btn-sm">Save</button>
                    </form>
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
