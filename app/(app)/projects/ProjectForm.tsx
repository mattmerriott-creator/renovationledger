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

      <h3 className="small" style={{ fontWeight: 600, margin: "20px 0 4px" }}>Loan & purchase costs</h3>
      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="loan_type">Loan type</label>
          <select id="loan_type" name="loan_type" defaultValue={p?.loan_type ?? ""}>
            <option value="">Not set</option>
            <option value="hard_money">Hard money</option>
            <option value="private_money">Private money</option>
            <option value="commercial">Commercial</option>
            <option value="conventional">Conventional</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="loan_term_months">Loan term (months)</label>
          <input id="loan_term_months" name="loan_term_months" inputMode="numeric" defaultValue={p?.loan_term_months || ""} placeholder="12" />
        </div>
        <div className="field">
          <label htmlFor="interest_rate">Interest rate (%)</label>
          <input id="interest_rate" name="interest_rate" inputMode="decimal" defaultValue={p?.interest_rate || ""} placeholder="10" />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="points">Points (%)</label>
          <input id="points" name="points" inputMode="decimal" defaultValue={p?.points || ""} placeholder="2" />
        </div>
        <div className="field">
          <label htmlFor="down_payment">Down payment ($)</label>
          <input id="down_payment" name="down_payment" inputMode="decimal" defaultValue={p?.down_payment || ""} placeholder="17000" />
        </div>
        <div className="field">
          <label htmlFor="purchase_closing_costs">Purchase closing costs ($)</label>
          <input id="purchase_closing_costs" name="purchase_closing_costs" inputMode="decimal" defaultValue={p?.purchase_closing_costs || ""} placeholder="2500" />
        </div>
      </div>

      <h3 className="small" style={{ fontWeight: 600, margin: "20px 0 4px" }}>Exit strategy</h3>
      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="exit_strategy">Exit strategy</label>
          <select id="exit_strategy" name="exit_strategy" defaultValue={p?.exit_strategy ?? "flip"}>
            <option value="flip">Flip</option>
            <option value="brrrr">BRRRR</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="exit_date">Expected sale / refi date</label>
          <input id="exit_date" name="exit_date" type="date" defaultValue={p?.exit_date} />
        </div>
        <div className="field">
          <label htmlFor="realtor_fee_pct">Realtor fee % (flip)</label>
          <input id="realtor_fee_pct" name="realtor_fee_pct" inputMode="decimal" defaultValue={p?.realtor_fee_pct || ""} placeholder="6" />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="selling_closing_costs">Selling closing costs ($, flip)</label>
          <input id="selling_closing_costs" name="selling_closing_costs" inputMode="decimal" defaultValue={p?.selling_closing_costs || ""} placeholder="1500" />
        </div>
        <div className="field">
          <label htmlFor="refinance_ltv_pct">Refinance LTV % of ARV (BRRRR)</label>
          <input id="refinance_ltv_pct" name="refinance_ltv_pct" inputMode="decimal" defaultValue={p?.refinance_ltv_pct || ""} placeholder="75" />
        </div>
        <div className="field">
          <label htmlFor="refinance_closing_costs">Refinance closing costs ($, BRRRR)</label>
          <input id="refinance_closing_costs" name="refinance_closing_costs" inputMode="decimal" defaultValue={p?.refinance_closing_costs || ""} placeholder="3000" />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="monthly_rent">Monthly rent (BRRRR)</label>
          <input id="monthly_rent" name="monthly_rent" inputMode="decimal" defaultValue={p?.monthly_rent || ""} placeholder="1450" />
        </div>
        <div className="field">
          <label htmlFor="monthly_operating_expenses">Monthly operating expenses (BRRRR)</label>
          <input id="monthly_operating_expenses" name="monthly_operating_expenses" inputMode="decimal" defaultValue={p?.monthly_operating_expenses || ""} placeholder="350" />
        </div>
        <div className="field">
          <label htmlFor="refinance_rate">Refinance rate % (BRRRR)</label>
          <input id="refinance_rate" name="refinance_rate" inputMode="decimal" defaultValue={p?.refinance_rate || ""} placeholder="7.25" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="refinance_term_months">Refinance term (months, BRRRR)</label>
        <input id="refinance_term_months" name="refinance_term_months" inputMode="numeric" defaultValue={p?.refinance_term_months || ""} placeholder="360" />
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
