import { expect, test } from '@playwright/test';
import { dialogPlacement, isContainedArrangement, namesAPortal } from '../placement.js';

test.describe('dialogPlacement', () => {
  test('a modal dialog is positioned by the top layer, so it needs neither host nor styles', () => {
    expect(dialogPlacement()).toEqual({ host: null, dialog: {}, backdrop: null });
    expect(dialogPlacement({ nonModal: false, portal: true })).toEqual({
      host: null,
      dialog: {},
      // The browser draws this in the top layer; a scrim of ours would sit below its own dialog.
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

    // `absolute` against a host we own, so a transformed ancestor cannot hijack the block.
    expect(dialog).toMatchObject({ position: 'absolute', inset: 0 });
    // The host is absolute too: in flow it would lay out after what it must cover, and push it out.
    expect(host).toMatchObject({
      position: 'absolute',
      inset: 0,
      minHeight: 0,
    });
  });

  test('the host is not a hit target; the dialog inside it is', () => {
    const { host, dialog } = dialogPlacement({ nonModal: true });

    // The host covers its region for the dialog's whole life; this pair keeps the trigger clickable.
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
    // A `fixed` scrim under an `absolute` dialog covers the viewport, not the region — and back.
    expect(dialogPlacement({ nonModal: true, portal: true }).backdrop).toMatchObject({
      position: 'fixed',
    });
    expect(dialogPlacement({ nonModal: true }).backdrop).toMatchObject({ position: 'absolute' });
  });

  test('reads the same custom property the native backdrop does', () => {
    // So a theme moves both, and a panel is not a different shade from a dialog beside it.
    for (const options of [{ nonModal: true }, { nonModal: true, portal: true }]) {
      expect(dialogPlacement(options).backdrop?.background).toContain('--dialog-backdrop');
    }
  });

  test('carries no z-index, because the placement is not what decides the stack', () => {
    // `getZIndex(id)` is the manager's answer, and it depends on how many dialogs are open.
    expect(dialogPlacement({ nonModal: true }).backdrop).not.toHaveProperty('zIndex');
  });
});

test.describe('reading a portal target', () => {
  // `PortalTarget` is `boolean | (() => Element | null)`, and the shorthand that is right for the
  // boolean — `portal !== true` — calls a host getter inline. Two readers depend on the answer.
  const host = () => {
    return null;
  };

  test('true and a host getter both portal', () => {
    expect(namesAPortal(true)).toBe(true);
    expect(namesAPortal(host)).toBe(true);
  });

  test('false and nothing leave the dialog where it was declared', () => {
    expect(namesAPortal(false)).toBe(false);
    expect(namesAPortal(undefined)).toBe(false);
  });

  test('contained is non-modal and unportaled, and nothing else', () => {
    expect(isContainedArrangement({ nonModal: true, portal: false })).toBe(true);
    expect(isContainedArrangement({ nonModal: true })).toBe(true);

    // A host getter names *where* the element lives, never how it is positioned.
    expect(isContainedArrangement({ nonModal: true, portal: host })).toBe(false);
    expect(isContainedArrangement({ nonModal: true, portal: true })).toBe(false);

    // A modal dialog is in the top layer, which no arrangement here reaches.
    expect(isContainedArrangement({ nonModal: false, portal: false })).toBe(false);
    expect(isContainedArrangement({ portal: false })).toBe(false);
  });
});
