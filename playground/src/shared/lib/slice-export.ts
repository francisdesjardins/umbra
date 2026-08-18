/**
 * One exported declaration cut out of a `?raw` module, so a code panel about a single harness shows
 * that harness rather than the sixteen hundred lines it shares a file with. Line-anchored rather
 * than parsed: prettier guarantees a top-level `export` at column 0 with its doc comment directly
 * above, which is the whole grammar this needs — and a real parser in the viewer would be a second
 * compiler shipped to read source it already has as text.
 */

/** A top-level declaration, exported. Anything indented belongs to one and is not a boundary. */
const EXPORT_LINE =
  /^export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/u;

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
 * @param exportName - The declaration to cut, by name.
 * @returns Everything from its doc comment through its last line, trailing blanks trimmed.
 * @throws If nothing by that name is exported — a card pointing at a renamed symbol is the drift
 *   this exists to make loud, and a whole-file fallback would hide it behind a panel that still
 *   renders.
 */
export function sliceExport(source: string, exportName: string): string {
  const lines = source.split('\n');
  const declaration = lines.findIndex((line) => {
    return EXPORT_LINE.exec(line)?.[1] === exportName;
  });
  if (declaration === -1) {
    throw new Error(`sliceExport: nothing exported as ${exportName}`);
  }

  let end = lines.length;
  for (let i = declaration + 1; i < lines.length; i += 1) {
    if (EXPORT_LINE.test(lines[i] ?? '')) {
      end = docStart(lines, i);
      break;
    }
  }

  return lines.slice(docStart(lines, declaration), end).join('\n').replace(/\s+$/u, '');
}
