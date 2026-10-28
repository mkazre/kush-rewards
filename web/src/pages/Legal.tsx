// Public legal pages (/privacy, /terms, /community-rules, /support). The text is shared with
// the mobile app (mobile/src/lib/legalContent.ts) so both always say the same thing.
import { Fragment, type ReactNode } from "react";
import { COPYRIGHT, LEGAL_DOCS, LEGAL_UPDATED, type LegalBlock, type LegalDocKey } from "@shared/lib/legalContent";
import { useSiteConfig } from "../lib/queries";
import { SUPPORT_EMAIL_FALLBACK } from "../lib/site";

/** Renders **bold**, [[placeholder]] (highlighted) and {{support}} (email link). */
function Rich({ text, support }: { text: string; support: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\]|\{\{support\}\})/g);
  return (
    <>
      {parts.map((p, i): ReactNode => {
        if (p.startsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("[[")) return <mark key={i} className="rounded bg-accent-soft px-1 text-accent-soft-fg">[{p.slice(2, -2)}]</mark>;
        if (p === "{{support}}") return <a key={i} className="font-semibold text-primary underline" href={`mailto:${support}`}>{support}</a>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

function Block({ b, support }: { b: LegalBlock; support: string }) {
  switch (b.type) {
    case "h2":
      return <h2 className="mt-8 text-xl font-bold">{b.text}</h2>;
    case "h3":
      return <h3 className="mt-5 font-bold">{b.text}</h3>;
    case "p":
      return <p className="mt-3"><Rich text={b.text} support={support} /></p>;
    case "bullets":
    case "numbered": {
      const List = b.type === "bullets" ? "ul" : "ol";
      return (
        <List className={`mt-3 space-y-1.5 pl-5 ${b.type === "bullets" ? "list-disc" : "list-decimal"}`}>
          {b.items.map((it, i) => <li key={i}><Rich text={it} support={support} /></li>)}
        </List>
      );
    }
    case "kv":
      return (
        <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-xl bg-muted p-4 sm:grid-cols-[auto_1fr]">
          {b.rows.map(([k, v]) => (
            <Fragment key={k}>
              <dt className="font-semibold">{k}</dt>
              <dd><Rich text={v} support={support} /></dd>
            </Fragment>
          ))}
        </dl>
      );
  }
}

export default function Legal({ doc }: { doc: LegalDocKey }) {
  const d = LEGAL_DOCS[doc];
  const support = useSiteConfig().data?.supportEmail || SUPPORT_EMAIL_FALLBACK;
  return (
    <article className="mx-auto max-w-3xl leading-relaxed">
      <h1 className="text-3xl font-extrabold">{d.title}</h1>
      {d.showUpdated && <p className="mt-1 text-sm text-muted-fg">Last updated {LEGAL_UPDATED}</p>}
      {d.intro && <p className="mt-4 text-lg"><Rich text={d.intro} support={support} /></p>}
      {doc === "support" && (
        <a className="btn-primary mt-4" href={`mailto:${support}`}>Email support</a>
      )}
      {d.blocks.map((b, i) => <Block key={i} b={b} support={support} />)}
      <p className="mt-10 text-sm text-muted-fg">{COPYRIGHT}</p>
    </article>
  );
}
