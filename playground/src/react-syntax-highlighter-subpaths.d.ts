/**
 * Subpath types for `react-syntax-highlighter`: `CodeBlock` imports through subpaths because the
 * barrels re-export the full Prism build and all 47 themes, which Vite's unbundled dev serving makes
 * a named import pay for in full. `@types/react-syntax-highlighter` declares these modules and the
 * compiler still reports TS7016 — the specifier resolves to the shipped `.js` with no declaration
 * beside it, and a successful resolution is not reconsidered against an ambient one, so only
 * restating them in a file the program includes is honoured. (Measured: dropping `"*": ["./*"]` from
 * `playground/tsconfig.json` changes nothing — the `paths` catch-all is not what shadows them.)
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
