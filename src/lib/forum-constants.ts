export const POST_CATEGORIES = [
  { value: "general", label: "General", dot: "bg-violet-400", chip: "bg-violet-500/10 text-violet-200 border-violet-500/25" },
  { value: "games", label: "Games", dot: "bg-blue-400", chip: "bg-blue-500/10 text-blue-200 border-blue-500/25" },
  { value: "lfg", label: "LFG", dot: "bg-emerald-400", chip: "bg-emerald-500/10 text-emerald-200 border-emerald-500/25" },
  { value: "help", label: "Help", dot: "bg-amber-400", chip: "bg-amber-500/10 text-amber-200 border-amber-500/25" },
  { value: "news", label: "News", dot: "bg-pink-400", chip: "bg-pink-500/10 text-pink-200 border-pink-500/25" },
  { value: "off-topic", label: "Off-Topic", dot: "bg-slate-400", chip: "bg-slate-500/10 text-slate-200 border-slate-500/25" },
  { value: "memes", label: "Memes", dot: "bg-fuchsia-400", chip: "bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-500/25" },
  { value: "creations", label: "Creations", dot: "bg-cyan-400", chip: "bg-cyan-500/10 text-cyan-200 border-cyan-500/25" },
  { value: "guides", label: "Guides", dot: "bg-lime-400", chip: "bg-lime-500/10 text-lime-200 border-lime-500/25" },
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number]["value"];

export function getCategory(value: string | null | undefined) {
  return POST_CATEGORIES.find((c) => c.value === value) ?? POST_CATEGORIES[0];
}

export function categoryChipClass(value: string | null | undefined) {
  return getCategory(value).chip;
}

export const REPORT_CATEGORIES = [
  { value: "spam", label: "Spam or advertising" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate_speech", label: "Hate speech or discrimination" },
  { value: "inappropriate", label: "Sexual or inappropriate content" },
  { value: "threats", label: "Threats or violence" },
  { value: "self_harm", label: "Self-harm or dangerous behavior" },
  { value: "impersonation", label: "Impersonation" },
  { value: "scam", label: "Scam or phishing" },
  { value: "underage", label: "Underage user" },
  { value: "other", label: "Other (describe below)" },
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]["value"];

export function getReportCategoryLabel(value: string) {
  return REPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
