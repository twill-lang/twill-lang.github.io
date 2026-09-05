import type { ReactNode } from "react";

// A tokenizer for .tw source, not a parser. It exists so the examples on this
// page read like code rather than like a quotation, and it deliberately does no
// more than that: six token classes, no shape or unit awareness. Hand-rolled
// because the alternative is shipping a highlighter library an order of
// magnitude larger than the thing it is colouring.

// Taken from the language's own keyword table (`src/lex.tw` keyword_table),
// plus `unit` and `mode`, which are declaration words rather than reserved
// ones. `match` and `enum` were missing, which meant the two constructs the
// pattern section of the home page is ABOUT rendered as undifferentiated plain
// text in the sample demonstrating them.
const KEYWORDS = new Set([
  "let", "fn", "if", "else", "while", "for", "in", "return", "import",
  "true", "false", "and", "or", "not", "band", "bor", "xor", "shl", "shr",
  "enum", "match", "struct", "break", "continue",
  "unit", "mode", "systems",
]);

const BUILTINS = new Set([
  "grad", "grads", "value_and_grad", "jacobian", "hessian", "seed", "randn",
  "exp", "log", "sqrt", "square", "abs", "clip", "relu", "sigmoid", "tanh",
  "softmax", "logsumexp", "sum", "mean", "max", "min", "prod", "median",
  "argmax", "argmin", "len", "range", "reshape", "transpose", "concat",
  "split", "einsum", "conv2d", "maxpool2d", "gather", "cumsum", "cumprod",
  "sort", "argsort", "topk", "where", "maximum", "minimum", "save", "load",
  "read_csv", "read_frame", "print", "broadcast_to", "flip", "roll", "diff",
  "zeros", "ones", "scalar",
  // 1.8's process interface and 1.7's filesystem set. `run` in particular is
  // the subject of a whole section and was rendering as an ordinary name.
  "run", "read_file", "read_file_at", "write_file", "path_exists", "mkdir_all",
  "remove_all", "rename", "mtime", "temp_dir", "cwd", "mono_ns",
]);

// Constructors, so `Ok`, `Err`, `Some` and `None` read as the cases they are.
// A capital initial is the language's own rule for what names a case, which is
// what makes this one line rather than a list to keep current.
const CASE = /^[A-Z][A-Za-z0-9_]*$/;

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
    else if (ident && CASE.test(ident)) out.push(<span key={key++} className="tok-type">{ident}</span>);
    else out.push(m[0]);
  }

  if (last < source.length) out.push(source.slice(last));
  return out;
}
