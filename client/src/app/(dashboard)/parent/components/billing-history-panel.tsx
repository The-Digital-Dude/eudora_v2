"use client";

import React, { useState } from "react";
import { CreditCard, FileText, CheckCircle2, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useGetInvoicesQuery, useGetPaymentsQuery } from "@/features/parent/parentApi";

export function BillingHistoryPanel() {
  const { data: invoices = [], isLoading: isInvoicesLoading, refetch: refetchInvoices } = useGetInvoicesQuery();
  const { data: payments = [], isLoading: isPaymentsLoading, refetch: refetchPayments } = useGetPaymentsQuery();
  const [activeTab, setActiveTab] = useState<"invoices" | "payments">("invoices");

  const handleRefresh = () => {
    refetchInvoices();
    refetchPayments();
  };

  // Calculate totals
  const totalOutstanding = invoices
    .filter((inv) => inv.status !== "PAID")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getStatusBadge = (status: "PENDING" | "PAID" | "OVERDUE") => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 uppercase">
            <AlertTriangle className="h-3 w-3" />
            Overdue
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  const isLoading = isInvoicesLoading || isPaymentsLoading;

  return (
    <div className="rounded-3xl border border-zinc-200/50 bg-white/40 shadow-xl shadow-zinc-200/5 dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md overflow-hidden">
      {/* Header with Stats */}
      <div className="p-6 border-b border-zinc-200/50 dark:border-zinc-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-500" />
              Family Billing & Invoices
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              View your invoiced fees, payment status, and historical payments.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold border border-zinc-200 hover:bg-zinc-50 active:scale-95 transition-all dark:border-zinc-800 dark:hover:bg-zinc-900 dark:text-zinc-300 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-zinc-200/50 bg-rose-50/10 dark:border-zinc-800/30 dark:bg-rose-950/5">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Total Outstanding Balance
            </span>
            <h4 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(totalOutstanding)}
            </h4>
          </div>
          <div className="p-4 rounded-2xl border border-zinc-200/50 bg-emerald-50/10 dark:border-zinc-800/30 dark:bg-emerald-950/5">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Total Paid to Date
            </span>
            <h4 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(totalPaid)}
            </h4>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/10">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold tracking-tight transition-all cursor-pointer border-b-2 ${
            activeTab === "invoices"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          }`}
        >
          <FileText className="h-4 w-4" />
          Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold tracking-tight transition-all cursor-pointer border-b-2 ${
            activeTab === "payments"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Payment History ({payments.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">
            Loading billing records...
          </div>
        ) : activeTab === "invoices" ? (
          <div>
            {invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-zinc-400/50 mb-3" />
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No invoices issued</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="p-4 rounded-2xl border border-zinc-200/50 bg-white/20 dark:border-zinc-800/40 dark:bg-zinc-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
                          Invoice ID: {invoice.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                          Issued: {format(new Date(invoice.issueDate), "MMM dd, yyyy")}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                          Due: {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 mt-2">
                        {invoice.description || "Tuition & School Fees"}
                      </h4>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/50 pt-2 sm:pt-0">
                      {getStatusBadge(invoice.status)}
                      <span className="text-base font-extrabold text-zinc-950 dark:text-zinc-50">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="h-10 w-10 text-zinc-400/50 mb-3" />
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No payment history found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 rounded-2xl border border-zinc-200/50 bg-white/20 dark:border-zinc-800/40 dark:bg-zinc-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                          {payment.method}
                        </span>
                        {payment.reference && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                            Ref: {payment.reference}
                          </span>
                        )}
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                          Date: {format(new Date(payment.paymentDate), "MMM dd, yyyy")}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 mt-2">
                        {payment.notes || "Invoice payment"}
                      </h4>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 shrink-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/50 pt-2 sm:pt-0">
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        + {formatCurrency(payment.amount, payment.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
