import { PageFrame } from "@/components/payments/page-frame";
import { ClaimFlow } from "../components/claim/ClaimFlow";

export default function ClaimPage() {
  return (
    <PageFrame glow helpHref="/">
      <ClaimFlow />
    </PageFrame>
  );
}
