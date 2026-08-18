"use client";

import { format } from "date-fns";
import { Loader2, Search, ShieldCheck, ShieldX } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useRevokeEntitlementMutation,
  useSearchEntitlementsQuery,
} from "@/features/billing/billingApi";

const STATUSES = ["", "ACTIVE", "PAST_DUE", "EXPIRED", "REVOKED"] as const;

/**
 * Admin support tooling for access.
 *
 * Needed from day one, not as a nicety: refunds, comped access and
 * "I paid but I can't see it" tickets all resolve here, and it is the only
 * view of access that did not come from an order (admin grants, trials, promos).
 */
export default function EntitlementsPage() {
  const [query, setQuery] = React.useState("");
  const [submitted, setSubmitted] = React.useState("");
  const [status, setStatus] = React.useState<string>("");

  const { data: rows, isFetching } = useSearchEntitlementsQuery({
    query: submitted || undefined,
    status: status || undefined,
  });
  const [revoke] = useRevokeEntitlementMutation();

  const handleRevoke = async (id: string, label: string) => {
    if (!confirm(`Revoke access to ${label}? The record is kept for audit.`)) {
      return;
    }
    try {
      await revoke({ id, note: "Revoked from admin console" }).unwrap();
      toast.success("Access revoked");
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not revoke access.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          Entitlements
        </h1>
        <p className="text-xs text-muted-foreground">
          Who can access what, and why. Revoking is a status change — the
          history is never deleted.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query.trim());
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student, programme or course…"
            className="h-10 border-border pl-9 text-xs"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.replace("_", " ") : "All statuses"}
            </option>
          ))}
        </select>
      </form>

      <Card className="overflow-hidden rounded-3xl border border-border bg-card">
        {isFetching ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !rows?.length ? (
          <p className="py-12 text-center text-xs text-muted-foreground">
            No entitlements match.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40">
                <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Access until</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const label = row.program?.name ?? row.course?.title ?? "—";
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {row.studentProfile.fullName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {label}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                          {row.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                            row.status === "ACTIVE"
                              ? "bg-success/10 text-success"
                              : row.status === "PAST_DUE"
                                ? "bg-warning/10 text-warning"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {row.status === "ACTIVE" ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <ShieldX className="h-3 w-3" />
                          )}
                          {row.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.accessExpiresAt
                          ? format(new Date(row.accessExpiresAt), "d MMM yyyy")
                          : "Lifetime"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.status !== "REVOKED" && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(row.id, label)}
                            className="cursor-pointer text-[11px] font-semibold text-destructive hover:underline"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
