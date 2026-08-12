import { expect, test } from '@playwright/test';
import { dialogPlacement } from '../placement.js';

test.describe('dialogPlacement', () => {
  test('a modal dialog is positioned by the top layer, so it needs neither host nor styles', () => {
    expect(dialogPlacement()).toEqual({ host: null, dialog: {}, backdrop: null });
    expect(dialogPlacement({ nonModal: false, portal: true })).toEqual({
      host: null,
      dialog: {},
      // The browser draws this one, in the top layer, where nothing can come between it and the
      // page. A scrim of our own would be a second one, below the dialog it belongs to.
      backdrop: null,
    });
  });

  test('a portaled non-modal dialog anchors to the viewport', () => {
    expect(dialogPlacement({ nonModal: true, portal: true })).toEqual({
      host: null,
      dialog: { position: 'fixed', inset: 0 },
      // Fixed like the dialog: a scrim positioned any other way scrolls away from what it covers.
      backdrop: {
        position: 'fixed',
        inset: 0,
        background: 'var(--dialog-backdrop, rgba(0, 0, 0, 0.7))',
      },
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

test.describe('the scrim a non-modal dialog has to draw itself', () => {
  test('is positioned the way the dialog it covers is', () => {
    // The pair is the whole point: a `fixed` scrim under an `absolute` dialog covers the viewport
    // instead of the region, and an `absolute` one under a `fixed` dialog scrolls away from it.
    expect(dialogPlacement({ nonModal: true, portal: true }).backdrop).toMatchObject({
      position: 'fixed',
    });
    expect(dialogPlacement({ nonModal: true }).backdrop).toMatchObject({ position: 'absolute' });
  });

  test('reads the same custom property the native backdrop does', () => {
    // So a theme moves both, and a non-modal panel is not a different shade from a modal dialog
    // beside it.
    for (const options of [{ nonModal: true }, { nonModal: true, portal: true }]) {
      expect(dialogPlacement(options).backdrop?.background).toContain('--dialog-backdrop');
    }
  });

  test('carries no z-index, because the placement is not what decides the stack', () => {
    // `getZIndex(id)` is the manager's answer and it depends on how many dialogs are open, which a
    // static table cannot know.
    expect(dialogPlacement({ nonModal: true }).backdrop).not.toHaveProperty('zIndex');
  });
});
