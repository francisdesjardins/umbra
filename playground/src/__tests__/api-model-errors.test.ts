import { expect, test } from '@playwright/test';
import { typedocFailure } from '../../vite-plugins/api-model.ts';

/**
 * The API model is generated during every playground build, including the deploy one, and
 * typedoc runs there with `treatWarningsAsErrors`. So a broken `{@link}` fails a deploy — and
 * the only thing standing between that and half an hour of guessing is whether the failure
 * carries typedoc's own words.
 */
test.describe('typedocFailure', () => {
  test('repeats what typedoc printed, on both streams', () => {
    const error = Object.assign(new Error('Command failed: node …/typedoc'), {
      stdout: '[warning] Failed to resolve link to "useStore"\n',
      stderr: 'Found 1 errors\n',
    });

    const message = typedocFailure(error).message;

    expect(message).toContain('Failed to resolve link to "useStore"');
    expect(message).toContain('Found 1 errors');
  });

  test('accepts a Buffer, which is what execFileSync actually captures', () => {
    const error = Object.assign(new Error('Command failed'), {
      stdout: Buffer.from('[warning] Not documented\n'),
      stderr: Buffer.from(''),
    });

    expect(typedocFailure(error).message).toContain('Not documented');
  });

  test('falls back to the reason when typedoc printed nothing', () => {
    const error = Object.assign(new Error('spawn ENOENT'), { stdout: '', stderr: '' });

    const message = typedocFailure(error).message;

    expect(message).toContain('spawn ENOENT');
    // No trailing "its own output follows" promising output that is not there.
    expect(message).not.toContain('output follows');
  });

  test('survives something that is not an Error at all', () => {
    expect(typedocFailure('exploded').message).toContain('exploded');
    expect(typedocFailure(undefined).message).toContain('typedoc failed');
  });

  test('names itself, so the failure is attributable in a build log', () => {
    expect(typedocFailure(new Error('x')).message).toContain('[dialog-api]');
  });
});
