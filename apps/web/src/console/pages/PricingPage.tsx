import type { AdminPricingRow } from "@kapruka/protocol";
import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { FilterBar } from "@/components/molecules/console";
import { ConsoleApiError, adminApi } from "../api";

export function PricingPage() {
  const [rows, setRows] = useState<AdminPricingRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.pricing();
        if (cancelled) return;
        setRows(data.rows);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ConsoleApiError ? err.message : "Could not load pricing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = (i: number, patch: Partial<AdminPricingRow>) => {
    setRows((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) : prev));
  };

  const addRow = () => {
    setRows((prev) => [
      ...(prev ?? []),
      {
        model: "new-model",
        inputPer1M: 0,
        cachedInputPer1M: 0,
        outputPer1M: 0,
        reasoningPer1M: 0,
        currency: "USD",
        effectiveFrom: new Date().toISOString().slice(0, 10),
      },
    ]);
  };

  const removeRow = (i: number) =>
    setRows((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));

  const save = async () => {
    if (!rows) return;
    setSaving(true);
    setError(null);
    try {
      const next = await adminApi.setPricing(rows);
      setRows(next.rows);
      setSavedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof ConsoleApiError ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display font-bold text-[28px] tracking-[-0.02em]">Pricing</h1>
        <p className="text-[13px] text-muted">
          USD per 1M tokens. Edits apply to new turns; historical cost stays correct.
        </p>
      </header>
      <FilterBar range="Latest table" />

      {error ? <p className="text-[13px] text-[color:var(--color-status-err)]">{error}</p> : null}
      <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[color:var(--color-console-sunken)] text-muted">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold uppercase tracking-[0.06em] text-[11px]">
                Model
              </th>
              <th className="px-3 py-2 font-semibold uppercase tracking-[0.06em] text-[11px]">
                Input
              </th>
              <th className="px-3 py-2 font-semibold uppercase tracking-[0.06em] text-[11px]">
                Cached
              </th>
              <th className="px-3 py-2 font-semibold uppercase tracking-[0.06em] text-[11px]">
                Output
              </th>
              <th className="px-3 py-2 font-semibold uppercase tracking-[0.06em] text-[11px]">
                Reasoning
              </th>
              <th className="px-3 py-2 font-semibold uppercase tracking-[0.06em] text-[11px]">
                Effective from
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted">
                  Loading...
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.model}-${i}`} className="border-t border-[color:var(--color-border)]">
                  <td className="px-3 py-2">
                    <Input
                      value={r.model}
                      onChange={(e) => updateRow(i, { model: e.target.value })}
                      className="font-mono text-[12px]"
                    />
                  </td>
                  <NumCell value={r.inputPer1M} onChange={(v) => updateRow(i, { inputPer1M: v })} />
                  <NumCell
                    value={r.cachedInputPer1M}
                    onChange={(v) => updateRow(i, { cachedInputPer1M: v })}
                  />
                  <NumCell
                    value={r.outputPer1M}
                    onChange={(v) => updateRow(i, { outputPer1M: v })}
                  />
                  <NumCell
                    value={r.reasoningPer1M}
                    onChange={(v) => updateRow(i, { reasoningPer1M: v })}
                  />
                  <td className="px-3 py-2">
                    <Input
                      type="date"
                      value={r.effectiveFrom.slice(0, 10)}
                      onChange={(e) => updateRow(i, { effectiveFrom: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-[12px] text-muted hover:text-[color:var(--color-status-err)] cursor-pointer"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={saving || !rows}>
            {saving ? "Saving..." : "Save table"}
          </Button>
          <Button variant="secondary" onClick={addRow}>
            Add row
          </Button>
        </div>
        {savedAt ? (
          <p className="text-[11px] text-muted">Saved {new Date(savedAt).toLocaleTimeString()}</p>
        ) : null}
      </div>
    </div>
  );
}

function NumCell({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <td className="px-3 py-2">
      <Input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value) || 0)}
        className="tabular text-[12px] w-[110px]"
      />
    </td>
  );
}
