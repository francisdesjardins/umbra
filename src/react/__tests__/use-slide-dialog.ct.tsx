import { expect, test } from '../../__tests__/ct-coverage.js';
import {
  AlignSlideHarness,
  BasicSlideHarness,
  ContainedPositioningSlideHarness,
  DirectionSlideHarness,
  MultiDirectionSlideHarness,
  NonModalEscHotkeySlideHarness,
  OpenAndWaitSlideHarness,
} from './use-slide-dialog.story';

test.describe('useSlideDialog', () => {
  test('modal is initially closed', async ({ mount, page }) => {
    await mount(<BasicSlideHarness />);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('modal-slide-basic')).not.toBeVisible();
  });

  test('opens from specified direction', async ({ mount, page }) => {
    await mount(<BasicSlideHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('modal-slide-basic')).toBeVisible();
    await expect(page.getByTestId('modal-slide-basic')).toContainText('Slide content');
  });

  test('passes direction to render context', async ({ mount, page }) => {
    await mount(<DirectionSlideHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('direction')).toHaveText('right');
  });

  test('closes with reason via handle.close()', async ({ mount, page }) => {
    await mount(<BasicSlideHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('modal-slide-basic')).toBeVisible();
    await page.getByRole('button', { name: 'Close Panel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('close');
  });

  test('closes with reason "dismiss" on Escape key', async ({ mount, page }) => {
    await mount(<BasicSlideHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('modal-slide-basic')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('openAndWait resolves with close reason', async ({ mount, page }) => {
    await mount(<OpenAndWaitSlideHarness />);
    await page.getByRole('button', { name: 'Open and Wait' }).click();
    await expect(page.getByTestId('status')).toHaveText('waiting');
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('status')).toHaveText('resolved:close');
  });

  test('supports all four directions', async ({ mount, page }) => {
    await mount(<MultiDirectionSlideHarness />);

    for (const dir of ['Left', 'Right', 'Top', 'Bottom'] as const) {
      await page.getByRole('button', { name: `Open ${dir}` }).click();
      await expect(page.getByTestId('active-direction')).toHaveText(dir.toLowerCase());
      await page.getByRole('button', { name: 'Close' }).click();
      await expect(page.getByTestId('last-direction')).toHaveText(dir.toLowerCase());
    }
  });

  test('ESC fires controller action from outside non-modal panel (regression: window listener swallowed event when preventDismiss=true)', async ({
    mount,
    page,
  }) => {
    await mount(<NonModalEscHotkeySlideHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('modal-non-modal-esc-hotkey-slide')).toBeVisible();

    // Focus outside: the window capture listener must delegate to cancel, not swallow ESC.
    await page.getByTestId('outside-button').focus();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });

  test('can be opened and closed multiple times', async ({ mount, page }) => {
    await mount(<BasicSlideHarness />);

    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('modal-slide-basic')).toBeVisible();
    await page.getByRole('button', { name: 'Close Panel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');

    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('modal-slide-basic')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('a closed contained panel leaves its region clickable (regression: the host swallowed every hit)', async ({
    mount,
    page,
  }) => {
    await mount(<ContainedPositioningSlideHarness />);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');

    // Two layers had to move for this click to land: the host (`absolute; inset: 0` over the stage
    // whether open or not) and the closed dialog, kept in layout by the inline `display: flex`.
    await expect(page.getByTestId('modal-contained-positioning-slide')).toHaveCSS(
      'display',
      'none'
    );
    await page.getByTestId('behind').click();
    await expect(page.getByTestId('behind-clicks')).toHaveText('1');
  });

  test('non-modal + no-portal (contained) anchors to its container, not a transformed ancestor (regression: fixed dialog hijacked by ancestor transform → jump/flicker)', async ({
    mount,
    page,
  }) => {
    await mount(<ContainedPositioningSlideHarness direction="bottom" />);
    await page.getByRole('button', { name: 'Open Panel' }).click();

    const dialog = page.getByTestId('modal-contained-positioning-slide');
    await expect(dialog).toBeVisible();

    const style = await dialog.getAttribute('style');
    expect(style).toContain('position: absolute');
    expect(style).not.toContain('position: fixed');
    expect(style).not.toContain('dvw');
    expect(style).not.toContain('dvh');

    // The owned relative container is what establishes the stable containing block.
    const wrapper = page.locator('[data-modal-container="contained-positioning-slide"]');
    await expect(wrapper).toHaveCount(1);

    // Must be `clip`, not `hidden`: a transformed descendant still grows the scroll area under
    // `hidden`, shifting layout so an off-screen `right`/`bottom` panel pops instead of sliding.
    const overflow = await wrapper.evaluate((el) => {
      return getComputedStyle(el).overflow;
    });
    expect(overflow).toBe('clip');
  });

  // Regression: core's `inset: 0` leaked the opposite edge, collapsing `right` to zero width and
  // `bottom` to zero height, so those directions never animated.
  for (const { direction, edge } of [
    { direction: 'left', edge: 'left' },
    { direction: 'right', edge: 'right' },
    { direction: 'top', edge: 'top' },
    { direction: 'bottom', edge: 'bottom' },
  ] as const) {
    test(`contained ${direction} slide has a non-zero box anchored to the ${edge} edge`, async ({
      mount,
      page,
    }) => {
      await mount(<ContainedPositioningSlideHarness direction={direction} />);
      await page.getByRole('button', { name: 'Open Panel' }).click();

      const dialog = page.getByTestId('modal-contained-positioning-slide');
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(400);

      const stageBox = await page.getByTestId('stage').boundingBox();
      const dialogBox = await dialog.boundingBox();
      expect(stageBox).not.toBeNull();
      expect(dialogBox).not.toBeNull();
      if (!stageBox || !dialogBox) {
        return;
      }

      expect(dialogBox.width).toBeGreaterThan(1);
      expect(dialogBox.height).toBeGreaterThan(1);

      // Must rest against the matching stage edge, never at the page origin (the viewport hijack).
      const tol = 2;
      switch (edge) {
        case 'left':
          expect(Math.abs(dialogBox.x - stageBox.x)).toBeLessThanOrEqual(tol);
          break;
        case 'right':
          expect(
            Math.abs(dialogBox.x + dialogBox.width - (stageBox.x + stageBox.width))
          ).toBeLessThanOrEqual(tol);
          break;
        case 'top':
          expect(Math.abs(dialogBox.y - stageBox.y)).toBeLessThanOrEqual(tol);
          break;
        case 'bottom':
          expect(
            Math.abs(dialogBox.y + dialogBox.height - (stageBox.y + stageBox.height))
          ).toBeLessThanOrEqual(tol);
          break;
      }

      // At rest, fully in: each slides 100% of its own size, so open is always translate 0.
      const transform = await dialog.evaluate((el) => {
        return getComputedStyle(el).transform;
      });
      expect(transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
    });
  }

  // `stretch` fills the cross axis; start/center/end pin the harness's 260x160 content-sized panel.
  for (const { direction, align } of [
    { direction: 'right', align: 'start' },
    { direction: 'right', align: 'center' },
    { direction: 'right', align: 'end' },
    { direction: 'bottom', align: 'start' },
    { direction: 'bottom', align: 'center' },
    { direction: 'bottom', align: 'end' },
  ] as const) {
    test(`align: ${align} pins a content-sized ${direction} slide on the cross axis`, async ({
      mount,
      page,
    }) => {
      await mount(<AlignSlideHarness direction={direction} align={align} />);
      await page.getByRole('button', { name: 'Open Panel' }).click();

      const dialog = page.getByTestId('modal-align-slide');
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(400);

      const box = await dialog.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(viewport).not.toBeNull();
      if (!box || !viewport) {
        return;
      }

      const horizontalSlide = direction === 'right';
      const crossSize = horizontalSlide ? box.height : box.width;
      const crossViewport = horizontalSlide ? viewport.height : viewport.width;
      expect(crossSize).toBeLessThan(crossViewport);
      expect(crossSize).toBeGreaterThan(1);

      // Cross-axis placement: start → near edge, end → far edge, center → midpoint.
      const crossStart = horizontalSlide ? box.y : box.x;
      const crossEnd = crossStart + crossSize;
      const tol = 3;
      if (align === 'start') {
        expect(Math.abs(crossStart)).toBeLessThanOrEqual(tol);
      } else if (align === 'end') {
        expect(Math.abs(crossEnd - crossViewport)).toBeLessThanOrEqual(tol);
      } else {
        const center = crossStart + crossSize / 2;
        expect(Math.abs(center - crossViewport / 2)).toBeLessThanOrEqual(tol);
      }
    });
  }

  test('align: center still slides on the main axis (the cross-axis -50% shift is folded into both keyframes, not overwritten by the slide)', async ({
    mount,
    page,
  }) => {
    await mount(<AlignSlideHarness direction="right" align="center" />);

    // Record the rendered x every frame: a real slide passes through many positions.
    await page.getByRole('button', { name: 'Open Panel' }).click();
    const positions = await page.evaluate(async () => {
      const seen: number[] = [];
      const dq = () => {
        return document.querySelector('[data-testid="modal-align-slide"]');
      };
      const t0 = performance.now();
      await new Promise<void>((res) => {
        (function wait() {
          const d = dq();
          if ((d && d.hasAttribute('open')) || performance.now() - t0 > 1500) {
            res();
            return;
          }
          requestAnimationFrame(wait);
        })();
      });
      const start = performance.now();
      await new Promise<void>((res) => {
        (function tick() {
          const d = dq();
          if (d) {
            seen.push(Math.round(d.getBoundingClientRect().x));
          }
          if (performance.now() - start < 450) {
            requestAnimationFrame(tick);
          } else {
            res();
          }
        })();
      });
      return seen;
    });

    // Many distinct x positions → it slid. A jump/pop would yield one or two.
    expect(new Set(positions).size).toBeGreaterThan(5);

    const transform = await page.getByTestId('modal-align-slide').evaluate((el) => {
      return getComputedStyle(el).transform;
    });
    // matrix(a,b,c,d,tx,ty) — tx settles at 0 (slid fully in), ty is the -50% self-shift.
    const parts = /matrix\(1, 0, 0, 1, ([-\d.]+), ([-\d.]+)\)/.exec(transform);
    expect(parts).not.toBeNull();
    if (parts) {
      expect(Math.abs(Number(parts[1]))).toBeLessThanOrEqual(1);
      expect(Number(parts[2])).toBeLessThan(0);
    }
  });

  test('align defaults to stretch — panel fills the cross axis', async ({ mount, page }) => {
    await mount(<AlignSlideHarness direction="right" align="stretch" />);
    await page.getByRole('button', { name: 'Open Panel' }).click();

    const dialog = page.getByTestId('modal-align-slide');
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(400);

    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) {
      return;
    }
    // Full viewport height for a horizontal slide, despite the 160px-tall content.
    expect(Math.abs(box.height - viewport.height)).toBeLessThanOrEqual(3);
  });

  test('uses dynamic viewport units (dvh/dvw) for dialog sizing', async ({ mount, page }) => {
    await mount(<BasicSlideHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('modal-slide-basic')).toBeVisible();
    const style = await page.getByTestId('modal-slide-basic').getAttribute('style');
    expect(style).toContain('dvh');
  });
});
