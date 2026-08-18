/**
 * One top-level declaration cut out of a `?raw` module, so a code panel about a single harness shows
 * that harness rather than the sixteen hundred lines it shares a file with. Line-anchored rather
 * than parsed: prettier already guarantees the only grammar this needs — a top-level declaration at
 * column 0 with its doc comment directly above — and a real parser in the viewer would be a second
 * compiler shipped to read source it already has as text.
 *
 * **Not exports only.** A harness file's subject is often un-exported, the export beside it being a
 * three-line wrapper; slicing that would show the reader everything except what the card is about.
 */

/** A declaration at column 0, `export` or not. Anything indented belongs to one and is not a boundary. */
const DECLARATION =
  /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/u;

/**
 * The block's own doc comment, walked back from the declaration — a slice that drops it loses the
 * sentence saying what the harness discriminates, which is the reason the card exists.
 */
function docStart(lines: readonly string[], declaration: number): number {
  let start = declaration;
  while (start > 0 && lines[start - 1]?.startsWith('//')) {
    start -= 1;
  }
  if (start === 0 || !lines[start - 1]?.trimEnd().endsWith('*/')) {
    return start;
  }
  let open = start - 1;
  while (open > 0 && !lines[open]?.trimStart().startsWith('/*')) {
    open -= 1;
  }
  return open;
}

/**
 * @param source - The module's text, as a `?raw` import hands it over.
 * @param name - The top-level declaration to cut, by name.
 * @returns Everything from its doc comment through its last line, trailing blanks trimmed.
 * @throws If nothing at the top level is declared by that name — a card pointing at a renamed symbol
 *   is the drift this exists to make loud, and a whole-file fallback would hide it behind a panel
 *   that still renders.
 */
export function sliceDeclaration(source: string, name: string): string {
  const lines = source.split('\n');
  const declaration = lines.findIndex((line) => {
    return DECLARATION.exec(line)?.[1] === name;
  });
  if (declaration === -1) {
    throw new Error(`sliceDeclaration: nothing declared as ${name}`);
  }

  let end = lines.length;
  for (let i = declaration + 1; i < lines.length; i += 1) {
    if (DECLARATION.test(lines[i] ?? '')) {
      end = docStart(lines, i);
      break;
    }
  }

  return lines.slice(docStart(lines, declaration), end).join('\n').replace(/\s+$/u, '');
}

/** The same, for a card whose subject is spread over more than one declaration. */
export function sliceDeclarations(source: string, names: readonly string[]): string {
  return names
    .map((name) => {
      return sliceDeclaration(source, name);
    })
    .join('\n\n');
}
