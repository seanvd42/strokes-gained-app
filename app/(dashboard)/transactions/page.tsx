"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDate, confidenceBg } from "@/lib/utils";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { Search, Filter, AlertCircle, Check } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  account: { name: string };
  categorization?: {
    confidence: number;
    method: string;
    needsReview: boolean;
    reviewedAt: string | null;
    category: { id: string; name: string; color: string };
  };
}

interface Category {
  id: string;
  name: string;
  color: string;
  type: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterReview, setFilterReview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filterCategory) params.set("category", filterCategory);
    if (filterReview) params.set("needsReview", "true");
    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.transactions || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, debouncedSearch, filterCategory, filterReview]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
  useEffect(() => { setPage(1); }, [debouncedSearch, filterCategory, filterReview]);

  async function updateCategory(txId: string, categoryId: string) {
    setSavingId(txId);
    await fetch(`/api/transactions/${txId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    setEditingId(null);
    setSavingId(null);
    fetchTransactions();
  }

  async function markReviewed(txId: string) {
    setSavingId(txId);
    await fetch(`/api/transactions/${txId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markReviewed: true }),
    });
    setSavingId(null);
    fetchTransactions();
  }

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <button
          onClick={() => setFilterReview(!filterReview)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
            filterReview
              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Needs Review
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No transactions found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Date</th>
                    <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Description</th>
                    <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Category</th>
                    <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Confidence</th>
                    <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Amount</th>
                    <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const cat = tx.categorization;
                    const isEditing = editingId === tx.id;
                    const isSaving = savingId === tx.id;
                    const needsReview = cat?.needsReview && !cat?.reviewedAt;

                    return (
                      <tr
                        key={tx.id}
                        className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${needsReview ? "bg-yellow-500/5" : ""}`}
                      >
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex items-center gap-2">
                            {needsReview && <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                            <span className="text-sm text-foreground truncate">{tx.description}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{tx.account.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select
                              autoFocus
                              defaultValue={cat?.category.id}
                              onChange={(e) => updateCategory(tx.id, e.target.value)}
                              onBlur={() => setEditingId(null)}
                              className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          ) : cat ? (
                            <CategoryBadge name={cat.category.name} color={cat.category.color} />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {cat ? <ConfidenceBadge confidence={cat.confidence} showIcon={needsReview} /> : null}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold ${tx.amount >= 0 ? "text-green-400" : "text-foreground"}`}>
                            {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingId(isEditing ? null : tx.id)}
                              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-secondary transition-colors"
                            >
                              Recategorize
                            </button>
                            {needsReview && !isSaving && (
                              <button
                                onClick={() => markReviewed(tx.id)}
                                className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded bg-green-500/10 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-foreground disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-foreground disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
