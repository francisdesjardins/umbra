/**
 * Subpath types for `react-syntax-highlighter`.
 *
 * `CodeBlock` imports through subpaths deliberately: the package's own barrels re-export the full
 * Prism build and all 47 themes, and Vite serves modules unbundled in dev, so a named import
 * through either one still costs the whole of it.
 *
 * `@types/react-syntax-highlighter` declares every one of these modules — and the compiler still
 * reports TS7016 for each. The specifier resolves to the shipped `.js`, which has no declaration
 * beside it, and a resolution that succeeds is not reconsidered against an ambient declaration
 * elsewhere. Restating them in a file the program already includes is what the resolver honours.
 * (Measured: removing the `"*": ["./*"]` mapping from `playground/tsconfig.json` changes nothing —
 * the `paths` catch-all is not what shadows them.)
 */

declare module 'react-syntax-highlighter/dist/esm/prism-light' {
  import type * as React from 'react';
  import type { SyntaxHighlighterProps } from 'react-syntax-highlighter';

  export default class SyntaxHighlighter extends React.Component<SyntaxHighlighterProps> {
    static registerLanguage(name: string, func: unknown): void;
  }
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/bash' {
  const grammar: unknown;
  export default grammar;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/css' {
  const grammar: unknown;
  export default grammar;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/markup' {
  const grammar: unknown;
  export default grammar;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/tsx' {
  const grammar: unknown;
  export default grammar;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism/one-dark' {
  import type { CSSProperties } from 'react';

  const style: Record<string, CSSProperties>;
  export default style;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism/one-light' {
  import type { CSSProperties } from 'react';

  const style: Record<string, CSSProperties>;
  export default style;
}
