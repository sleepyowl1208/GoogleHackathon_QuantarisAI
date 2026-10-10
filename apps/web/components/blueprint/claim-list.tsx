import { claimStyle, type Claim } from "@/lib/layout-api";

const order = ["CALCULATION", "ASSUMPTION", "INFERENCE", "UNKNOWN", "FACT", "RECOMMENDATION", "SIMULATION"];
export function ClaimList({ claims, labels }: { claims: Claim[]; labels: Record<string, string> }) {
  const sorted = [...claims].sort((a, b) => order.indexOf(a.classification) - order.indexOf(b.classification));
  return (
    <ul className="bp-claims">
      {sorted.map((claim) => (
        <li key={claim.claim_id} className={`bp-claim kind-${claim.classification.toLowerCase()}`}>
          <span className="bp-tag"><span aria-hidden="true">{claimStyle[claim.classification].glyph}</span> {labels[claim.classification] ?? claim.classification}</span>
          <div><p>{claim.statement}</p>{claim.reason ? <p className="bp-why">{claim.reason}</p> : null}{claim.methodology ? <p className="bp-why">{claim.methodology}</p> : null}</div>
        </li>
      ))}
    </ul>
  );
}
