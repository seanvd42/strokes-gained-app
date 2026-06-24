"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { Mail, Plus, Send, Trash2, Check, X, Clock, Calendar } from "lucide-react";

interface ReportConfig {
  id: string;
  name: string;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  email: string;
  periods: string;
  sections: string;
  enabled: boolean;
  isDefault: boolean;
  lastSent: string | null;
  logs: Array<{ id: string; sentAt: string; status: string; subject: string }>;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PERIOD_OPTIONS = [
  { value: "1m", label: "Last Month" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "12m", label: "12 Months" },
];
const SECTION_OPTIONS = [
  { value: "overview", label: "Overview Summary" },
  { value: "categories", label: "Category Breakdown" },
  { value: "trends", label: "Monthly Trends" },
  { value: "outliers", label: "Outlier Alerts" },
  { value: "review_queue", label: "Review Queue" },
];

export default function ReportsPage() {
  const [configs, setConfigs] = useState<ReportConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    name: "",
    frequency: "MONTHLY",
    dayOfWeek: 1,
    dayOfMonth: 1,
    email: "",
    periods: ["1m", "3m"],
    sections: ["overview", "categories", "review_queue"],
    enabled: true,
  });

  async function load() {
    setLoading(true);
    const data = await fetch("/api/reports").then((r) => r.json());
    setConfigs(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleEnabled(id: string, enabled: boolean) {
    await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    load();
  }

  async function deleteConfig(id: string) {
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    load();
  }

  async function sendNow(id: string) {
    setSending(id);
    const res = await fetch(`/api/reports/${id}/send`, { method: "POST" });
    setSendResult({ ...sendResult, [id]: res.ok });
    setTimeout(() => setSendResult((prev) => { const n = { ...prev }; delete n[id]; return n; }), 3000);
    setSending(null);
    load();
  }

  async function createConfig() {
    if (!form.name || !form.email) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dayOfWeek: form.frequency === "WEEKLY" ? form.dayOfWeek : null,
        dayOfMonth: form.frequency !== "WEEKLY" ? form.dayOfMonth : null,
      }),
    });
    setShowNew(false);
    setForm({ name: "", frequency: "MONTHLY", dayOfWeek: 1, dayOfMonth: 1, email: "", periods: ["1m", "3m"], sections: ["overview", "categories", "review_queue"], enabled: true });
    load();
  }

  function togglePeriod(v: string) {
    setForm((f) => ({ ...f, periods: f.periods.includes(v) ? f.periods.filter((p) => p !== v) : [...f.periods, v] }));
  }

  function toggleSection(v: string) {
    setForm((f) => ({ ...f, sections: f.sections.includes(v) ? f.sections.filter((s) => s !== v) : [...f.sections, v] }));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Scheduled email digests</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {/* New report form */}
      {showNew && (
        <div className="bg-card border border-primary/30 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">New Report Configuration</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Report Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Quarterly Review"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                </select>
              </div>
              <div>
                {form.frequency === "WEEKLY" ? (
                  <>
                    <label className="block text-xs text-muted-foreground mb-1.5">Day of Week</label>
                    <select
                      value={form.dayOfWeek}
                      onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none"
                    >
                      {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </>
                ) : (
                  <>
                    <label className="block text-xs text-muted-foreground mb-1.5">Day of Month</label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={form.dayOfMonth}
                      onChange={(e) => setForm({ ...form, dayOfMonth: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none"
                    />
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Time Periods</label>
              <div className="flex flex-wrap gap-2">
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => togglePeriod(p.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.periods.includes(p.value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Sections</label>
              <div className="flex flex-wrap gap-2">
                {SECTION_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => toggleSection(s.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.sections.includes(s.value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={createConfig}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                Create Report
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm hover:bg-secondary/80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading...</div>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => {
            const periods: string[] = JSON.parse(config.periods);
            const sections: string[] = JSON.parse(config.sections);
            const isSending = sending === config.id;
            const result = sendResult[config.id];

            return (
              <div key={config.id} className={`bg-card border rounded-xl p-5 ${config.enabled ? "border-border" : "border-border opacity-60"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.enabled ? "bg-primary/20" : "bg-secondary"}`}>
                      <Mail className={`w-5 h-5 ${config.enabled ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{config.name}</h3>
                        {config.isDefault && (
                          <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Default</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.frequency === "WEEKLY" ? `Every ${DAYS_OF_WEEK[config.dayOfWeek || 0]}` : `Monthly on day ${config.dayOfMonth}`}
                        {" · "}{config.email}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {periods.map((p) => (
                          <span key={p} className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">
                            {PERIOD_OPTIONS.find((o) => o.value === p)?.label || p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleEnabled(config.id, !config.enabled)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${config.enabled ? "bg-primary" : "bg-border"}`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.enabled ? "translate-x-5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {config.lastSent ? `Last sent ${formatDate(config.lastSent)}` : "Never sent"}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => sendNow(config.id)}
                      disabled={isSending}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        result === true
                          ? "bg-green-500/20 text-green-400"
                          : result === false
                          ? "bg-red-500/20 text-red-400"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      } disabled:opacity-50`}
                    >
                      {result === true ? <Check className="w-3.5 h-3.5" /> : result === false ? <X className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                      {isSending ? "Sending..." : result === true ? "Sent!" : result === false ? "Failed" : "Send Now"}
                    </button>
                    {!config.isDefault && (
                      <button
                        onClick={() => deleteConfig(config.id)}
                        className="text-xs p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {config.logs.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {config.logs.map((log) => (
                      <div key={log.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={log.status === "sent" ? "text-green-400" : "text-red-400"}>
                          {log.status === "sent" ? "✓" : "✗"}
                        </span>
                        <span>{formatDate(log.sentAt)}</span>
                        <span className="truncate">{log.subject}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
