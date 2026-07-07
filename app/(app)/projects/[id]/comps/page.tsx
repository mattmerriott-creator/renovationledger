import type { Metadata } from "next";
import { requireUser, getOwnedProject } from "@/lib/auth";
import getDb, { ManualComp, Project } from "@/lib/db";
import { getComps, zillowSearchUrl, Comp } from "@/lib/comps";
import { addComp, deleteComp } from "@/lib/actions";
import { money, dateFmt, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Comps", robots: { index: false } };

function manualToComp(c: ManualComp): Comp {
  return {
    address: c.address,
    price: c.price,
    beds: c.beds,
    baths: c.baths,
    sqft: c.sqft,
    distanceMiles: c.distance_miles,
    soldDate: c.sold_date,
    pricePerSqft: c.sqft ? Math.round(c.price / c.sqft) : 0,
    zillowUrl: zillowSearchUrl(c.address),
    manual: true,
    manualId: c.id,
  };
}

export default async function CompsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = getOwnedProject(Number(id), user.id) as Project;
  const result = await getComps(project.address, project.city, project.state, project.zip, project.property_type);

  const manualComps = getDb()
    .prepare("SELECT * FROM comps WHERE project_id = ? ORDER BY distance_miles, id")
    .all(project.id) as ManualComp[];

  const allComps: Comp[] = [...result.comps, ...manualComps.map(manualToComp)].sort(
    (a, b) => a.distanceMiles - b.distanceMiles
  );

  const avgPpsf =
    allComps.length > 0
      ? Math.round(allComps.reduce((s, c) => s + c.pricePerSqft, 0) / allComps.length)
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
          href={zillowSearchUrl(`${project.address}, ${project.city}, ${project.state} ${project.zip}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm"
        >
          Open area on Zillow ↗
        </a>
      </div>

      {!result.live && (
        <div className="card card-cream" style={{ marginBottom: 24 }}>
          <p className="small" style={{ fontWeight: 600 }}>No live comps provider connected.</p>
          <p className="small secondary">
            {result.error
              ? result.error
              : "Add the comps you know about by hand below. Or get a free RentCast API key at rentcast.io (50 lookups a month free), add RENTCAST_API_KEY=your_key to .env.local, and restart the app to pull comps automatically. Zillow retired its public comps API, so RentCast supplies the same public-record sold data."}
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
          <div className="stat-label">Average price per sqft ({allComps.length} comps)</div>
        </div>
        <div className="card card-cream">
          <div className="stat-number" style={{ fontSize: 32 }}>{money(project.arv)}</div>
          <div className="stat-label">
            Your ARV{impliedArv && project.arv ? ` · ${pct((project.arv / impliedArv) * 100 - 100)} vs. comps` : ""}
          </div>
        </div>
      </div>

      {allComps.length === 0 ? (
        <div className="empty" style={{ marginBottom: 24 }}>
          <p className="small">No comps yet. Add one below using a recent sale you know about.</p>
        </div>
      ) : (
        <div className="table-wrap card" style={{ padding: 0, marginBottom: 24 }}>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allComps.map((c, i) => (
                <tr key={`${c.address}-${i}`}>
                  <td style={{ fontWeight: 500 }}>
                    {c.address}
                    {c.manual && <span className="tag tag-outline" style={{ marginLeft: 8 }}>Manual</span>}
                  </td>
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
                  <td>
                    {c.manualId && (
                      <form action={deleteComp}>
                        <input type="hidden" name="project_id" value={project.id} />
                        <input type="hidden" name="comp_id" value={c.manualId} />
                        <button type="submit" className="btn btn-danger-ghost btn-sm" aria-label={`Delete ${c.address}`}>✕</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={addComp} className="card" style={{ maxWidth: 760 }}>
        <h3 className="h4" style={{ fontWeight: 600, marginBottom: 4 }}>Add a comp</h3>
        <p className="small secondary" style={{ marginBottom: 12 }}>
          A recent sale near the property you know about — from the MLS, Zillow, or a drive-by.
        </p>
        <input type="hidden" name="project_id" value={project.id} />
        <div className="field">
          <label htmlFor="address">Address</label>
          <input id="address" name="address" required placeholder="2208 N Boston Ct, Tulsa, OK" />
        </div>
        <div className="form-grid-3" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 16px" }}>
          <div className="field">
            <label htmlFor="price">Sold price ($)</label>
            <input id="price" name="price" inputMode="decimal" required placeholder="168000" />
          </div>
          <div className="field">
            <label htmlFor="sqft">Sqft</label>
            <input id="sqft" name="sqft" inputMode="numeric" required placeholder="1288" />
          </div>
          <div className="field">
            <label htmlFor="beds">Beds</label>
            <input id="beds" name="beds" inputMode="decimal" placeholder="3" />
          </div>
          <div className="field">
            <label htmlFor="baths">Baths</label>
            <input id="baths" name="baths" inputMode="decimal" placeholder="2" />
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="distance_miles">Distance (miles)</label>
            <input id="distance_miles" name="distance_miles" inputMode="decimal" placeholder="0.3" />
          </div>
          <div className="field">
            <label htmlFor="sold_date">Sold date</label>
            <input id="sold_date" name="sold_date" type="date" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="notes">Notes (optional)</label>
          <input id="notes" name="notes" placeholder="Same floor plan, updated kitchen" />
        </div>
        <button type="submit" className="btn btn-dark btn-sm">Add comp</button>
      </form>
    </>
  );
}
