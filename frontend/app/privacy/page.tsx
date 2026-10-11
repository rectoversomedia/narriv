import type { Metadata } from "next";
import { LegalDraft } from "@/components/legal/legal-draft";

export const metadata: Metadata = { title: "Privacy Policy (draft) — Narriv", robots: { index: false, follow: false } };

export default function PrivacyDraftPage() {
  return (
    <LegalDraft title="Privacy Policy">
      <p>This policy describes how [COMPANY LEGAL NAME] (&quot;we&quot;) processes personal data in Narriv. Effective date: [DATE — set on approval].</p>
      <h2>1. Data we process</h2>
      <ul>
        <li>Account data: name, email address, password hash, and sign-in records.</li>
        <li>Workspace data: settings, members and roles, monitoring keywords, cases, action plans and audit logs.</li>
        <li>Monitored content: publicly available online articles and posts matching your keywords, and the analyses Narriv derives from them. This content can mention people.</li>
        <li>Usage and AI accounting data: request logs and AI token usage per workspace.</li>
      </ul>
      <h2>2. Service providers</h2>
      <p>Narriv runs on third-party infrastructure. Based on the current system these include hosting (Vercel), database (Supabase), AI analysis (OpenAI) and, where configured, data collection providers (Apify). [CONFIRM THE FINAL PROCESSOR LIST, DATA LOCATIONS AND TRANSFER MECHANISMS — owner and legal to complete.]</p>
      <h2>3. Purposes and legal bases</h2>
      <p>[PURPOSES, LEGAL BASES AND APPLICABLE LAW (for example Indonesia&apos;s PDP Law) — legal to complete.]</p>
      <h2>4. Retention</h2>
      <p>[RETENTION PERIODS — not yet configurable in the product; owner and legal to define.]</p>
      <h2>5. Your rights</h2>
      <p>[DATA SUBJECT RIGHTS AND HOW TO EXERCISE THEM — legal to complete.]</p>
      <h2>6. Contact</h2>
      <p>[PRIVACY CONTACT — a mailbox that receives mail must be published before this policy takes effect.]</p>
    </LegalDraft>
  );
}
