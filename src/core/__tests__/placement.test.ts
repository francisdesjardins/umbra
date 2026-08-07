import { expect, test } from '@playwright/test';
import { dialogPlacement } from '../placement.js';

test.describe('dialogPlacement', () => {
  test('a modal dialog is positioned by the top layer, so it needs neither host nor styles', () => {
    expect(dialogPlacement()).toEqual({ host: null, dialog: {} });
    expect(dialogPlacement({ nonModal: false, portal: true })).toEqual({ host: null, dialog: {} });
  });

  test('a portaled non-modal dialog anchors to the viewport', () => {
    expect(dialogPlacement({ nonModal: true, portal: true })).toEqual({
      host: null,
      dialog: { position: 'fixed', inset: 0 },
    });
  });

  test('a contained non-modal dialog anchors to a host it fills', () => {
    const { host, dialog } = dialogPlacement({ nonModal: true });

    // `absolute` against a host the library owns is the point: the closest positioned ancestor
    // wins, so a transformed ancestor higher up cannot hijack the containing block.
    expect(dialog).toMatchObject({ position: 'absolute', inset: 0 });
    // The host is absolute too, and that is not a detail: a block in the flow is laid out after
    // whatever it was meant to cover, so opening the dialog would push the region's own content
    // out of it. `inset: 0` fills the same box without taking a place in the layout.
    expect(host).toMatchObject({
      position: 'absolute',
      inset: 0,
      minHeight: 0,
    });
  });

  test('the host is not a hit target; the dialog inside it is', () => {
    const { host, dialog } = dialogPlacement({ nonModal: true });

    // The host covers its whole region for the lifetime of the modal, closed included. Without
    // this pair, everything behind it — the trigger that opens the dialog, most of all — stops
    // being clickable the moment a contained dialog is mounted.
    expect(host).toMatchObject({ pointerEvents: 'none' });
    expect(dialog).toMatchObject({ pointerEvents: 'auto' });
  });

  test('clip is what stops a slide from growing the document instead of moving', () => {
    expect(dialogPlacement({ nonModal: true, clip: true }).host).toMatchObject({
      overflow: 'clip',
    });
    // `hidden` would still create a scroll container a transformed descendant can grow.
    expect(dialogPlacement({ nonModal: true, clip: true }).host?.['overflow']).not.toBe('hidden');
  });

  test('clip has nothing to clip without a host', () => {
    expect(dialogPlacement({ nonModal: true, portal: true, clip: true }).host).toBeNull();
    expect(dialogPlacement({ clip: true }).host).toBeNull();
  });

  test('the shared host object is never mutated by a clipped placement', () => {
    const clipped = dialogPlacement({ nonModal: true, clip: true });
    const plain = dialogPlacement({ nonModal: true });

    expect(clipped.host).toMatchObject({ overflow: 'clip' });
    expect(plain.host).not.toHaveProperty('overflow');
  });
});
