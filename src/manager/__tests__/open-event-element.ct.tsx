import { expect, test } from '@playwright/experimental-ct-react';
import {
  OpenEventInDocumentHarness,
  OpenEventInShadowHarness,
} from './open-event-element.story.js';

/**
 * `modal:open` carries the `<dialog>` it is announcing.
 *
 * The interesting half is the shadow root: without the field, an integration handed only an id has
 * a lookup that works everywhere except there, and fails silently when it does not.
 */

test('the open event carries the dialog element', async ({ mount }) => {
  const component = await mount(<OpenEventInDocumentHarness />);
  await component.getByTestId('open').click();

  await expect(component.getByTestId('seen')).toHaveText(/"isTheDialog":true/);
  // The baseline: here a document query would have found it too, so this case proves the field is
  // correct rather than that it is necessary.
  await expect(component.getByTestId('seen')).toHaveText(/"findableFromDocument":true/);
});

test('it carries one a document query cannot reach, inside a shadow root', async ({ mount }) => {
  const component = await mount(<OpenEventInShadowHarness />);
  await component.getByTestId('open').click();

  await expect(component.getByTestId('seen')).toHaveText(/"isTheDialog":true/);
  await expect(component.getByTestId('seen')).toHaveText(/"findableFromDocument":false/);
});
