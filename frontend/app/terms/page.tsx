import type { Metadata } from "next";
import { LegalDraft } from "@/components/legal/legal-draft";

export const metadata: Metadata = { title: "Terms of Service (draft) — Narriv", robots: { index: false, follow: false } };

export default function TermsDraftPage() {
  return (
    <LegalDraft title="Terms of Service">
      <p>These terms govern use of Narriv, provided by [COMPANY LEGAL NAME], [REGISTERED ADDRESS] (&quot;we&quot;). Effective date: [DATE — set on approval].</p>
      <h2>1. The service</h2>
      <p>Narriv monitors publicly available online content for keywords your workspace configures, analyses it with automated systems including third-party AI models, and presents signals, narratives, risk indicators and recommendations. AI-generated content is a draft for human review; Narriv does not publish or send content on your behalf.</p>
      <h2>2. Accounts and workspaces</h2>
      <p>Workspace owners and admins control membership, settings and monitoring keywords. You are responsible for activity under your account. [ACCOUNT ELIGIBILITY AND SECURITY OBLIGATIONS — legal to complete.]</p>
      <h2>3. Acceptable use</h2>
      <p>[ACCEPTABLE USE POLICY — legal to complete.]</p>
      <h2>4. Accuracy of analysis</h2>
      <p>Scores such as risk indices are heuristics, not probabilities, and AI classifications can be wrong. Decisions remain yours. [WARRANTY AND LIABILITY TERMS — legal to complete.]</p>
      <h2>5. Fees, term and termination</h2>
      <p>[PLANS, BILLING, RENEWAL, CANCELLATION AND DATA-RETENTION-ON-TERMINATION TERMS — owner and legal to complete.]</p>
      <h2>6. Governing law</h2>
      <p>[JURISDICTION AND DISPUTE RESOLUTION — legal to complete.]</p>
      <h2>7. Contact</h2>
      <p>[LEGAL CONTACT ADDRESS — a mailbox that receives mail must be published before these terms take effect.]</p>
    </LegalDraft>
  );
}
