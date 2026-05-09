"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUmbra } from "@/app/hooks/useUmbra";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/app/contexts/wallet-context";

type Phase = "idle" | "signing" | "registering" | "done";
type RegistrationStep =
  | "userAccountInitialisation"
  | "registerX25519PublicKey"
  | "registerUserForAnonymousUsage";
type RowState = "pending" | "active" | "done";

type Props = {
  onComplete: () => void;
};

type RegistrationUiState = {
  walletAddress: string | null;
  phase: Phase;
  error: string | null;
  activeStep: RegistrationStep | null;
  completedSteps: RegistrationStep[];
};

function initialRegistrationUiState(walletAddress: string | null): RegistrationUiState {
  return {
    walletAddress,
    phase: "idle",
    error: null,
    activeStep: null,
    completedSteps: [],
  };
}

const STEP_ROWS: Array<{
  key: RegistrationStep;
  label: string;
  sub: string;
}> = [
  {
    key: "userAccountInitialisation",
    label: "Create your private account",
    sub: "Opens your account on Solana",
  },
  {
    key: "registerX25519PublicKey",
    label: "Register your encryption key",
    sub: "Unlocks your private balance",
  },
  {
    key: "registerUserForAnonymousUsage",
    label: "Enable private payments",
    sub: "Secured with a zero-knowledge proof",
  },
];

export default function UmbraRegister({ onComplete }: Props) {
  const { getUserAccount, registerAccount, isAccountFullyRegistered } = useUmbra();
  const { connectedWallet } = useWallet();
  const walletAddress = connectedWallet?.account.address ?? null;
  const [storedUiState, setStoredUiState] = useState<RegistrationUiState>(() =>
    initialRegistrationUiState(walletAddress),
  );
  const completedCallbackWalletRef = useRef<string | null>(null);

  const uiState =
    storedUiState.walletAddress === walletAddress
      ? storedUiState
      : initialRegistrationUiState(walletAddress);
  const { phase, error, activeStep, completedSteps } = uiState;

  const {
    isPending: isCheckingRegistration,
    data: userAccount,
    refetch: refetchUserAccount,
  } = useQuery({
    enabled: Boolean(connectedWallet),
    queryKey: ["umbra-user-account", walletAddress],
    queryFn: getUserAccount,
  });

  const persistedCompletedSteps = useMemo(
    () => getCompletedStepsFromAccount(userAccount),
    [userAccount],
  );

  const mergedCompletedSteps = useMemo(
    () =>
      Array.from(new Set<RegistrationStep>([
        ...persistedCompletedSteps,
        ...completedSteps,
      ])),
    [completedSteps, persistedCompletedSteps],
  );

  const isAccountAlreadyRegistered = isAccountFullyRegistered(userAccount);
  const hasStartedRegistration = mergedCompletedSteps.length > 0;

  useEffect(() => {
    if (!isAccountAlreadyRegistered || completedCallbackWalletRef.current === walletAddress) {
      return;
    }

    completedCallbackWalletRef.current = walletAddress;
    onComplete();
  }, [isAccountAlreadyRegistered, onComplete, walletAddress]);

  const updateUiState = (updates: Partial<Omit<RegistrationUiState, "walletAddress">>) => {
    setStoredUiState((current) => ({
      ...initialRegistrationUiState(walletAddress),
      ...(current.walletAddress === walletAddress ? current : {}),
      ...updates,
      walletAddress,
    }));
  };

  const markStepDone = (step: RegistrationStep) => {
    setStoredUiState((current) => {
      const base =
        current.walletAddress === walletAddress
          ? current
          : initialRegistrationUiState(walletAddress);

      return {
        ...base,
        completedSteps: base.completedSteps.includes(step)
          ? base.completedSteps
          : [...base.completedSteps, step],
      };
    });
  };

  const handleStart = async () => {
    if (!connectedWallet) return;

    updateUiState({ error: null, phase: "signing", activeStep: null });

    try {
      await registerAccount({
        callbacks: {
          userAccountInitialisation: {
            pre: async () => {
              updateUiState({
                phase: "registering",
                activeStep: "userAccountInitialisation",
              });
            },
            post: async (_, sig) => {
              markStepDone("userAccountInitialisation");
              updateUiState({ activeStep: "registerX25519PublicKey" });
              console.log(`Account created: ${sig}`);
            },
          },
          registerX25519PublicKey: {
            pre: async () => {
              updateUiState({
                phase: "registering",
                activeStep: "registerX25519PublicKey",
              });
            },
            post: async (_, sig) => {
              markStepDone("registerX25519PublicKey");
              updateUiState({ activeStep: "registerUserForAnonymousUsage" });
              console.log(`Encryption key registered: ${sig}`);
            },
          },
          registerUserForAnonymousUsage: {
            pre: async () => {
              updateUiState({
                phase: "registering",
                activeStep: "registerUserForAnonymousUsage",
              });
            },
            post: async (_, sig) => {
              markStepDone("registerUserForAnonymousUsage");
              console.log(`Anonymous registration complete: ${sig}`);
            },
          },
        },
      });

      await refetchUserAccount();
      updateUiState({ activeStep: null, phase: "done" });
      onComplete();
    } catch (error) {
      console.log(error);
      await refetchUserAccount();
      updateUiState({
        activeStep: null,
        phase: "idle",
        error: "That didn't go through. Try again.",
      });
    }
  };

  const displayPhase = isAccountAlreadyRegistered ? "done" : phase;
  const displayActiveStep = isAccountAlreadyRegistered ? null : activeStep;
  const isWorking = displayPhase === "signing" || displayPhase === "registering";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {STEP_ROWS.map((step) => (
          <PhaseRow
            key={step.key}
            label={step.label}
            sub={step.sub}
            state={getStepState(step.key, mergedCompletedSteps, displayActiveStep)}
          />
        ))}
      </div>

      <Button
        onClick={handleStart}
        disabled={
          !connectedWallet ||
          isWorking ||
          isCheckingRegistration ||
          displayPhase === "done"
        }
        className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {isCheckingRegistration && (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Checking…
          </>
        )}
        {!isCheckingRegistration && displayPhase === "idle" &&
          (hasStartedRegistration ? "Continue & pay" : "Set up & pay")}
        {displayPhase === "signing" && (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Waiting for wallet approval…
          </>
        )}
        {displayPhase === "registering" && (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {getRegisteringLabel(displayActiveStep)}
          </>
        )}
        {displayPhase === "done" && (
          <>
            <Check className="mr-2 size-4" strokeWidth={3} />
            Ready
          </>
        )}
      </Button>

      {error ? (
        <p className="text-center text-[12px] text-destructive">{error}</p>
      ) : (
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
          <ShieldCheck className="size-3" />
          Keys stay on your device. Non-custodial, always.
        </p>
      )}
    </div>
  );
}

function getCompletedStepsFromAccount(
  userAccount:
    | Awaited<ReturnType<ReturnType<typeof useUmbra>["getUserAccount"]>>
    | undefined,
): RegistrationStep[] {
  if (!userAccount || userAccount.state !== "exists") {
    return [];
  }

  const completed: RegistrationStep[] = [];

  if (userAccount.data.isInitialised) {
    completed.push("userAccountInitialisation");
  }

  if (userAccount.data.isUserAccountX25519KeyRegistered) {
    completed.push("registerX25519PublicKey");
  }

  if (userAccount.data.isUserCommitmentRegistered) {
    completed.push("registerUserForAnonymousUsage");
  }

  return completed;
}



function getStepState(
  step: RegistrationStep,
  completedSteps: RegistrationStep[],
  activeStep: RegistrationStep | null,
): RowState {
  if (completedSteps.includes(step)) {
    return "done";
  }

  if (activeStep === step) {
    return "active";
  }

  return "pending";
}

function getRegisteringLabel(activeStep: RegistrationStep | null) {
  switch (activeStep) {
    case "userAccountInitialisation":
      return "Creating your account…";
    case "registerX25519PublicKey":
      return "Registering encryption key…";
    case "registerUserForAnonymousUsage":
      return "Enabling private payments…";
    default:
      return "Registering on-chain…";
  }
}

function PhaseRow({
  label,
  sub,
  state,
}: {
  label: string;
  sub: string;
  state: RowState;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors",
        state === "pending" && "border-border/60 bg-surface-raised/20",
        state === "active" && "border-primary/40 bg-primary/5",
        state === "done" && "border-border-strong bg-surface-raised/40",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border",
          state === "pending" && "border-border",
          state === "active" && "border-primary text-primary",
          state === "done" &&
            "border-primary bg-primary text-primary-foreground",
        )}
      >
        {state === "done" ? (
          <Check className="size-3" strokeWidth={3} />
        ) : state === "active" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <span className="size-1.5 rounded-full bg-muted-foreground/50" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13px] font-medium leading-tight",
            state === "pending" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {label}
        </p>
        <p className="mt-0.5 text-[11.5px] leading-tight text-muted-foreground/80">
          {sub}
        </p>
      </div>
    </div>
  );
}
