import { useState } from "react";
import * as Switch from "@radix-ui/react-switch";
import { Gift } from "lucide-react";
import { Button, Textarea } from "@/components/atoms";
import { useAppStore } from "@/store";
import { pickStrings } from "@/i18n";

export interface GiftMessageFieldProps {
  defaultValue?: string;
  onSave: (message: string | null) => void;
  maxLength?: number;
}

export function GiftMessageField({ defaultValue = "", onSave, maxLength = 200 }: GiftMessageFieldProps) {
  const locale = useAppStore((s) => s.locale);
  const t = pickStrings(locale);
  const [open, setOpen] = useState(defaultValue.length > 0);
  const [value, setValue] = useState(defaultValue);

  const charsLeft = maxLength - value.length;
  const lowChars = charsLeft <= 20;

  return (
    <section className="px-4 md:px-6 py-4 md:py-6">
      <div className="rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="gift-toggle" className="flex items-center gap-2 cursor-pointer">
            <span className="grid place-items-center w-9 h-9 rounded-full bg-[var(--color-surface-warm)] text-[var(--color-cta)]">
              <Gift size={18} />
            </span>
            <span className="text-[var(--text-base)] font-semibold text-[var(--color-text)]">
              {t.gift.toggle}
            </span>
          </label>
          <Switch.Root
            id="gift-toggle"
            checked={open}
            onCheckedChange={(c) => {
              setOpen(c);
              if (!c) onSave(null);
            }}
            className="w-11 h-6 rounded-full bg-[var(--color-border)] data-[state=checked]:bg-[var(--color-cta)] relative cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-cta)]"
          >
            <Switch.Thumb className="block w-5 h-5 rounded-full bg-white translate-x-0.5 data-[state=checked]:translate-x-5 transition-transform" />
          </Switch.Root>
        </div>
        {open && (
          <div className="mt-4 flex flex-col gap-2">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
              placeholder={t.gift.placeholder}
              maxLength={maxLength}
              aria-label={t.gift.toggle}
            />
            <div className="flex items-center justify-between">
              <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">{t.gift.help}</p>
              <p
                className={
                  lowChars
                    ? "text-[var(--text-xs)] text-[var(--color-warn)]"
                    : "text-[var(--text-xs)] text-[var(--color-text-muted)]"
                }
              >
                {t.gift.charsLeft(charsLeft)}
              </p>
            </div>
            <div className="flex justify-end">
              <Button size="md" onClick={() => onSave(value.trim() || null)}>
                {t.gift.save}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
