/**
 * Which samples the viewer downloads, and when: ~600 kB of source text, two thirds of it for the two
 * routes that index things — `/stories` and `/ui-templates` — so one module fetched everything.
 * **Groups are cut by where a sample comes from, not how its key is spelled** — `vanilla-form` is a
 * `/ui-integrations` example, `vanilla-msg-title` a template. Add a `?raw` import to `examples.ts`
 * (a route's own), `templates.ts` (`entities/dialog-template`, `shared/*`) or `stories.ts` (`*.story.tsx`).
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

/** The two routes with their own samples; keyed by route so adding one need not edit an index here. */
const GROUP_FOR_ROUTE: Readonly<Record<string, Group>> = {
  '/stories': 'stories',
  '/ui-templates': 'templates',
};

/** From the route, then checked against the key so another group's sample still renders. */
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
