import type { ReactNode } from "react";

// A tokenizer for .tw source, not a parser. It exists so the examples on this
// page read like code rather than like a quotation, and it deliberately does no
// more than that: five token classes, no shape or unit awareness. Hand-rolled
// because the alternative is shipping a highlighter library an order of
// magnitude larger than the thing it is colouring.

const KEYWORDS = new Set([
  "let", "fn", "for", "in", "if", "else", "return", "type", "unit", "mode",
  "import", "as", "true", "false", "while", "break", "continue", "struct",
]);

const BUILTINS = new Set([
  "grad", "grads", "value_and_grad", "jacobian", "hessian", "seed", "randn",
  "exp", "log", "sqrt", "square", "abs", "clip", "relu", "sigmoid", "tanh",
  "softmax", "logsumexp", "sum", "mean", "max", "min", "prod", "median",
  "argmax", "argmin", "len", "range", "reshape", "transpose", "concat",
  "split", "einsum", "conv2d", "maxpool2d", "gather", "cumsum", "cumprod",
  "sort", "argsort", "topk", "where", "maximum", "minimum", "save", "load",
  "read_csv", "read_frame", "print", "broadcast_to", "flip", "roll", "diff",
]);

// Order matters: comment and string before number, so a '#' inside neither and
// a digit inside a string are not mis-taken.
const TOKEN = /(#[^\n]*)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g;

/** Split twill source into coloured spans. Text outside any match is passed through. */
export function highlight(source: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const m of source.matchAll(TOKEN)) {
    const at = m.index;
    if (at > last) out.push(source.slice(last, at));
    last = at + m[0].length;

    const [, comment, str, num, ident] = m;
    if (comment) out.push(<span key={key++} className="tok-com">{comment}</span>);
    else if (str) out.push(<span key={key++} className="tok-str">{str}</span>);
    else if (num) out.push(<span key={key++} className="tok-num">{num}</span>);
    else if (ident && KEYWORDS.has(ident)) out.push(<span key={key++} className="tok-kw">{ident}</span>);
    else if (ident && BUILTINS.has(ident)) out.push(<span key={key++} className="tok-fn">{ident}</span>);
    else out.push(m[0]);
  }

  if (last < source.length) out.push(source.slice(last));
  return out;
}
