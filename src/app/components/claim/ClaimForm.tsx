"use client";

import { handleUrl } from "@/lib/brand";
import { Button } from "@/components/ui/button";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { addHandle, hadnleExists as handleExists } from "@/app/actions/handles";
import { useRef, useState } from "react";
import { useVault } from "@/app/hooks/useVault";
// import { getVaultBalance, sponsorVault } from "@/app/actions/vault";
// import { useUmbra } from "@/app/hooks/useUmbra";
// import { createSignerFromKeyPair as createUmbraSignerFromKeyPair } from "@umbra-privacy/sdk";

const schema = z.object({
  handle: z
    .string()
    .min(3, "Handles are 3–20 characters.")
    .max(20, "Handles are 3–20 characters.")
    .regex(
      /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/,
      "Lowercase letters, numbers, and dashes only."
    ),
  displayName: z.string().max(40, "Keep it under 40 characters."),
  bio: z.string().max(120, "Keep it under 120 characters."),
});

const HANDLE_TAKEN_MESSAGE = "This handle is already taken.";
const normalizeHandle = (value: string) => value.trim().toLowerCase();
const isValidHandleFormat = (value: string) =>
  schema.shape.handle.safeParse(value).success;

type SubmitPhase = "idle" | "signing" | "setup" | "publishing";

// import { delay } from "@/lib/delay";

// async function waitForVaultBalance(
//   vaultPubkey: string,
//   minimumLamports: bigint,
//   timeoutMs = 30_000,
// ) {
//   const startedAt = Date.now();

//   while (Date.now() - startedAt < timeoutMs) {
//     const balance = await getVaultBalance(vaultPubkey);
//     const lamports = BigInt(balance.lamports);

//     if (lamports >= minimumLamports) {
//       return lamports;
//     }

//     await delay(1_000);
//   }

//   throw new Error("Timed out waiting for vault funding");
// }

type Props = {
  onClaimed?: (handle: string) => void;
};

export default function HandleClaimForm({ onClaimed }: Props) {
  const availabilityCacheRef = useRef(new Map<string, boolean>());
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [setupStatus, setSetupStatus] = useState("Setting up privately…");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { createEncryptedVault } = useVault()
  // const { registerAccount: registerUmbraAccount } = useUmbra()

  const form = useForm({
    defaultValues: {
      handle: "",
      displayName: "",
      bio: "",
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: schema,
    },
    onSubmit: async ({ value }) => {
      const handle = normalizeHandle(value.handle);
      setSubmitError(null);
      setSetupStatus("Setting up privately…");

      try {
        // User-visible wallet signature for vault encryption.
        setSubmitPhase("signing");
        const wallet = await createEncryptedVault()

        // Fund the vault and wait until the balance is confirmed on-chain.
        // setSubmitPhase("setup");
        // const sponsorResult = await sponsorVault(wallet.vaultPubkey)

        // await waitForVaultBalance(
        //   wallet.vaultPubkey,
        //   BigInt(sponsorResult.lamports),
        // )

        // Register the vault with Umbra using the sponsored vault signer.
        // const umbraSigner = createUmbraSignerFromKeyPair(wallet.keyPairSigner)

        // await registerUmbraAccount({
        //   signer: umbraSigner,
        //   callbacks: {
        //     userAccountInitialisation: {
        //       pre: async (tx) => {
        //         setSetupStatus("Opening your private account…");
        //         console.log("Creating account...");
        //         console.log("Transaction:", tx);
        //       },
        //       post: async (_, sig) => {
        //         console.log(`Account created: ${sig}`);
        //       },
        //     },
        //     registerX25519PublicKey: {
        //       pre: async () => {
        //         setSetupStatus("Enabling encrypted balances…");
        //         console.log("Registering X25519 key...");
        //       },
        //       post: async (_, sig) => {
        //         console.log(`Encryption key registered: ${sig}`);
        //       },
        //     },
        //     registerUserForAnonymousUsage: {
        //       pre: async () => {
        //         setSetupStatus("Turning on anonymous receiving…");
        //         console.log("Registering for anonymous usage...");
        //       },
        //       post: async (_, sig) => {
        //         console.log(`Anonymous registration complete: ${sig}`);
        //       },
        //     },
        //   }
        // })

        // Publish the handle record after private setup completes.
        setSubmitPhase("publishing");
        await addHandle({
          handle,
          vaultPubkey: wallet.vaultPubkey,
          encryptedVaultSecret: wallet.encryptedVaultSecret,
          ownerWalletAddress: wallet.ownerWalletAddress,
          displayName: value.displayName.trim() || undefined,
          bio: value.bio.trim() || undefined,
        });

        setSubmitPhase("idle");
        onClaimed?.(handle);
      } catch (error) {
        console.log("Claim failed", error);
        setSubmitPhase("idle");
        setSubmitError("That didn't go through. Try again.");
      }
    },
  });

  const isSubmittingPhase = submitPhase !== "idle";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup className="gap-5">
        <form.Field
          name="handle"
          children={(field) => {
            const value = normalizeHandle(field.state.value);
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const isValidFormat = isValidHandleFormat(value);
            const availabilityError = field.state.meta.errorMap.onChange;
            const hasCheckedAvailability =
              availabilityCacheRef.current.has(value);
            const isCheckingAvailability =
              isValidFormat && field.state.meta.isValidating;
            const isTaken = availabilityError === HANDLE_TAKEN_MESSAGE;
            const isAvailable =
              isValidFormat &&
              hasCheckedAvailability &&
              !isCheckingAvailability &&
              !availabilityError;

            return (
              <Field data-invalid={isInvalid || isTaken}>
                <FieldLabel
                  htmlFor={field.name}
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Your handle
                </FieldLabel>
                <div className="relative">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 font-medium text-lg"
                  >
                    @
                  </span>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(e.target.value.toLowerCase())
                    }
                    aria-invalid={isInvalid || isTaken}
                    aria-describedby={`${field.name}-status`}
                    placeholder="alice"
                    autoComplete="off"
                    autoFocus
                    disabled={isSubmittingPhase}
                    className={cn(
                      "h-12 pl-8 pr-10 text-lg font-medium tracking-tight",
                      "border-border-strong bg-surface-raised/30",
                      "placeholder:text-muted-foreground/40 placeholder:font-normal",
                      "focus-visible:ring-primary/30"
                    )}
                  />
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-hidden
                  >
                    {isCheckingAvailability ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : isAvailable ? (
                      <Check
                        className="size-4 text-primary"
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </div>
                </div>

                <FieldDescription
                  id={`${field.name}-status`}
                  className="text-[12px]"
                  aria-live="polite"
                >
                  {isCheckingAvailability ? (
                    <span>Checking availability…</span>
                  ) : isTaken ? (
                    <span className="text-destructive">
                      @{value} is taken. Try something else.
                    </span>
                  ) : isAvailable ? (
                    <span className="text-primary">
                      @{value} is yours. Lives at{" "}
                      <span className="text-foreground/90 font-medium">
                        {handleUrl(value)}
                      </span>
                    </span>
                  ) : (
                    <span>
                      3–20 characters. Lowercase letters, numbers, and dashes.
                    </span>
                  )}
                </FieldDescription>
                {isInvalid && !isTaken && (
                  <FieldError errors={field.state.meta.errors} />
                )}
              </Field>
            );
          }}
          asyncDebounceMs={500}
          validators={{
            onChangeAsync: async ({ value }) => {
              const handle = normalizeHandle(value);

              if (!isValidHandleFormat(handle)) {
                return undefined;
              }

              const cached = availabilityCacheRef.current.get(handle);
              if (cached !== undefined) {
                return cached ? HANDLE_TAKEN_MESSAGE : undefined;
              }

              const exists = await handleExists(handle);
              availabilityCacheRef.current.set(handle, exists);

              return exists ? HANDLE_TAKEN_MESSAGE : undefined;
            },
          }}
        />

        <form.Field
          name="displayName"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel
                  htmlFor={field.name}
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Display name
                  <span className="ml-1 text-muted-foreground/60 font-normal normal-case">
                    (optional)
                  </span>
                </FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Alice Chen"
                  disabled={isSubmittingPhase}
                  className="h-10 border-border-strong bg-surface-raised/30 focus-visible:ring-primary/30"
                />
                <FieldDescription className="text-[11px]">
                  Shown above your handle on your public profile.
                </FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        <form.Field
          name="bio"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const remaining = 120 - (field.state.value?.length ?? 0);
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel
                  htmlFor={field.name}
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  One-line bio
                  <span className="ml-1 text-muted-foreground/60 font-normal normal-case">
                    (optional)
                  </span>
                </FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Essays on privacy and quiet internet things."
                  maxLength={120}
                  disabled={isSubmittingPhase}
                  className="min-h-10 border-border-strong bg-surface-raised/30 focus-visible:ring-primary/30 resize-none"
                />
                <FieldDescription className="text-[11px]">
                  {remaining} characters left.
                </FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
      </FieldGroup>

      <form.Subscribe
        selector={(state) =>
          [state.canSubmit, state.values.handle] as const
        }
        children={([canSubmit, handleValue]) => {
          const prettyHandle = normalizeHandle(handleValue || "your-handle");
          return (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmittingPhase}
              className="mt-7 h-12 w-full rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitPhase === "idle" && "Claim my handle"}
              {submitPhase === "signing" && (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Waiting for wallet signature…
                </>
              )}
              {submitPhase === "setup" && (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {setupStatus}
                </>
              )}
              {submitPhase === "publishing" && (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Publishing @{prettyHandle}…
                </>
              )}
            </Button>
          );
        }}
      />

      {submitError ? (
        <p className="mt-3 text-center text-[12px] text-destructive">
          {submitError}
        </p>
      ) : (
        <p className="mt-4 text-center font-serif italic text-[12.5px] leading-relaxed text-muted-foreground/80">
          One signature. No gas. Handles are first-come, first-served.
        </p>
      )}
    </form>
  );
}
