// Comparable sales by proximity to the project address.
//
// Zillow retired its public comps API, so live data comes from RentCast
// (rentcast.io), which pulls the same public-record/MLS sold comps by
// distance from the subject address. Free tier: 50 requests/month.
//
// Setup: put RENTCAST_API_KEY=xxx in .env.local and restart the server.
// Without a key, sample comps are returned and flagged so the UI can say so.

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
};

export type CompsResult = {
  live: boolean;
  estimatedValue: number | null;
  comps: Comp[];
  error?: string;
};

function zillowSearchUrl(address: string) {
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
    return { live: false, estimatedValue: null, comps: sampleComps(city, state) };
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
        comps: sampleComps(city, state),
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
      comps: sampleComps(city, state),
      error: "Could not reach the comps provider.",
    };
  }
}

// Sample data shown until an API key is configured. Clearly labeled in the UI.
function sampleComps(city: string, state: string): Comp[] {
  const c = city || "Tulsa";
  const s = state || "OK";
  const rows = [
    { street: "1412 E Marshall Pl", price: 168000, beds: 3, baths: 2, sqft: 1288, dist: 0.21, sold: "2026-04-18" },
    { street: "2208 N Boston Ct", price: 154500, beds: 3, baths: 1, sqft: 1150, dist: 0.34, sold: "2026-05-02" },
    { street: "1731 E Reading St", price: 181000, beds: 3, baths: 2, sqft: 1402, dist: 0.48, sold: "2026-03-27" },
    { street: "2515 N Gary Ave", price: 145000, beds: 2, baths: 1, sqft: 980, dist: 0.62, sold: "2026-05-21" },
    { street: "1846 E Latimer St", price: 172500, beds: 3, baths: 2, sqft: 1315, dist: 0.77, sold: "2026-02-14" },
    { street: "3010 N Delaware Pl", price: 189900, beds: 4, baths: 2, sqft: 1560, dist: 0.91, sold: "2026-04-03" },
  ];
  return rows.map((r) => {
    const address = `${r.street}, ${c}, ${s}`;
    return {
      address,
      price: r.price,
      beds: r.beds,
      baths: r.baths,
      sqft: r.sqft,
      distanceMiles: r.dist,
      soldDate: r.sold,
      pricePerSqft: Math.round(r.price / r.sqft),
      zillowUrl: zillowSearchUrl(address),
    };
  });
}
