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

// The microfrontend frame's hand-written files, as text. They live in `public/`, which is mounted
// at `/` and therefore has no importable address — `mfeUmbraPlugin` reads them off disk instead.
declare module 'virtual:mfe-sources' {
  export const host: string;
  export const checkout: string;
  export const billing: string;
  export const support: string;
  export const audit: string;
}

// The shape is owned by the plugin that emits it — re-exported here rather than restated, so
// a change to the projection cannot leave the page type-checking against a stale model.
declare module 'virtual:dialog-api' {
  export type { ApiCategory, ApiMember, ApiSymbol, DocPart } from '../vite-plugins/api-model.ts';

  const model: readonly import('../vite-plugins/api-model.ts').ApiCategory[];
  export default model;
}
