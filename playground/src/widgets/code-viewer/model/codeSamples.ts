/**
 * Which samples the viewer downloads, and when.
 *
 * Every example's source as text is ~550 kB — three quarters of it serving two routes, since
 * `/stories` shows 82 test harnesses and `/ui-templates` a catalogue of 86 components. Naming them
 * all in one module meant opening the viewer on `/getting-started` to read one file fetched the
 * other two hundred.
 *
 * **The three groups are cut by where a sample comes from, not by how its key is spelled.**
 * `vanilla-form` is a `/ui-integrations` example and `vanilla-msg-title` is a template; only the
 * import path separates them, so a prefix rule would put the example in the catalogue.
 *
 * Adding an example means one `?raw` import in the group's module — `code-samples/examples.ts` for
 * a route's own example, `templates.ts` for anything under `entities/modal-template`, `shared/ui`
 * or `shared/lib`, `stories.ts` for a `*.story.tsx`.
 */
const LOADERS = {
  examples: async () => {
    return (await import('./code-samples/examples')).examples;
  },
  templates: async () => {
    return (await import('./code-samples/templates')).templates;
  },
  stories: async () => {
    return (await import('./code-samples/stories')).stories;
  },
} as const;

type Group = keyof typeof LOADERS;

/**
 * The two routes whose samples are their own; everything else demonstrates the library and reads
 * from `examples`.
 *
 * Keyed by route rather than by sample, so adding an example does not mean editing an index here
 * as well as the module it lives in — the pair would drift, and nothing would fail when it did.
 */
const GROUP_FOR_ROUTE: Readonly<Record<string, Group>> = {
  '/stories': 'stories',
  '/ui-templates': 'templates',
};

/**
 * The samples for one viewing, chosen from the route and checked against the key.
 *
 * The key check is the safety net for the one thing the route cannot tell us: a page showing a
 * sample that belongs to another group. It costs nothing on every normal open and keeps a
 * mis-placed key rendering rather than reporting "No code available".
 */
export const loadCodeSamples = async (
  pathname: string,
  codeKey: string
): Promise<Record<string, string>> => {
  const preferred = GROUP_FOR_ROUTE[pathname] ?? 'examples';
  const samples = await LOADERS[preferred]();
  if (codeKey in samples) {
    return samples;
  }

  for (const [group, load] of Object.entries(LOADERS)) {
    if (group === preferred) {
      continue;
    }
    const other = await load();
    if (codeKey in other) {
      return other;
    }
  }

  return samples;
};
