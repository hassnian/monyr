import { useState } from "react";

type Step = "connect-wallet" | "claim-handle" | "claimed";

export function useClaimFlow() {
  const [step, setStep] = useState<Step>("connect-wallet");

  return {
    step,
    goTo: setStep,
  };
}
