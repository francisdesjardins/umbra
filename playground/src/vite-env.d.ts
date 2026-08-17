/// <reference types="vite/client" />

declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module '*.tsx?raw' {
  const content: string;
  export default content;
}

declare module '*.ts?raw' {
  const content: string;
  export default content;
}

declare module '*.css?raw' {
  const content: string;
  export default content;
}

// The microfrontend frame's files as text: they live in `public/`, mounted at `/` and so with no
// importable address, so `mfeUmbraPlugin` reads them off disk.
declare module 'virtual:mfe-sources' {
  export const host: string;
  export const checkout: string;
  export const billing: string;
  export const support: string;
  export const audit: string;
}

// Re-exported from the emitting plugin rather than restated, so the page cannot type-check against
// a stale projection.
declare module 'virtual:dialog-api' {
  export type { ApiCategory, ApiMember, ApiSymbol, DocPart } from '../vite-plugins/api-model.ts';

  const model: readonly import('../vite-plugins/api-model.ts').ApiCategory[];
  export default model;
}
