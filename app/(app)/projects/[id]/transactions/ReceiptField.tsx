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
    if (!el || !value) return;
    // Set via the native setter and dispatch a real input event — plain
    // `el.value = value` doesn't trigger React's onChange, so state that
    // depends on this field (e.g. the line-item running total) won't update.
    const proto = el instanceof HTMLSelectElement ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter ? setter.call(el, value) : (el.value = value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
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
      setField("tx_date", data.date || "");
      // Fills the first line item. If the receipt has multiple categories,
      // add the rest as additional line items after reviewing this one.
      setField("item_amount_0", data.amount ? String(data.amount) : "");
      setField("item_description_0", data.description || "");
      if (data.category && categories.includes(data.category)) {
        setField("item_category_0", data.category);
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
