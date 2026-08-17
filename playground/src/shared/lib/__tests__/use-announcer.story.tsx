import { useAnnouncer } from '../use-announcer';

/** A trigger beside its announcer: the region is in the tree from the first render. */
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
