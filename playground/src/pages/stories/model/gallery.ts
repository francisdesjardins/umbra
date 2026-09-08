import { createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DialogManagerProvider } from 'umbra/react';
import { STORY_LOADERS } from './story-loaders';

/**
 * The gallery contract Playwright’s `mount` fixture drives.
 *
 * The stories model has no bundler of its own: the page is the app’s, built by the app’s Vite with
 * the app’s plugins — which is why this lives in the playground rather than beside the specs.
 *
 * **One harness per page, loaded on demand.** `story-loaders.ts` is generated from the story files
 * (`yarn story-ids`), so nothing is listed by hand and nothing but the mounted harness is pulled
 * in — a correctness property before a speed one: importing them all runs every module-level side
 * effect in the app on every test page.
 */
type StoryProps = Record<string, unknown>;
type Story = (props: StoryProps) => ReactNode;

/** Playwright scopes the Locator it returns to `#root`, so that is where a story goes. */
const ROOT_ID = 'root';

let root: Root | null = null;

/** Render one story. Reuses the root, so `component.update(props)` reconciles rather than remounts. */
export async function mount({
  story,
  props = {},
}: {
  story: string;
  props?: StoryProps;
}): Promise<void> {
  const load = STORY_LOADERS[story];
  if (!load) {
    // Rejecting, not rendering nothing: a mistyped id must fail the test that asked for it.
    throw new Error(`Unknown story "${story}"`);
  }

  const component = (await load())[story] as Story | undefined;
  if (!component) {
    throw new Error(`"${story}" is not exported by the module the registry names for it`);
  }

  const host =
    document.getElementById(ROOT_ID) ??
    document.body.appendChild(Object.assign(document.createElement('div'), { id: ROOT_ID }));
  root ??= createRoot(host);
  // One manager per story, so registrations never leak between tests.
  root.render(createElement(DialogManagerProvider, null, createElement(component, props)));

  // A frame, so the caller's first query runs against a committed tree.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

/** Tear the story down. The root is kept: the next mount reconciles into it. */
export function unmount(): Promise<void> {
  root?.render(null);
  return Promise.resolve();
}
