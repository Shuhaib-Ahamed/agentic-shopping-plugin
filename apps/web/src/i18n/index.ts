import type { Locale } from "@kapruka/protocol";
import { en, type Strings } from "./en";
import { si } from "./si";
import { ta } from "./ta";

export const strings: Record<Locale, Strings> = { en, si, ta };

export function pickStrings(locale: Locale): Strings {
  return strings[locale] ?? en;
}

export type { Strings };
