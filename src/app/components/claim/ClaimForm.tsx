"use client";

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
import { useRef } from "react";

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
const isValidHandleFormat = (value: string) => schema.shape.handle.safeParse(value).success;

type Props = {
  address: string;
  onClaimed?: (handle: string) => void;
};

export default function HandleClaimForm({ address, onClaimed }: Props) {
  const availabilityCacheRef = useRef(new Map<string, boolean>());

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
      try {
        await addHandle({
          handle,
          ownerPubkey: address,
          displayName: value.displayName.trim() || undefined,
          bio: value.bio.trim() || undefined,
        });
        onClaimed?.(handle);
      } catch(errror) {
        console.log('Claim failed', errror)
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup className="gap-5">
        {/* Handle — the brand primitive, gets the most visual weight */}
        <form.Field
          name="handle"
          children={(field) => {
            const value = normalizeHandle(field.state.value);
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const isValidFormat = isValidHandleFormat(value);
            const availabilityError = field.state.meta.errorMap.onChange;
            const hasCheckedAvailability = availabilityCacheRef.current.has(value);
            const isCheckingAvailability = isValidFormat && field.state.meta.isValidating;
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
                        hush.to/@{value}
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

      {address && (
        <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-border/60 bg-surface-raised/40 p-3">
          <div className="min-w-0 text-[12.5px] leading-relaxed">
            <p className="text-muted-foreground">Signing with</p>
            <p className="font-mono text-foreground/90 truncate">
              {truncateAddress(address)}
            </p>
          </div>
        </div>
      )}

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="mt-7 h-12 w-full rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Claiming…
              </>
            ) : (
              "Claim my handle"
            )}
          </Button>
        )}
      />

      <p className="mt-4 text-center text-[11px] text-muted-foreground/80">
        Handles are first-come, first-served. No fee to claim.
      </p>
    </form>
  );
}

function truncateAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}
