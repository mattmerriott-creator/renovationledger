import type { Metadata } from "next";
import { requireUser, getOwnedProject } from "@/lib/auth";
import { Project } from "@/lib/db";
import { getComps } from "@/lib/comps";
import { money, dateFmt, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Comps", robots: { index: false } };

export default async function CompsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = getOwnedProject(Number(id), user.id) as Project;
  const result = await getComps(project.address, project.city, project.state, project.zip, project.property_type);

  const avgPpsf =
    result.comps.length > 0
      ? Math.round(result.comps.reduce((s, c) => s + c.pricePerSqft, 0) / result.comps.length)
      : 0;
  const impliedArv = project.sqft > 0 && avgPpsf > 0 ? avgPpsf * project.sqft : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="h3">Sold comps near {project.address}</h2>
          <p className="small secondary">Recent solds sorted by distance. Each links to Zillow so you can verify it.</p>
        </div>
        <a
          href={`https://www.zillow.com/homes/${encodeURIComponent(`${project.address}, ${project.city}, ${project.state} ${project.zip}`)}_rb/`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm"
        >
          Open area on Zillow ↗
        </a>
      </div>

      {!result.live && (
        <div className="card card-cream" style={{ marginBottom: 24 }}>
          <p className="small" style={{ fontWeight: 600 }}>Sample data shown.</p>
          <p className="small secondary">
            {result.error
              ? result.error
              : "To pull live comps for this address, get a free API key at rentcast.io (50 lookups a month free), add RENTCAST_API_KEY=your_key to the .env.local file, and restart the app. Zillow retired its public comps API, so RentCast supplies the same public-record sold data. Every comp still links to Zillow for verification."}
          </p>
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card card-dark">
          <div className="stat-number" style={{ fontSize: 32 }}>
            {result.estimatedValue ? money(result.estimatedValue) : impliedArv ? money(impliedArv) : "—"}
          </div>
          <div className="stat-label">
            {result.estimatedValue ? "Estimated value (AVM)" : `Implied value at ${money(avgPpsf)}/sqft × ${project.sqft || "?"} sqft`}
          </div>
        </div>
        <div className="card card-cream">
          <div className="stat-number" style={{ fontSize: 32 }}>{money(avgPpsf)}</div>
          <div className="stat-label">Average price per sqft ({result.comps.length} comps)</div>
        </div>
        <div className="card card-cream">
          <div className="stat-number" style={{ fontSize: 32 }}>{money(project.arv)}</div>
          <div className="stat-label">
            Your ARV{impliedArv && project.arv ? ` · ${pct((project.arv / impliedArv) * 100 - 100)} vs. comps` : ""}
          </div>
        </div>
      </div>

      <div className="table-wrap card" style={{ padding: 0 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Address</th>
              <th className="num">Sold price</th>
              <th className="num">$/sqft</th>
              <th className="num">Beds</th>
              <th className="num">Baths</th>
              <th className="num">Sqft</th>
              <th className="num">Distance</th>
              <th>Sold</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {result.comps.map((c) => (
              <tr key={c.address}>
                <td style={{ fontWeight: 500 }}>{c.address}</td>
                <td className="num">{money(c.price)}</td>
                <td className="num">{money(c.pricePerSqft)}</td>
                <td className="num">{c.beds}</td>
                <td className="num">{c.baths}</td>
                <td className="num">{c.sqft.toLocaleString()}</td>
                <td className="num">{c.distanceMiles} mi</td>
                <td style={{ whiteSpace: "nowrap" }}>{dateFmt(c.soldDate)}</td>
                <td>
                  <a href={c.zillowUrl} target="_blank" rel="noopener noreferrer" className="icon-cta" aria-label={`View ${c.address} on Zillow`}>↗</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
