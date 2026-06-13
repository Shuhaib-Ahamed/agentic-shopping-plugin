import type { AdminDatasetCreateBody } from "@kapruka/protocol";
import { Download, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { FilterBar } from "@/components/molecules/console";
import { adminApi } from "../api";
import { formatDateTime, formatNumber } from "../format";
import { useAsync } from "../hooks";

const RATINGS: Array<{
  value: NonNullable<AdminDatasetCreateBody["filter"]["rating"]>;
  label: string;
}> = [
  { value: "any", label: "Any rating" },
  { value: "good", label: "Good only" },
  { value: "bad", label: "Bad only" },
  { value: "unrated", label: "Unrated only" },
];

const REDACTIONS: Array<{ value: AdminDatasetCreateBody["redactionProfile"]; label: string }> = [
  { value: "strict", label: "Strict redaction" },
  { value: "balanced", label: "Balanced redaction" },
];

const FORMATS: Array<{ value: AdminDatasetCreateBody["format"]; label: string }> = [
  { value: "openai_chat_jsonl", label: "OpenAI chat JSONL (fine-tune)" },
  { value: "eval_jsonl", label: "Evaluation JSONL" },
];

export function DatasetsPage() {
  const { data, reload } = useAsync(() => adminApi.datasets());
  const [name, setName] = useState("Curated good turns");
  const [rating, setRating] = useState<AdminDatasetCreateBody["filter"]["rating"]>("good");
  const [redaction, setRedaction] = useState<AdminDatasetCreateBody["redactionProfile"]>("strict");
  const [format, setFormat] = useState<AdminDatasetCreateBody["format"]>("openai_chat_jsonl");
  const [creating, setCreating] = useState(false);

  const onCreate = async () => {
    setCreating(true);
    try {
      await adminApi.createDataset({
        name,
        filter: { rating },
        redactionProfile: redaction,
        format,
      });
      reload();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display font-bold text-[28px] tracking-[-0.02em]">Datasets</h1>
        <p className="text-[13px] text-muted">
          Build PII-redacted fine-tuning and evaluation sets.
        </p>
      </header>
      <FilterBar range="Last 24 hours" />

      <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5 space-y-3">
        <h3 className="font-display font-semibold text-[15px] tracking-[-0.01em] flex items-center gap-2">
          <Sparkles size={16} className="text-[color:var(--color-cta-deep)]" />
          New dataset
        </h3>
        <label className="block">
          <span className="text-[12px] font-semibold text-muted">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full" />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="Rating filter"
            value={rating ?? "any"}
            options={RATINGS}
            onChange={(v) => setRating(v as typeof rating)}
          />
          <Select
            label="Redaction"
            value={redaction}
            options={REDACTIONS}
            onChange={(v) => setRedaction(v as typeof redaction)}
          />
          <Select
            label="Format"
            value={format}
            options={FORMATS}
            onChange={(v) => setFormat(v as typeof format)}
          />
        </div>
        <Button onClick={onCreate} disabled={creating}>
          {creating ? "Building..." : "Build dataset"}
        </Button>
      </section>

      <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] overflow-hidden">
        <header className="px-5 py-3 border-b border-[color:var(--color-border)] flex items-center justify-between">
          <h3 className="font-display font-semibold text-[15px] tracking-[-0.01em]">
            Saved datasets
          </h3>
          <span className="text-[12px] text-muted">{data?.items.length ?? 0} sets</span>
        </header>
        {!data || data.items.length === 0 ? (
          <p className="px-5 py-6 text-center text-muted text-[13px]">
            Build a dataset to start training Juno on its best turns.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {data.items.map((d) => (
              <li key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-text">{d.name}</p>
                  <p className="text-[11px] text-muted">
                    {formatNumber(d.count)} turns · {d.format} · {d.redactionProfile} ·{" "}
                    {formatDateTime(d.createdAt)}
                  </p>
                </div>
                <a
                  href={adminApi.exportDatasetUrl(d.id)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-[color:var(--color-cta-soft)] text-[color:var(--color-cta-deep)] text-[13px] font-semibold hover:bg-[color:var(--color-cta)] hover:text-white transition-colors"
                  download
                >
                  <Download size={14} />
                  Export
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1 w-full h-11 px-3 rounded-[10px] bg-white border border-[color:var(--color-border)] text-[14px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
