// Business details shown on the policy pages and footer. Razorpay checks these against your KYC,
// so fill in the operator's legal name and registered address before activating payments.
export const LEGAL = {
  brand: "Krpex",
  site: "krpex.in",
  /** Legal name of the person or company that runs Krpex (as on PAN / GST / KYC). */
  operator: "" as string,
  /** Registered address shown on the policy pages. */
  address: "" as string,
  /** City whose courts handle disputes (e.g. "Ahmedabad, Gujarat"). Falls back to "India". */
  jurisdictionCity: "" as string,
  email: "info@krpex.in",
  /** Grievance Officer (IT Rules 2021 / DPDP Act 2023). Name falls back to the operator. */
  grievanceOfficer: "" as string,
  lastUpdated: "7 November 2026",
}

export const operatorName = () => LEGAL.operator || LEGAL.brand
export const jurisdiction = () => (LEGAL.jurisdictionCity ? `the courts at ${LEGAL.jurisdictionCity}, India` : "the courts of India")
