"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate, confidenceBg } from "@/lib/utils";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { AlertCircle, Check, Plus, Tag, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  _count?: { categorizations: number };
}

interface ReviewItem {
  id: string;
  confidence: number;
  aiExplanation: string;
  transaction: { id: string; description: string; amount: number; date: string; account: { name: string } };
  category: { id: string; name: string; color: string };
}

const COLORS = ["#6366f1","#22c55e","#ef4444","#f97316","#f59e0b","#14b8a6","#8b5cf6","#ec4899","#0ea5e9","#84cc16"];

export default function CategoriesPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") === "review" ? "review" : "manage");
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("EXPENSE");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [savingReview, setSavingReview] = useState<string | null>(null);
  const [overrideCategoryId, setOverrideCategoryId] = useState<Record<string, string>>({});

  async function loadData() {
    setLoading(true);
    const [cats, rev] = await Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/review").then((r) => r.json()),
    ]);
    setCategories(cats);
    setReviewItems(rev);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function createCategory() {
    if (!newName.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), type: newType, color: newColor }),
    });
    setNewName("");
    setShowNew(false);
    loadData();
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    loadData();
  }

  async function approveReview(item: ReviewItem, categoryId?: string) {
    setSavingReview(item.id);
    const body = categoryId && categoryId !== item.category.id
      ? { categoryId }
      : { markReviewed: true };
    await fetch(`/api/transactions/${item.transaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingReview(null);
    loadData();
  }

  const income = categories.filter((c) => c.type === "INCOME");
  const expense = categories.filter((c) => c.type === "EXPENSE");
  const transfer = categories.filter((c) => c.type === "TRANSFER");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Categories</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit mb-6">
        <button
          onClick={() => setTab("manage")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "manage" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Manage
        </button>
        <button
          onClick={() => setTab("review")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "review" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Review Queue
          {reviewItems.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === "review" ? "bg-white/20" : "bg-yellow-500/20 text-yellow-400"}`}>
              {reviewItems.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading...</div>
      ) : tab === "manage" ? (
        <div className="space-y-6">
          {[
            { label: "Income", items: income, type: "INCOME" },
            { label: "Expenses", items: expense, type: "EXPENSE" },
            { label: "Transfers", items: transfer, type: "TRANSFER" },
          ].map(({ label, items, type }) => (
            <div key={type} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  {label}
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {items.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-foreground truncate">{cat.name}</span>
                      {cat._count && (
                        <span className="text-xs text-muted-foreground">{cat._count.categorizations}</span>
                      )}
                    </div>
                    {(!cat._count || cat._count.categorizations === 0) && (
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

                {showNew && newType === type ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary border border-primary">
                    <div className="flex gap-1 flex-wrap">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setNewColor(c)}
                          className={`w-4 h-4 rounded-full transition-transform ${newColor === c ? "scale-125 ring-1 ring-white" : ""}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createCategory()}
                      placeholder="Category name"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
                    />
                    <button onClick={createCategory} className="text-xs text-primary">Add</button>
                    <button onClick={() => setShowNew(false)} className="text-xs text-muted-foreground">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setNewType(type); setShowNew(true); }}
                    className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {reviewItems.length === 0 ? (
            <div className="bg-card border border-border rounded-xl flex items-center justify-center h-48">
              <div className="text-center">
                <Check className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">No transactions need review</p>
              </div>
            </div>
          ) : (
            reviewItems.map((item) => (
              <div
                key={item.id}
                className="bg-card border border-yellow-500/20 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{item.transaction.description}</span>
                      <ConfidenceBadge confidence={item.confidence} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.transaction.date)} · {item.transaction.account.name}
                    </p>
                    {item.aiExplanation && (
                      <p className="text-xs text-muted-foreground/70 mt-1 italic">AI: {item.aiExplanation}</p>
                    )}
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ${item.transaction.amount >= 0 ? "text-green-400" : "text-foreground"}`}>
                    {item.transaction.amount >= 0 ? "+" : ""}{formatCurrency(item.transaction.amount)}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <span className="text-xs text-muted-foreground">Suggested:</span>
                  <CategoryBadge name={item.category.name} color={item.category.color} />

                  <select
                    value={overrideCategoryId[item.id] || item.category.id}
                    onChange={(e) => setOverrideCategoryId({ ...overrideCategoryId, [item.id]: e.target.value })}
                    className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => approveReview(item, overrideCategoryId[item.id])}
                      disabled={savingReview === item.id}
                      className="flex items-center gap-1.5 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {savingReview === item.id ? "Saving..." : "Confirm"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
