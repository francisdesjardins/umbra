/**
 * Anchor id for a section heading — `"Rendering & events"` → `"rendering-events"`. Shared by
 * `ExampleSection` (which stamps the id) and `SectionNav` (which links to it), so they can't drift.
 */
export const sectionSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};
