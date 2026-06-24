"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RefreshCw, Check, X, Plug, Brain, Mail, Shield, Database } from "lucide-react";

interface SettingsData {
  settings: Record<string, string>;
  accounts: Array<{ id: string; name: string; org: string; balance: number; lastSync: string | null }>;
  simplefinConfigured: boolean;
  emailConfigured: boolean;
  aiConfigured: boolean;
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [threshold, setThreshold] = useState("0.75");
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await fetch("/api/settings").then((r) => r.json());
    setData(d);
    setThreshold(d.settings.CONFIDENCE_THRESHOLD || "0.75");
  }

  useEffect(() => { load(); }, []);

  async function syncNow() {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/sync", { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setSyncResult({ success: true, message: `Synced: ${json.newTransactions} new transactions, ${json.newAccounts} new accounts` });
    } else {
      setSyncResult({ success: false, message: json.error || "Sync failed" });
    }
    setSyncing(false);
    load();
  }

  async function saveSettings() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ CONFIDENCE_THRESHOLD: threshold }),
    });
    setSaving(false);
  }

  const StatusBadge = ({ ok }: { ok: boolean }) =>
    ok ? (
      <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
        <Check className="w-3 h-3" /> Configured
      </span>
    ) : (
      <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
        <X className="w-3 h-3" /> Not configured
      </span>
    );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* Integrations */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plug className="w-4 h-4 text-muted-foreground" />
          Integrations
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
            <div>
              <p className="text-sm font-medium text-foreground">SimpleFin Bridge</p>
              <p className="text-xs text-muted-foreground">Bank account connection</p>
            </div>
            <StatusBadge ok={data?.simplefinConfigured || false} />
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
            <div>
              <p className="text-sm font-medium text-foreground">Claude AI</p>
              <p className="text-xs text-muted-foreground">Transaction categorization</p>
            </div>
            <StatusBadge ok={data?.aiConfigured || false} />
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
            <div>
              <p className="text-sm font-medium text-foreground">Resend Email</p>
              <p className="text-xs text-muted-foreground">Report delivery</p>
            </div>
            <StatusBadge ok={data?.emailConfigured || false} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Configure via environment variables: <code className="bg-secondary px-1 rounded">SIMPLEFIN_ACCESS_URL</code>,{" "}
          <code className="bg-secondary px-1 rounded">ANTHROPIC_API_KEY</code>,{" "}
          <code className="bg-secondary px-1 rounded">RESEND_API_KEY</code>
        </p>
      </div>

      {/* Sync */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
          Data Sync
        </h2>

        {data?.accounts && data.accounts.length > 0 && (
          <div className="space-y-2 mb-4">
            {data.accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {acc.org} · Last sync: {acc.lastSync ? formatDate(acc.lastSync) : "Never"}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${acc.balance >= 0 ? "text-foreground" : "text-red-400"}`}>
                  {formatCurrency(acc.balance)}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={syncNow}
          disabled={syncing || !data?.simplefinConfigured}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Now"}
        </button>

        {!data?.simplefinConfigured && (
          <p className="text-xs text-muted-foreground mt-2">Set SIMPLEFIN_ACCESS_URL to enable sync</p>
        )}

        {syncResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${syncResult.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {syncResult.message}
          </div>
        )}
      </div>

      {/* AI Settings */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-muted-foreground" />
          AI Categorization
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Review Threshold (flag items below this confidence)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="flex-1 accent-primary"
              />
              <span className="text-sm font-medium text-foreground w-12 text-right">
                {Math.round(parseFloat(threshold) * 100)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Transactions categorized below {Math.round(parseFloat(threshold) * 100)}% confidence will be flagged for review
            </p>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* About */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          Security
        </h2>
        <p className="text-xs text-muted-foreground">
          Authentication is handled via the <code className="bg-secondary px-1 rounded">APP_PASSWORD</code> environment variable.
          Change the password by updating the variable and restarting the app.
        </p>
      </div>
    </div>
  );
}
