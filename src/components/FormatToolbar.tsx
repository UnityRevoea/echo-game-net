import { Bold, Italic, Code, Quote, Link2, EyeOff } from "lucide-react";
import type { RefObject } from "react";

interface Props {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
}

function wrap(ta: HTMLTextAreaElement, before: string, after: string, placeholder: string) {
  const { selectionStart, selectionEnd, value } = ta;
  const selected = value.slice(selectionStart, selectionEnd) || placeholder;
  const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
  return { next, caret: selectionStart + before.length + selected.length + after.length };
}

function linePrefix(ta: HTMLTextAreaElement, prefix: string) {
  const { selectionStart, value } = ta;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  return { next, caret: selectionStart + prefix.length };
}

export function FormatToolbar({ textareaRef, value, onChange }: Props) {
  const apply = (fn: (ta: HTMLTextAreaElement) => { next: string; caret: number }) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { next, caret } = fn(ta);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  };

  const insertLink = () => {
    const url = window.prompt("Link URL (https://...)");
    if (!url || !/^https?:\/\//i.test(url)) return;
    apply((ta) => wrap(ta, "[", `](${url})`, "link text"));
  };

  const tools = [
    { icon: Bold, label: "Bold", run: () => apply((ta) => wrap(ta, "**", "**", "bold text")) },
    { icon: Italic, label: "Italic", run: () => apply((ta) => wrap(ta, "*", "*", "italic")) },
    { icon: Code, label: "Code", run: () => apply((ta) => wrap(ta, "`", "`", "code")) },
    { icon: Quote, label: "Quote", run: () => apply((ta) => linePrefix(ta, "> ")) },
    { icon: Link2, label: "Link", run: insertLink },
    { icon: EyeOff, label: "Spoiler", run: () => apply((ta) => wrap(ta, "||", "||", "hidden")) },
  ];

  return (
    <div className="flex items-center gap-1 px-1 py-1.5 border-b border-border/60">
      {tools.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={t.run}
          title={t.label}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
        >
          <t.icon className="h-3.5 w-3.5" />
        </button>
      ))}
      <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono pr-1">
        markdown
      </span>
    </div>
  );
}
