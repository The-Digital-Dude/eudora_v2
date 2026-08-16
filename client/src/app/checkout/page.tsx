"use client";

import { AlertCircle, ArrowLeft, Check, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AddChildForm } from "@/components/add-child-form";
import {
  type BillingMode,
  formatCents,
  type ResolvedSku,
  type SkuType,
  useCreateCheckoutSessionMutation,
  useGetOpenBatchesQuery,
  useResolveSkuMutation,
} from "@/features/billing/billingApi";
import {
  useGetPublicCourseBySlugQuery,
  useGetPublicProgramBySlugQuery,
} from "@/features/catalog/catalogApi";
import { useGetChildrenQuery } from "@/features/parent/parentApi";
import { currentPathWithQuery, withNext } from "@/lib/safe-next";
import { useAppSelector } from "@/store/hooks";

/**
 * Single-item checkout.
 *
 * The "cart" is the URL (`?type=program&slug=…`) rather than localStorage: it
 * survives the login/registration round trip for free, is shareable, and has
 * no hydration mismatch. There is only ever one item, so a cart table would be
 * over-engineering.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const [sku, setSku] = useState<{ type: SkuType; slug: string } | null>(null);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [billingMode, setBillingMode] = useState<BillingMode>("ONE_TIME");
  const [resolved, setResolved] = useState<ResolvedSku | null>(null);
  const [addingChild, setAddingChild] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState("");

  // Read the item from the URL rather than useSearchParams, matching the
  // convention used by login and explore so this route stays prerenderable.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const slug = params.get("slug");
    if ((type === "program" || type === "course") && slug) {
      setSku({ type: type === "program" ? "PROGRAM" : "COURSE", slug });
    }
  }, []);

  // Anonymous buyers bounce through login and come straight back here.
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(withNext("/login", currentPathWithQuery()));
    }
  }, [isAuthenticated, router]);

  const isProgram = sku?.type === "PROGRAM";
  const { data: program } = useGetPublicProgramBySlugQuery(sku?.slug ?? "", {
    skip: !sku || !isProgram,
  });
  const { data: course } = useGetPublicCourseBySlugQuery(sku?.slug ?? "", {
    skip: !sku || isProgram,
  });

  const { data: children, isLoading: childrenLoading } = useGetChildrenQuery(
    undefined,
    { skip: !isAuthenticated },
  );

  const [resolveSku, { isLoading: resolving }] = useResolveSkuMutation();
  const [createSession, { isLoading: creating }] =
    useCreateCheckoutSessionMutation();

  const skuId = isProgram ? program?.id : course?.id;

  // Only a live course needs a cohort; self-paced returns nothing here.
  const needsBatch = !isProgram && course?.deliveryMode === "LIVE";
  const { data: batches } = useGetOpenBatchesQuery(skuId ?? "", {
    skip: !skuId || !needsBatch,
  });
  const title = isProgram ? program?.name : course?.title;

  // Default to the only child, so a single-child guardian never has to pick.
  useEffect(() => {
    if (!selectedChildId && children?.length === 1) {
      setSelectedChildId(children[0].studentProfileId);
    }
  }, [children, selectedChildId]);

  // Price depends on who it is for — an upgrade credit only exists relative to
  // what that specific child already owns — so this re-runs on child change.
  const refreshPrice = useCallback(async () => {
    if (!skuId || !selectedChildId || !sku) return;
    try {
      const result = await resolveSku({
        studentProfileId: selectedChildId,
        skuType: sku.type,
        skuId,
      }).unwrap();
      setResolved(result);
      if (!result.installmentsAvailable) setBillingMode("ONE_TIME");
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not price this item.");
    }
  }, [skuId, selectedChildId, sku, resolveSku]);

  useEffect(() => {
    void refreshPrice();
  }, [refreshPrice]);

  useEffect(() => {
    if (!selectedBatchId && batches?.length === 1) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  const handlePay = async () => {
    if (!skuId || !selectedChildId || !sku) return;
    try {
      const { checkoutUrl } = await createSession({
        studentProfileId: selectedChildId,
        skuType: sku.type,
        skuId,
        billingMode,
        batchId: needsBatch ? selectedBatchId : undefined,
        successPath: "/checkout/success",
        cancelPath: `/checkout/cancelled?type=${sku.type.toLowerCase()}&slug=${sku.slug}`,
      }).unwrap();

      if (!checkoutUrl) {
        toast.error("Payment could not be started. Please try again.");
        return;
      }
      // Full navigation, not router.push — this leaves the app for Stripe.
      window.location.href = checkoutUrl;
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not start checkout.");
    }
  };

  if (!isAuthenticated) {
    return (
      <CenteredMessage>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CenteredMessage>
    );
  }

  if (!sku) {
    return (
      <CenteredMessage>
        <p className="text-sm font-semibold text-foreground">
          Nothing to check out.
        </p>
        <Link
          href="/explore"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Browse programmes
        </Link>
      </CenteredMessage>
    );
  }

  const selectedChild = children?.find(
    (c) => c.studentProfileId === selectedChildId,
  );
  const canPay =
    !!resolved &&
    (resolved.resolution === "AVAILABLE" || resolved.resolution === "UPGRADE") &&
    !!selectedChildId &&
    (!needsBatch || !!selectedBatchId) &&
    !creating;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href={
          isProgram
            ? `/explore/programs/${sku.slug}`
            : `/explore/courses/${sku.slug}`
        }
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Checkout
      </h1>

      <div className="mt-6 space-y-4">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isProgram ? "Programme" : "Course"}
          </p>
          <h2 className="mt-1 font-display text-base font-bold text-foreground">
            {title ?? "Loading…"}
          </h2>
        </section>

        {/* Choosing the child BEFORE paying is deliberate: the classic failure
            here is paying and then not knowing where the course went. */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Who is this for?
          </p>

          {childrenLoading ? (
            <p className="mt-3 text-xs text-muted-foreground">Loading…</p>
          ) : !children?.length || addingChild ? (
            // Inline rather than a redirect: sending a buyer away at this exact
            // moment to complete a profile elsewhere is where the funnel used
            // to lose them.
            <div className="mt-3 space-y-3">
              {!children?.length && (
                <p className="text-xs text-muted-foreground">
                  Add your child to continue — it takes a moment.
                </p>
              )}
              <AddChildForm
                submitLabel="Add child and continue"
                onCreated={(child) => {
                  setSelectedChildId(child.id);
                  setAddingChild(false);
                }}
              />
              {!!children?.length && (
                <button
                  type="button"
                  onClick={() => setAddingChild(false)}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {children.map((child) => (
                <label
                  key={child.studentProfileId}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                    selectedChildId === child.studentProfileId
                      ? "border-foreground bg-muted/50"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="child"
                    value={child.studentProfileId}
                    checked={selectedChildId === child.studentProfileId}
                    onChange={() => setSelectedChildId(child.studentProfileId)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    {child.fullName}
                  </span>
                  {child.classSection && (
                    <span className="text-[10px] text-muted-foreground">
                      {child.classSection.name}
                    </span>
                  )}
                </label>
              ))}
            <button
                type="button"
                onClick={() => setAddingChild(true)}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                + Add another child
              </button>
            </div>
          )}
        </section>

        {/* A live course is a seat in a dated cohort, so the batch is part of
            what is being bought — chosen here, re-validated server-side. */}
        {batches && batches.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Choose a batch
            </p>
            <div className="mt-3 space-y-2">
              {batches.map((batch) => (
                <label
                  key={batch.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                    selectedBatchId === batch.id
                      ? "border-foreground bg-muted/50"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="batch"
                    checked={selectedBatchId === batch.id}
                    onChange={() => setSelectedBatchId(batch.id)}
                    className="mt-0.5 h-3.5 w-3.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-foreground">
                      {batch.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {batch.startDate
                        ? `Starts ${new Date(batch.startDate).toLocaleDateString()}`
                        : "Start date to be confirmed"}
                      {batch.leadTeacher ? ` · ${batch.leadTeacher.fullName}` : ""}
                      {batch.seatsLeft !== null
                        ? ` · ${batch.seatsLeft} seats left`
                        : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        {needsBatch && batches && batches.length === 0 && (
          <Notice tone="warn">
            No batches are open for this course right now. Check back soon.
          </Notice>
        )}

        {resolved && resolved.resolution === "OWNED" && (
          <Notice tone="info">{resolved.message}</Notice>
        )}
        {resolved && resolved.resolution === "BLOCKED_ACTIVE_PLAN" && (
          <Notice tone="warn">{resolved.message}</Notice>
        )}
        {resolved && resolved.resolution === "NOT_SELLABLE" && (
          <Notice tone="warn">{resolved.message}</Notice>
        )}

        {resolved &&
          (resolved.resolution === "AVAILABLE" ||
            resolved.resolution === "UPGRADE") && (
            <>
              {resolved.installmentsAvailable && (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    How would you like to pay?
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <PayOption
                      selected={billingMode === "ONE_TIME"}
                      onSelect={() => setBillingMode("ONE_TIME")}
                      title={formatCents(resolved.priceCents, resolved.currency)}
                      subtitle="One-time payment"
                    />
                    <PayOption
                      selected={billingMode === "INSTALLMENT"}
                      onSelect={() => setBillingMode("INSTALLMENT")}
                      title={`${resolved.installmentCount} × ${formatCents(
                        resolved.amountPerInstallmentCents,
                        resolved.currency,
                      )}`}
                      subtitle={`Monthly — final payment ${formatCents(
                        resolved.finalInstallmentCents,
                        resolved.currency,
                      )}`}
                    />
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="space-y-1.5 text-xs">
                  <Row
                    label="Price"
                    value={formatCents(
                      resolved.listPriceCents,
                      resolved.currency,
                    )}
                  />
                  {resolved.creditAppliedCents > 0 && (
                    <Row
                      label="Credit for courses you already own"
                      value={`− ${formatCents(
                        resolved.creditAppliedCents,
                        resolved.currency,
                      )}`}
                      tone="success"
                    />
                  )}
                  <div className="flex items-baseline justify-between border-t border-border pt-2">
                    <span className="text-xs font-bold text-foreground">
                      {billingMode === "INSTALLMENT" ? "Due today" : "Total"}
                    </span>
                    <span className="font-display text-xl font-bold text-foreground">
                      {formatCents(
                        billingMode === "INSTALLMENT"
                          ? resolved.amountPerInstallmentCents
                          : resolved.priceCents,
                        resolved.currency,
                      )}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={!canPay}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-xs font-bold text-background hover:bg-foreground/90 disabled:opacity-50"
                >
                  {creating || resolving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                  {/* Naming the child on the button is the cheapest guard
                      against buying for the wrong one. */}
                  {selectedChild
                    ? `Enrol ${selectedChild.fullName} — ${formatCents(
                        billingMode === "INSTALLMENT"
                          ? resolved.amountPerInstallmentCents
                          : resolved.priceCents,
                        resolved.currency,
                      )}`
                    : "Select a child to continue"}
                </button>

                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  Payments are processed securely by Stripe.
                </p>
              </section>
            </>
          )}
      </div>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      {children}
    </div>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "info" | "warn";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border p-4 text-xs font-semibold ${
        tone === "warn"
          ? "border-warning/20 bg-warning/10 text-foreground"
          : "border-border bg-muted text-foreground"
      }`}
    >
      {tone === "warn" ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <Check className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === "success" ? "text-success" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}

function PayOption({
  selected,
  onSelect,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border p-3 text-left ${
        selected ? "border-foreground bg-muted/50" : "border-border hover:bg-muted/30"
      }`}
    >
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="text-[10px] text-muted-foreground">{subtitle}</p>
    </button>
  );
}
