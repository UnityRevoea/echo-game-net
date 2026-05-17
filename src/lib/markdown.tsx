import { useState } from "react";

// Tiny safe markdown-ish renderer. Supports:
// **bold**, *italic*, `code`, > quote, [text](url), line breaks, ||spoiler||
// All HTML is escaped before regex replacement. No raw HTML passthrough.

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(s: string): string {
  let out = escapeHtml(s);
  // inline code first
  out = out.replace(/`([^`\n]+)`/g, (_, c) => `<code>${c}</code>`);
  // bold
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  // italic
  out = out.replace(/(^|\s)\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // links — only http(s)
  out = out.replace(/\[([^\]\n]{1,80})\]\((https?:\/\/[^\s)]+)\)/g, (_, t, u) =>
    `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`,
  );
  // spoiler — ||text||
  out = out.replace(/\|\|([^|\n]+)\|\|/g, '<span class="spoiler" data-spoiler="1">$1</span>');
  return out;
}

interface Block { type: "p" | "quote"; html: string }

function parseBlocks(src: string): Block[] {
  const lines = src.split(/\r?\n/);
  const blocks: Block[] = [];
  let para: string[] = [];
  let quote: string[] = [];
  const flush = () => {
    if (para.length) { blocks.push({ type: "p", html: para.map(renderInline).join("<br/>") }); para = []; }
    if (quote.length) { blocks.push({ type: "quote", html: quote.map(renderInline).join("<br/>") }); quote = []; }
  };
  for (const raw of lines) {
    const line = raw;
    if (/^\s*>\s?/.test(line)) {
      if (para.length) { blocks.push({ type: "p", html: para.map(renderInline).join("<br/>") }); para = []; }
      quote.push(line.replace(/^\s*>\s?/, ""));
    } else if (line.trim() === "") {
      flush();
    } else {
      if (quote.length) { blocks.push({ type: "quote", html: quote.map(renderInline).join("<br/>") }); quote = []; }
      para.push(line);
    }
  }
  flush();
  return blocks;
}

export function PostBody({ content, contentWarning }: { content: string; contentWarning?: string | null }) {
  const [revealed, setRevealed] = useState(false);
  const blocks = parseBlocks(content);

  const body = (
    <div
      className="prose-mini whitespace-normal leading-relaxed text-[15px] space-y-2"
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.dataset?.spoiler === "1") t.classList.toggle("revealed");
      }}
    >
      {blocks.map((b, i) =>
        b.type === "quote" ? (
          <blockquote key={i} dangerouslySetInnerHTML={{ __html: b.html }} />
        ) : (
          <p key={i} dangerouslySetInnerHTML={{ __html: b.html }} />
        ),
      )}
    </div>
  );

  if (contentWarning) {
    return (
      <div>
        <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs flex items-center justify-between gap-3">
          <span className="text-amber-200">⚠ Content warning: <span className="font-semibold">{contentWarning}</span></span>
          <button
            onClick={() => setRevealed((v) => !v)}
            className="text-amber-200 hover:text-amber-100 underline underline-offset-2 font-medium"
          >
            {revealed ? "Hide" : "Show anyway"}
          </button>
        </div>
        {revealed ? body : <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-xs text-muted-foreground">Hidden by content warning.</div>}
      </div>
    );
  }

  return body;
}

// Extract a leading content warning marker like "[CW: spoilers for Elden Ring]\n\n..."
// Returns { warning, body } — warning is null if no marker.
export function splitContentWarning(content: string): { warning: string | null; body: string } {
  const m = content.match(/^\s*\[(?:CW|SPOILER|NSFW)(?::\s*([^\]]+))?\]\s*\n?/i);
  if (!m) return { warning: null, body: content };
  const label = m[1]?.trim();
  const tag = /SPOILER/i.test(m[0]) ? "Spoiler" : /NSFW/i.test(m[0]) ? "NSFW" : "Content warning";
  return { warning: label ? `${tag} — ${label}` : tag, body: content.slice(m[0].length) };
}
