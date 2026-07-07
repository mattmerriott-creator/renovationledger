"use client";

import { useRef, useState } from "react";

// File input + scan button inside the "Log a transaction" form.
// Scanning posts the receipt to /api/scan-receipt and fills the form fields;
// the file itself is submitted with the form and stored with the transaction.
export default function ReceiptField({ categories }: { categories: string[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>("");
  const [scanning, setScanning] = useState(false);

  function setField(id: string, value: string) {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (el && value) el.value = value;
  }

  async function scan() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setStatus("Choose a receipt photo first.");
      return;
    }
    setScanning(true);
    setStatus("Reading the receipt…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("categories", categories.join("|"));
      const res = await fetch("/api/scan-receipt", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus(data.error || "Scan failed. Enter it by hand.");
        return;
      }
      if (data.available === false) {
        setStatus(data.message);
        return;
      }
      setField("vendor", data.vendor || "");
      setField("amount", data.amount ? String(data.amount) : "");
      setField("tx_date", data.date || "");
      setField("description", data.description || "");
      if (data.category && categories.includes(data.category)) {
        setField("category", data.category);
      }
      setStatus(
        data.confident
          ? "Done. Check the fields, then add the transaction."
          : "Read it, but the image was hard to make out. Double-check every field."
      );
    } catch {
      setStatus("Scan failed. Enter it by hand.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="field">
      <label htmlFor="receipt">Receipt photo or PDF</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          ref={inputRef}
          id="receipt"
          name="receipt"
          type="file"
          accept="image/*,.pdf"
          style={{ flex: 1, minWidth: 200 }}
        />
        <button type="button" className="btn btn-dark btn-sm" onClick={scan} disabled={scanning}>
          {scanning ? "Scanning…" : "Scan receipt"}
        </button>
      </div>
      {status && <p className="small secondary" style={{ marginTop: 6 }}>{status}</p>}
    </div>
  );
}
