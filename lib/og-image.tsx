import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

// Shared by app/opengraph-image.tsx and app/twitter-image.tsx so the social
// card is identical on every platform and only defined once.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "RenovationLedger — Track. Manage. Profit.";

export default function SocialImage() {
  const logoData = readFileSync(join(process.cwd(), "public/logo.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1e18",
        }}
      >
        <div
          style={{
            display: "flex",
            background: "#ffffff",
            borderRadius: 24,
            padding: "40px 56px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={760} height={253} alt="" />
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 34,
            fontWeight: 600,
            color: "#c8e645",
          }}
        >
          Rehab &amp; New Build Project Tracking
        </div>
      </div>
    ),
    { ...size }
  );
}
