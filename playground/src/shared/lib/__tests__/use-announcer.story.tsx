import { useAnnouncer } from '../use-announcer';

/**
 * A trigger beside its announcer — the shape the hook is for: the region is in the tree from the
 * first render, long before there is anything to say.
 */
export function UseAnnouncerHarness() {
  const { announce, region } = useAnnouncer();

  return (
    <>
      <button
        data-testid="announce"
        onClick={() => {
          announce('Changes saved');
        }}
        type="button"
      >
        Announce
      </button>
      {region}
    </>
  );
}
