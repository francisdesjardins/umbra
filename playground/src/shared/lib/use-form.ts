import { useState } from 'react';
import { createStore } from 'umbra/react';
import { useStore } from './use-store';

// ── A form, small enough to read ──────────────────────────────────────────────
//
// **A stand-in, not a form library.** The same standing this site's `useQuery` has: enough of the
// shape that the examples are honest, none of the surface that would make it a dependency. There
// is no schema, no resolver, no field array, no uncontrolled mode and no ref registration — reach
// for any of those and you want React Hook Form, which is a real library and this is not trying
// to be one.
//
// **Why it exists here at all.** `/ui-integrations` claims the same hooks wear two different UIs.
// Before this, the MUI and vanilla forms each carried their own store, their own `setValue` /
// `setErrors` / `reset`, and their own copy of the validation strings — so the pair proved the
// opposite of its claim: two implementations that happened to agree. With the logic shared, the
// two files differ only in what they render, which is the thing the page is for.

/**
 * The keys whose value is a `string`, and therefore the only ones {@link Form.field} can serve.
 *
 * **This is the whole of what makes the hook generic without making it a form library.** A text
 * input's props are honest to produce — `value` is the string, `onChange` reads `target.value`.
 * A checkbox wants `checked`, a number input wants a parse, a date picker wants whatever that
 * library decided: inventing one shape for all of them is where a form helper turns into React
 * Hook Form. So `field(name)` is a type error on a non-string field, and everything else goes
 * through {@link Form.set}, which asks for the value already in its own type.
 *
 * The same move the library makes with `ActionReason<TReason>`: narrow the parameter so the
 * wrong call does not compile, rather than accept it and cope.
 */
export type TextKeys<TValues> = {
  [K in keyof TValues]: TValues[K] extends string ? K : never;
}[keyof TValues] &
  string;

/**
 * One message per invalid field, keyed by any field — not only the text ones.
 *
 * Spelled with the `| undefined` suffix rather than as a `Partial<Record<…>>`, because this repo
 * runs `exactOptionalPropertyTypes`: under it a validator returning `{ email: undefined }` for a
 * valid field — the natural way to write one — does not satisfy a plain `Partial`.
 */
export type FieldErrors<TValues> = {
  readonly [K in keyof TValues & string]?: string | undefined;
};

/** Given the current values, say which fields are wrong. Called on submit and on blur. */
export type FormValidator<TValues> = (values: TValues) => FieldErrors<TValues>;

/**
 * What a control needs, as plain DOM props.
 *
 * **The shape is deliberate**: it is the same trick the library's own `action(reason)` uses, and
 * for the same reason. Every field is a DOM attribute or a DOM event, so MUI's `TextField` and a
 * bare `<input>` both accept the whole set spread onto them with no adapter in between — which is
 * what lets the two examples differ in markup and nowhere else.
 */
export type FieldProps = {
  readonly name: string;
  readonly value: string;
  readonly onChange: (event: { readonly target: { readonly value: string } }) => void;
  readonly onBlur: () => void;
  /** Present only while the field is showing an error, so a clean field announces nothing. */
  readonly 'aria-invalid': boolean;
  /** The id of the element rendering this field's message — see {@link Form.errorId}. */
  readonly 'aria-describedby': string | undefined;
};

export type Form<TValues> = {
  /** The current values. Controlled: the caller renders them and nothing else holds them. */
  readonly values: TValues;
  /**
   * The messages to render, which is **not** everything `validate` returned.
   *
   * A field's message appears once it has been blurred or once a submit has been attempted, and
   * not before: telling someone their email is invalid while they are still on the third
   * character is technically true and useless. `validate` is pure and unaware of any of this.
   */
  readonly errors: FieldErrors<TValues>;
  /** The props for one text field, ready to spread. Not available on other value types. */
  readonly field: (name: TextKeys<TValues>) => FieldProps;
  /**
   * Set any field, including the ones `field` refuses.
   *
   * The escape hatch that keeps the hook generic: a checkbox calls `set('agree', checked)` and
   * renders itself, and nothing here had to guess what a checkbox's props look like.
   */
  readonly set: <K extends keyof TValues>(name: K, value: TValues[K]) => void;
  /** The id this field's message must be rendered under, so `aria-describedby` resolves. */
  readonly errorId: (name: keyof TValues & string) => string;
  /**
   * Validate, then run `onValid` only if nothing is wrong.
   *
   * Returns a promise so an async `onValid` can be awaited — an action handler in this library
   * stays "running" for exactly as long as the promise it returns, so awaiting this is what keeps
   * a submit button disabled while the work happens.
   */
  readonly submit: (onValid: (values: TValues) => void | Promise<void>) => Promise<void>;
  /** Back to the initial values, with every message and every blur forgotten. */
  readonly reset: () => void;
};

/**
 * @param id - Prefix for the generated error-element ids, so two forms on one page do not collide.
 * @param initialValues - Also what `reset` returns to.
 * @param validate - Pure: values in, messages out. Called on blur and on submit.
 */
export function useForm<TValues extends Record<string, unknown>>({
  id,
  initialValues,
  validate,
}: {
  readonly id: string;
  readonly initialValues: TValues;
  readonly validate: FormValidator<TValues>;
}): Form<TValues> {
  // **The library's own cell, not React's `useState`** — built once per hook call, the way
  // `useModal` builds its runtime. Two things follow that `useState` cannot give: a component
  // that reads one field can `select` it and re-render on that field alone, and the state is a
  // plain store a test can drive with no renderer at all.
  //
  // Per call rather than at module scope, which is the difference from the stores these examples
  // used to carry: two forms on one page are two forms, not one shared draft.
  const [store] = useState(() => {
    return createStore({ values: initialValues, shown: new Set<string>() }, ({ set }) => {
      return {
        change(name: string, value: unknown) {
          set((s) => {
            return { ...s, values: { ...s.values, [name]: value } };
          });
        },
        /** Let these fields show their message from now on. */
        reveal(names: readonly string[]) {
          set((s) => {
            const shown = new Set(s.shown);
            for (const name of names) {
              shown.add(name);
            }
            return { ...s, shown };
          });
        },
        clear() {
          set({ values: initialValues, shown: new Set() });
        },
      };
    });
  });

  const { values, shown } = useStore(store);

  const found = validate(values);
  // Built by copying rather than by `Object.fromEntries` + a cast: the keys come from the
  // validator's own output, so they are keys of `TValues` by construction, and `Object.assign`
  // says that without an `as` — which this repo does not use.
  const errors: FieldErrors<TValues> = {};
  for (const [name, message] of Object.entries(found)) {
    if (message !== undefined && shown.has(name)) {
      Object.assign(errors, { [name]: message });
    }
  }

  const errorId = (name: keyof TValues & string): string => {
    return `${id}-${name}-error`;
  };

  return {
    values,
    errors,
    errorId,

    set: (name, value) => {
      store.change(String(name), value);
    },

    field: (name) => {
      const message = errors[name];
      return {
        name,
        // Narrowed by `TextKeys`, which the checker enforces at the call site — so this is the
        // one place the constraint is taken on trust, and it is one line rather than a cast at
        // every consumer.
        value: values[name] as string,
        onChange: (event) => {
          store.change(name, event.target.value);
        },
        onBlur: () => {
          store.reveal([name]);
        },
        'aria-invalid': message !== undefined,
        // Omitted rather than empty when the field is clean: a describedby pointing at an element
        // that is not rendered is a reference a screen reader resolves to nothing, which is the
        // same defect the library's own labelling diagnostic reports on a dialog.
        'aria-describedby': message === undefined ? undefined : errorId(name),
      };
    },

    submit: async (onValid) => {
      const problems = validate(values);
      // Filtered on the value, not counted by key. A validator naturally returns
      // `{ email: undefined }` for a field that is fine — the shape this repo's
      // `exactOptionalPropertyTypes` encourages — and `Object.keys` counts that as a problem, so a
      // clean form never submits. Caught by "runs it once every field is clean".
      const names = Object.entries(problems)
        .filter(([, message]) => {
          return message !== undefined;
        })
        .map(([name]) => {
          return name;
        });
      if (names.length > 0) {
        // Every wrong field earns its message at once — a submit is the user saying they are
        // finished, so showing them one problem at a time would be three round trips.
        store.reveal(names);
        return;
      }
      await onValid(values);
    },

    reset: () => {
      store.clear();
    },
  };
}
