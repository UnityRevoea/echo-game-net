export const POST_CATEGORIES = [
  { value: "general", label: "General", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  { value: "games", label: "Games", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { value: "lfg", label: "Looking for Group", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { value: "help", label: "Help & Support", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { value: "news", label: "News", color: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  { value: "off-topic", label: "Off-Topic", color: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  { value: "memes", label: "Memes", color: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
  { value: "creations", label: "Creations", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number]["value"];

export function getCategory(value: string | null | undefined) {
  return POST_CATEGORIES.find((c) => c.value === value) ?? POST_CATEGORIES[0];
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
