// Comparable sales by proximity to the project address.
//
// Zillow retired its public comps API, so live data comes from RentCast
// (rentcast.io), which pulls the same public-record/MLS sold comps by
// distance from the subject address. Free tier: 50 requests/month.
//
// Setup: put RENTCAST_API_KEY=xxx in .env.local and restart the server.
// Without a key, no automated comps are pulled — the comps page lets the
// user add their own manually instead (see lib/actions.ts addComp).

export type Comp = {
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  distanceMiles: number;
  soldDate: string;
  pricePerSqft: number;
  zillowUrl: string;
  manual?: boolean;
  manualId?: number;
};

export type CompsResult = {
  live: boolean;
  estimatedValue: number | null;
  comps: Comp[];
  error?: string;
};

export function zillowSearchUrl(address: string) {
  return `https://www.zillow.com/homes/${encodeURIComponent(address)}_rb/`;
}

export async function getComps(
  address: string,
  city: string,
  state: string,
  zip: string,
  propertyType: string
): Promise<CompsResult> {
  const key = process.env.RENTCAST_API_KEY;
  const fullAddress = `${address}, ${city}, ${state} ${zip}`;

  if (!key) {
    return { live: false, estimatedValue: null, comps: [] };
  }

  try {
    const rcType = propertyType === "multi_family" ? "Multi-Family" : "Single Family";
    const url =
      `https://api.rentcast.io/v1/avm/value?address=${encodeURIComponent(fullAddress)}` +
      `&propertyType=${encodeURIComponent(rcType)}&compCount=10`;
    const res = await fetch(url, {
      headers: { "X-Api-Key": key, Accept: "application/json" },
      next: { revalidate: 86400 }, // cache 24h to conserve API quota
    });
    if (!res.ok) {
      return {
        live: false,
        estimatedValue: null,
        comps: [],
        error: `RentCast returned ${res.status}. Check the API key and address.`,
      };
    }
    const data = await res.json();
    const comps: Comp[] = (data.comparables || []).map((c: Record<string, unknown>) => {
      const addr = String(c.formattedAddress || "");
      const price = Number(c.price) || 0;
      const sqft = Number(c.squareFootage) || 0;
      return {
        address: addr,
        price,
        beds: Number(c.bedrooms) || 0,
        baths: Number(c.bathrooms) || 0,
        sqft,
        distanceMiles: Math.round((Number(c.distance) || 0) * 100) / 100,
        soldDate: String(c.removedDate || c.listedDate || "").slice(0, 10),
        pricePerSqft: sqft ? Math.round(price / sqft) : 0,
        zillowUrl: zillowSearchUrl(addr),
      };
    });
    comps.sort((a, b) => a.distanceMiles - b.distanceMiles);
    return { live: true, estimatedValue: Number(data.price) || null, comps };
  } catch {
    return {
      live: false,
      estimatedValue: null,
      comps: [],
      error: "Could not reach the comps provider.",
    };
  }
}
