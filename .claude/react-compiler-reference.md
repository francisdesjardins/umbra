# React Compiler Quick Reference

Target: `babel-plugin-react-compiler` v19 | React ^19.0.0

## The 5 Rules

### 1. ❌ Never `useMemo`, `useCallback`, or `React.memo`

The compiler auto-memoizes based on dependency analysis. These directives conflict with that.

```typescript
// ❌ WRONG
const Component = React.memo(({ data }) => {
  const filtered = useMemo(() => data.filter(x => x.active), [data]);
  const handler = useCallback((e) => { onEvent(e); }, [onEvent]);
  return <div>{filtered}</div>;
});

// ✓ CORRECT
const Component = ({ data }) => {
  const filtered = data.filter(x => x.active);
  const handler = (e) => { onEvent(e); };
  return <div>{filtered}</div>;
};
```

**Why:** The compiler sees every function, ref, and object and decides what to memoize. Explicit memos prevent it from working.

---

### 2. ❌ No ref writes during render

Refs are mutable — writing to them during render means the value persists across replays. Use `useEffect` instead.

```typescript
// ❌ WRONG
const DialogHandle = forwardRef(({ open, close }, ref) => {
  ref.current = { open, close };  // ← Ref write during render
  return <dialog>...</dialog>;
});

// ✓ CORRECT (Pattern 1: useEffect)
const useDialogRef = () => {
  const ref = useRef<DialogHandle>(null);
  useEffect(() => {
    ref.current = { /* stuff */ };
  }, [/* deps */]);
  return ref;
};

// ✓ CORRECT (Pattern 2: Getter)
const Dialog = () => {
  const getDialog = () => /* derive the interface on read */;
  return <dialog ref={getDialog()}>...</dialog>;
};
```

**Why:** React Compiler allows replaying a render (think: Suspense, async errors). Mutations during render break that.

---

### 3. ⚠️ Store creation in `useState`-init, never `useRef`

Stores hold mutable state (subscriptions, maps, caches). They need an init function to run once, but `useRef` bypasses dependency analysis. Use `useState` with an initializer.

```typescript
// ❌ WRONG
const store = useRef(null);
if (!store.current) {
  store.current = createStore();
}

// ✓ CORRECT
const [store] = useState(() => createStore());
```

**Why:** The Compiler sees `useState` with an init function and knows it runs once. `useRef` is for stable object identity (like a timer id), and the Compiler doesn't track its contents.

**Reference:** `src/core/dialog-store.ts` does this correctly.

---

### 4. ✓ Map writes are safe

Handler registries (like `handlers.set(key, fn)`) don't count as ref writes. The Map itself is the register; mutating its contents during render is expected.

```typescript
// ✓ CORRECT
const DialogState = () => {
  const [store] = useState(() => {
    const handlers = new Map();
    return {
      attach(key, fn) {
        handlers.set(key, fn);  // ← This is fine
      },
      dispatch(key) {
        const fn = handlers.get(key);
        if (fn) fn();
      }
    };
  });
  return <...>;
};
```

**Why:** A Map is a container; the Compiler allows mutations to containers created in a component, because they are controlled by that component.

---

### 5. ✓ Stable identities in dependency arrays

Functions and objects returned by a hook keep the same reference for the hook's lifetime. Use them directly in dependency arrays — no ref indirection needed.

```typescript
// ✓ CORRECT
const { open, close, handle } = useDialog();

// These are stable across renders of the hook consumer
useEffect(() => {
  document.addEventListener('keydown', handle);
  return () => document.removeEventListener('keydown', handle);
}, [handle]); // ← handle is stable, safe here
```

**Why:** The Compiler sees `handle` created at hook init and knows it never changes. Once created, same object reference for the hook's lifetime.

---

## Common Patterns

### Story components in component tests

Stories must be declared at module scope, not inline in `test()` callbacks. They must follow Compiler rules.

```typescript
// ✓ CORRECT
const MyStory = ({ onClick }) => {
  const [open, setOpen] = useState(false);
  const handler = (reason) => {
    console.log('closed with', reason);
    setOpen(false);
  };
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open</button>
      <MyDialog open={open} onClose={handler} />
    </div>
  );
};

test('something', async ({ mount }) => {
  const component = await mount(<MyStory />);
  // ...
});
```

### Deriving values

Compute derived values inline or at the read site. The Compiler memoizes automatically.

```typescript
// ✓ CORRECT
const snapshot = useStore(store, (s) => ({
  isRunning: s.actions.some(a => a.isRunning),
  activeCount: s.actions.filter(a => !a.disabled).length
}));

// ✓ ALSO CORRECT (inline in JSX)
<span>{snapshot.actions.filter(a => a.isRunning).length}</span>
```

**Why:** Both compute fresh. The Compiler memoizes if the input references didn't change. If they did, recompute (that's the point of a selector).

---

## Troubleshooting

**Error: "Cannot write to ref during render"**

- Check: Do you have `ref.current = ...` in the component body (outside `useEffect`)?
- Fix: Move to `useEffect`, or switch to a getter function.

**Error: "Ref tainting"**

- You used `useRef` to hold a store or other mutable state.
- Fix: Use `useState(() => createStore())` instead.

**Error: "X has invalid memo dependencies"**

- You wrote `useMemo(..., [deps])` — the Compiler forbids it.
- Fix: Remove the `useMemo` wrapper; compute the value inline.

**Missing memoization / slow re-renders**

- The Compiler can only memoize what it can see. If a value comes from outside:
  - Pass it as a prop, or
  - Read it via a selector (`useStore(store, s => s.value)`), or
  - Ensure it's a stable reference (hook return, context value)

---

## Reading the Compiled Output

Run `yarn build` and inspect `dist/esm/`. Compiled files have a `$` prefix on memoized functions:

```typescript
// Input
const Component = ({ data }) => {
  const filtered = data.filter(x => x.active);
  return <div>{filtered}</div>;
};

// Compiled
const Component = (props) => {
  const t0 = props.data;
  const t1 = useMemo(() => t0.filter(x => x.active), [t0]);
  return <div>{t1}</div>;
};
```

The Compiler added the memo. You don't.

---

## Resources

- **[Full constraints in src/CLAUDE.md](../src/CLAUDE.md#react-compiler)** — Deep dive on store creation, dependency analysis, edge cases
- **[babel-plugin-react-compiler docs](https://react.dev/learn/react-compiler)** — Official reference
- **[Type-check output](../tsconfig.json)** — TypeScript 7 (ts-ignore comments for compiler-related suppressions are documented in src/CLAUDE.md)
