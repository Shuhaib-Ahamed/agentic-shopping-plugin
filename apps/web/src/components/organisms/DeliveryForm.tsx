import { useId, useState, type FormEvent } from "react";
import type { Field, RequestInfoEvent } from "@kapruka/protocol";
import { Button, Input } from "@/components/atoms";
import { CityAutocompleteField, DatePickerField, type CityOption } from "@/components/molecules";
import { useAppStore } from "@/store";
import { pickStrings } from "@/i18n";

export interface DeliveryFormProps {
  event: RequestInfoEvent;
  /** Backed by the gateway `/api/cities?q=` route which proxies `kapruka_list_delivery_cities`. */
  onCityQuery: (q: string) => Promise<CityOption[]>;
  onSubmit: (values: Record<string, string>) => void;
  isPending?: boolean;
}

export function DeliveryForm({ event, onCityQuery, onSubmit, isPending }: DeliveryFormProps) {
  const locale = useAppStore((s) => s.locale);
  const t = pickStrings(locale);
  const baseId = useId();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of event.fields) init[f.name] = f.defaultValue ?? "";
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (name: string, val: string) => {
    setValues((v) => ({ ...v, [name]: val }));
    if (errors[name]) {
      const next = { ...errors };
      delete next[name];
      setErrors(next);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const f of event.fields) {
      const v = values[f.name]?.trim() ?? "";
      if (f.required && v.length === 0) next[f.name] = "Required";
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    onSubmit(values);
  };

  return (
    <section className="px-4 md:px-6 py-4 md:py-6 animate-[surface-in_500ms_cubic-bezier(0.16,1,0.3,1)_both]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4 md:p-5 max-w-[540px] mx-auto"
      >
        <header className="mb-4">
          <h3
            className="text-[var(--text-lg)] font-semibold text-[var(--color-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {event.title}
          </h3>
        </header>
        <div className="grid grid-cols-1 gap-4">
          {event.fields.map((f) => (
            <FieldRender
              key={f.name}
              id={`${baseId}-${f.name}`}
              field={f}
              value={values[f.name] ?? ""}
              onChange={(v) => update(f.name, v)}
              onCityQuery={onCityQuery}
              error={errors[f.name]}
              helperText={f.name === "city" ? t.delivery.cityHelp : f.helperText}
            />
          ))}
        </div>
        <div className="mt-5">
          <Button block size="lg" isPending={isPending}>
            {event.submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}

function FieldRender({
  id,
  field,
  value,
  onChange,
  onCityQuery,
  error,
  helperText,
}: {
  id: string;
  field: Field;
  value: string;
  onChange: (v: string) => void;
  onCityQuery: (q: string) => Promise<CityOption[]>;
  error?: string;
  helperText?: string;
}) {
  if (field.type === "city") {
    return (
      <CityAutocompleteField
        id={id}
        label={field.label}
        placeholder={field.placeholder}
        value={value}
        onValueChange={onChange}
        onQuery={onCityQuery}
        required={field.required}
        helperText={helperText}
        error={error}
      />
    );
  }
  if (field.type === "date") {
    return (
      <DatePickerField
        id={id}
        label={field.label}
        value={value}
        onValueChange={onChange}
        required={field.required}
        helperText={helperText}
        error={error}
      />
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[var(--text-sm)] font-medium text-[var(--color-text)]">
        {field.label}
        {field.required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
      </label>
      <Input
        id={id}
        type={field.type === "tel" ? "tel" : field.type === "email" ? "email" : "text"}
        inputMode={
          field.type === "tel" ? "tel" : field.type === "email" ? "email" : "text"
        }
        autoComplete={autoCompleteFor(field.name)}
        placeholder={field.placeholder}
        value={value}
        invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
        maxLength={field.maxLength}
      />
      {helperText && !error && (
        <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">{helperText}</p>
      )}
      {error && (
        <p className="text-[var(--text-xs)] text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function autoCompleteFor(name: string): string {
  const k = name.toLowerCase();
  if (k.includes("name")) return "name";
  if (k.includes("phone") || k.includes("tel")) return "tel";
  if (k.includes("email")) return "email";
  if (k.includes("line1") || k === "address" || k === "addressline1") return "address-line1";
  if (k.includes("line2") || k === "addressline2") return "address-line2";
  if (k.includes("postal") || k.includes("zip")) return "postal-code";
  if (k.includes("city")) return "address-level2";
  return "off";
}
