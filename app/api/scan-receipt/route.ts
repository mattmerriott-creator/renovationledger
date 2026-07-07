import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES } from "@/lib/files";

// Reads a receipt image and returns vendor/date/amount/description plus a
// suggested budget category. Requires ANTHROPIC_API_KEY in .env.local; without
// it the endpoint reports unavailable and the form is filled in by hand.

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      available: false,
      message:
        "Receipt scanning is not set up. Add ANTHROPIC_API_KEY to .env.local and restart the app. The receipt still attaches to the transaction.",
    });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const categories = String(formData.get("categories") ?? "").split("|").filter(Boolean);

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large (15 MB max)" }, { status: 400 });
  }

  const mediaType = file.type;
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const fileBlock =
    mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 },
        }
      : IMAGE_TYPES.has(mediaType)
        ? {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: base64,
            },
          }
        : null;

  if (!fileBlock) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPG, PNG, WebP, GIF, or PDF." },
      { status: 400 }
    );
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              vendor: { type: "string", description: "Business name on the receipt" },
              date: { type: "string", description: "Receipt date as YYYY-MM-DD, empty string if unreadable" },
              amount: { type: "number", description: "Grand total including tax" },
              description: { type: "string", description: "Short summary of what was purchased, under 12 words" },
              category: {
                type: "string",
                description: "Best matching rehab budget category from the provided list, empty string if none fits",
              },
              confident: { type: "boolean", description: "False if the image is too blurry or cut off to read reliably" },
            },
            required: ["vendor", "date", "amount", "description", "category", "confident"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text:
                `Read this receipt for a real estate rehab project bookkeeping entry. ` +
                `Extract the vendor, date, grand total, and a short description of the purchase. ` +
                `Pick the best matching budget category from this list (or empty string if none fits): ` +
                `${categories.join(", ") || "none provided"}.`,
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ available: true, error: "Could not read this receipt. Enter it by hand." });
    }
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ available: true, error: "No data extracted. Enter it by hand." });
    }
    const data = JSON.parse(text.text);
    return NextResponse.json({ available: true, ...data });
  } catch (err) {
    const message =
      err instanceof Anthropic.AuthenticationError
        ? "The ANTHROPIC_API_KEY in .env.local is invalid."
        : err instanceof Anthropic.RateLimitError
          ? "Rate limited. Wait a minute and try again."
          : "Scan failed. Enter the transaction by hand.";
    return NextResponse.json({ available: true, error: message });
  }
}
