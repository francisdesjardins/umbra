import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * What the render callback can see of its own dialog's lifecycle, and that it is the same answer
 * the hook return gives rather than a second one.
 *
 * **Publish** is the case `phase` exists for: the action stops running the moment its handler
 * resolves, so `render-busy` goes quiet while the panel is still painted, and `render-held` — the
 * same flag with `phase === 'closing'` beside it — does not. On a page that animates, the two
 * disagree for the length of the exit; in a component test they never do, because transitions are
 * off in a harness and `runCloseSequence` finalizes with no exit to observe. **Close** is the
 * plain path, and the one an assertion can hold to.
 */
export function RenderPhaseHarness() {
  const dialog = useDialog<void, 'publish' | 'close'>({
    id: 'render-phase',
    ariaLabel: 'Render phase',
    animation: {
      entrance: { opacity: 1 },
      exit: { opacity: 0 },
      duration: 0,
      // Long, so the disagreement is legible on `/stories` rather than a flicker.
      exitDuration: 900,
      transitionProperty: 'opacity',
    },
    render: ({ action, handle, hasRunningAction, phase }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="render-phase">{phase}</span>
          {/* The pair `phase` separates: the flag alone goes quiet before the panel does. */}
          <span data-testid="render-busy">{hasRunningAction ? 'busy' : 'idle'}</span>
          <span data-testid="render-held">
            {hasRunningAction || phase === 'closing' ? 'busy' : 'idle'}
          </span>
          <button
            data-testid="publish"
            {...action('publish', async (close) => {
              await new Promise((resolve) => {
                setTimeout(resolve, 120);
              });
              close();
            })}
          >
            Publish
          </button>
          <button
            data-testid="close-direct"
            onClick={() => {
              handle.close('close');
            }}
          >
            Close
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <span data-testid="hook-phase">{dialog.phase}</span>
      <span data-testid="hook-visible">{dialog.isVisible ? 'visible' : 'gone'}</span>
      <button
        data-testid="open"
        onClick={() => {
          void dialog.open();
        }}
      >
        Open
      </button>
      {dialog.Dialog}
    </div>
  );
}
