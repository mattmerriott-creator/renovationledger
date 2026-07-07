import { Project } from "@/lib/db";

// Shared form fields for creating and editing a project.
// Wrap in a <form action={...}> in the page that uses it.
export default function ProjectFormFields({ project }: { project?: Project }) {
  const p = project;
  return (
    <>
      <div className="field">
        <label htmlFor="name">Project name</label>
        <input id="name" name="name" required defaultValue={p?.name} placeholder="Marshall Pl Flip" />
      </div>
      <div className="field">
        <label htmlFor="address">Street address</label>
        <input id="address" name="address" required defaultValue={p?.address} placeholder="1412 E Marshall Pl" />
      </div>
      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="city">City</label>
          <input id="city" name="city" defaultValue={p?.city} placeholder="Tulsa" />
        </div>
        <div className="field">
          <label htmlFor="state">State</label>
          <input id="state" name="state" maxLength={2} defaultValue={p?.state} placeholder="OK" />
        </div>
        <div className="field">
          <label htmlFor="zip">Zip</label>
          <input id="zip" name="zip" defaultValue={p?.zip} placeholder="74106" />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="property_type">Property type</label>
          <select id="property_type" name="property_type" defaultValue={p?.property_type ?? "single_family"}>
            <option value="single_family">Single family</option>
            <option value="multi_family">Multi family</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="strategy">Project type</label>
          <select id="strategy" name="strategy" defaultValue={p?.strategy ?? "rehab"}>
            <option value="rehab">Rehab</option>
            <option value="new_build">New build</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={p?.status ?? "planning"}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="complete">Complete</option>
            <option value="sold">Sold / Closed</option>
          </select>
        </div>
      </div>
      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="purchase_price">Purchase price ($)</label>
          <input id="purchase_price" name="purchase_price" inputMode="decimal" defaultValue={p?.purchase_price || ""} placeholder="85000" />
        </div>
        <div className="field">
          <label htmlFor="arv">ARV ($)</label>
          <input id="arv" name="arv" inputMode="decimal" defaultValue={p?.arv || ""} placeholder="185000" />
        </div>
        <div className="field">
          <label htmlFor="loan_amount">Loan amount ($)</label>
          <input id="loan_amount" name="loan_amount" inputMode="decimal" defaultValue={p?.loan_amount || ""} placeholder="120000" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="lender_name">Lender</label>
        <input id="lender_name" name="lender_name" defaultValue={p?.lender_name} placeholder="First Bank of Tulsa" />
      </div>
      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="units">Units</label>
          <input id="units" name="units" inputMode="numeric" defaultValue={p?.units ?? 1} />
        </div>
        <div className="field">
          <label htmlFor="beds">Beds</label>
          <input id="beds" name="beds" inputMode="decimal" defaultValue={p?.beds || ""} placeholder="3" />
        </div>
        <div className="field">
          <label htmlFor="baths">Baths</label>
          <input id="baths" name="baths" inputMode="decimal" defaultValue={p?.baths || ""} placeholder="2" />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="sqft">Square feet</label>
          <input id="sqft" name="sqft" inputMode="numeric" defaultValue={p?.sqft || ""} placeholder="1250" />
        </div>
        <div className="field">
          <label htmlFor="start_date">Start date</label>
          <input id="start_date" name="start_date" type="date" defaultValue={p?.start_date} />
        </div>
        <div className="field">
          <label htmlFor="target_end_date">Target finish</label>
          <input id="target_end_date" name="target_end_date" type="date" defaultValue={p?.target_end_date} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={p?.notes} />
      </div>
    </>
  );
}
