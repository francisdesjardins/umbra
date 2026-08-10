import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

// ── virtual:dialog-api ───────────────────────────────────────────────────────
//
// Runs typedoc over the library's entry points and hands the playground a compact model of the
// public surface, so the API page renders with this site's own components instead of an
// iframed second design system. Typedoc's own JSON is ~470 kB of graph; the projection below
// keeps what a reference page shows and nothing else.

const VIRTUAL_ID = 'virtual:dialog-api';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

const CORE = 'umbra';
const REACT = 'umbra/react';
const SOLID = 'umbra/solid';
const VANILLA = 'umbra/vanilla';

const ENTRY_LABEL: Record<string, string> = {
  index: CORE,
  react: REACT,
  solid: SOLID,
  vanilla: VANILLA,
};

/**
 * How a symbol is addressed everywhere downstream — the specifier it ships from, then its name.
 *
 * A bare name is not an identity here. The three bindings deliberately export the same words —
 * `useModal`, `UseModalOptions`, `DialogManagerSnapshot`, `ModalHandle` — with different
 * signatures, so keying on the name alone silently shows one binding's declaration under
 * another's specifier. This is the key the category table, the cross-reference links and the
 * search index all agree on.
 */
export const symbolKey = (specifier: string, name: string): string => {
  return `${specifier}#${name}`;
};

/** Typedoc's `ReflectionKind`, narrowed to what the page groups by. */
const KIND: Record<number, ApiSymbol['kind']> = {
  32: 'variable',
  64: 'function',
  2097152: 'type',
};

/**
 * The reader-facing table of contents — one page per entry, in reading order.
 *
 * It is hand-written because the shape a reader wants is the one the entry points already
 * declare in their section banners, and nothing in typedoc's output carries it: `src/utils/`
 * alone holds async state, keys, hotkeys and logging, which are four different chapters.
 * `symbols` is also the order symbols appear in, so a category leads with the thing you call
 * and trails with the types it hands back.
 *
 * Every exported symbol must appear exactly once — `buildModel` throws otherwise, because a
 * new export that silently belongs to no page is an export nobody can find.
 */
const CATEGORIES: readonly CategoryDef[] = [
  {
    id: 'manager',
    label: 'Dialog manager',
    specifier: CORE,
    blurb: 'The registry every dialog lives in: open, close and query one by id from anywhere.',
    symbols: [
      'dialogManager',
      'createDialogManager',
      'createOpenRequest',
      'DialogManager',
      'OpenRequest',
      'OpenRequestContext',
      'OpenRequestDispatch',
      'OpenRequestHandler',
      'OpenRequestOutcome',
      'RegisterOptions',
      'ModalLookup',
      'ModalInfo',
      'RegisteredModalInfo',
      'UnregisteredModalInfo',
      'ModalPhase',
      'ModalStoreSnapshot',
      'CloseResult',
      'DISMISS_REASON',
      'DismissReason',
      'setLogLevel',
    ],
  },
  {
    id: 'placement',
    label: 'Placement & styling',
    specifier: CORE,
    blurb:
      'Where a dialog is positioned from, as a table rather than as markup — and the one way the library writes a style onto an element. What a binding, or a host you write yourself, reads to place a dialog the way the shipped ones do.',
    symbols: [
      'dialogPlacement',
      'DialogPlacement',
      'DialogPlacementOptions',
      'DialogHostStyle',
      'DialogPositionStyle',
      'applyStyle',
      'DialogStyle',
    ],
  },
  {
    id: 'lifecycle',
    label: 'Lifecycle events',
    specifier: CORE,
    blurb: 'What the manager emits as dialogs open and close — DOM events and subscriptions.',
    symbols: [
      'MODAL_OPEN_EVENT',
      'MODAL_CLOSE_EVENT',
      'ModalOpenEventDetail',
      'ModalCloseEventDetail',
      'DialogManagerEvent',
      'DialogManagerSubscriber',
    ],
  },
  {
    id: 'store',
    label: 'Store engine',
    specifier: CORE,
    blurb: 'The reactive cell the library runs on, usable on its own and without a framework.',
    symbols: [
      'createStore',
      'CreateStoreOptions',
      'Store',
      'StoreApi',
      'StoreContract',
      'GenericStore',
    ],
  },
  {
    id: 'errors',
    label: 'Errors',
    specifier: CORE,
    blurb:
      'Turning whatever was thrown into an Error — the normalisation an action’s reported error goes through.',
    symbols: ['normalizeError'],
  },
  {
    id: 'keys',
    label: 'Keys & hotkeys',
    specifier: CORE,
    blurb: 'The vocabulary hotkeys are declared in, plus the helpers that label and match them.',
    symbols: ['Key', 'KeyValue', 'formatHotkeyLabel', 'matchesHotkey'],
  },
  {
    id: 'use-modal',
    label: 'useModal',
    specifier: REACT,
    blurb: 'The base hook — one native dialog, its render callback, its typed close result.',
    symbols: [
      'useModal',
      'UseModalOptions',
      'UseModalBaseOptions',
      'UseModalReturn',
      'ModalRenderArgs',
      'ModalHandle',
      'ModalVariant',
      'ModalAnimation',
      'AwaitedClose',
      'ModalOutlet',
    ],
  },
  {
    id: 'templates',
    label: 'Template hooks',
    specifier: REACT,
    blurb: 'useModal pre-shaped for the two layouts that come up every time: message and slide.',
    symbols: [
      'useMessageModal',
      'UseMessageModalOptions',
      'UseMessageModalReturn',
      'MessageModalRenderContext',
      'MessageModalType',
      'useSlideModal',
      'UseSlideModalOptions',
      'UseSlideModalReturn',
      'SlideModalRenderContext',
      'SlideDirection',
      'SlideAlign',
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    specifier: REACT,
    blurb:
      'Declared by being rendered: one call names the reason, binds the handler and returns the button props. Pending state, error capture, hotkeys and typed close reasons come with it.',
    symbols: [
      'ActionFactory',
      'ActionReason',
      'ActionOptions',
      'ActionButtonProps',
      'ActionClickEvent',
      'ActionCloseFn',
      'HotkeyDef',
    ],
  },
  {
    id: 'react-manager',
    label: 'Manager in React',
    specifier: REACT,
    blurb: 'Reading manager state from a component, and scoping a manager to a subtree.',
    symbols: [
      'useDialogManager',
      'DialogManagerSnapshot',
      'useLookup',
      'DialogManagerProvider',
      'useDialogManagerContext',
    ],
  },
  {
    id: 'solid-use-modal',
    label: 'useModal',
    specifier: SOLID,
    blurb:
      'The same hook, the same words. Two differences and both are the renderer’s: the live values are getters over signals, so do not destructure the render args — and `portal: true` mounts the dialog itself, leaving `Modal` as null.',
    symbols: [
      'useModal',
      'UseModalOptions',
      'UseModalBaseOptions',
      'UseModalReturn',
      'ModalRenderArgs',
      'ModalHandle',
      'ModalVariant',
      'ModalAnimation',
      'AwaitedClose',
      'ModalOutlet',
    ],
  },
  {
    id: 'solid-templates',
    label: 'Template hooks',
    specifier: SOLID,
    blurb:
      'Message and slide, built on Solid’s useModal — the same three lines over the same framework-free geometry the React pair uses.',
    symbols: [
      'useMessageModal',
      'UseMessageModalOptions',
      'UseMessageModalReturn',
      'MessageModalRenderContext',
      'MessageModalType',
      'useSlideModal',
      'UseSlideModalOptions',
      'UseSlideModalReturn',
      'SlideModalRenderContext',
      'SlideDirection',
      'SlideAlign',
    ],
  },
  {
    id: 'solid-actions',
    label: 'Actions',
    specifier: SOLID,
    blurb:
      'The same action factory the React binding hands out. Its three live fields are getters, so spreading the props inside a tracking scope subscribes each attribute individually — no re-render, no wrapper.',
    symbols: [
      'ActionFactory',
      'ActionReason',
      'ActionOptions',
      'ActionButtonProps',
      'ActionClickEvent',
      'ActionCloseFn',
      'HotkeyDef',
    ],
  },
  {
    id: 'solid-manager',
    label: 'Manager in Solid',
    specifier: SOLID,
    blurb:
      'Reading manager state from a component, scoping a manager to a subtree, and the six-line bridge from any store this package hands you to a signal.',
    symbols: [
      'useDialogManager',
      'DialogManagerSnapshot',
      'useLookup',
      'DialogManagerProvider',
      'useDialogManagerContext',
      'fromStore',
    ],
  },
  {
    id: 'vanilla',
    label: 'bindDialog',
    specifier: VANILLA,
    blurb:
      'A controller, not a renderer: the <dialog> and everything in it is markup you already wrote, and this drives its lifecycle over the top. No render, no Modal, no outlet — and bindAction, which is the half a renderer does elsewhere.',
    symbols: [
      'bindDialog',
      'BindDialogOptions',
      'DialogController',
      'DialogSnapshot',
      'ModalHandle',
      'ModalVariant',
      'AwaitedClose',
    ],
  },
  {
    id: 'vanilla-actions',
    label: 'Actions',
    specifier: VANILLA,
    blurb:
      'The same actions, bound rather than rendered: what you pass to bindAction, and the props it applies on their behalf as one runs.',
    symbols: [
      'ActionReason',
      'ActionOptions',
      'ActionButtonProps',
      'ActionClickEvent',
      'ActionCloseFn',
      'HotkeyDef',
    ],
  },
];

type CategoryDef = {
  readonly id: string;
  readonly label: string;
  readonly specifier: string;
  readonly blurb: string;
  readonly symbols: readonly string[];
};

/** One reflection typedoc emitted, and the entry point it was materialised under. */
type Declaration = { readonly node: Node; readonly specifier: string };

/** A named thing inside a symbol: a parameter, a type parameter, or an object member. */
export type ApiMember = {
  readonly name: string;
  readonly summary: string;
  readonly type: readonly DocPart[];
  readonly optional: boolean;
};

/**
 * A run of prose. `link` is set when the source wrote `{@link Symbol}` and typedoc resolved it,
 * or when a rendered type names another exported symbol, so the page can anchor to that symbol
 * instead of printing its name.
 *
 * It carries a {@link symbolKey} when the target is exported and a bare name when it is not —
 * the page renders the second kind as inline code, which is the honest answer for a type a
 * reader cannot navigate to.
 */
export type DocPart = { readonly text: string; readonly link?: string };

export type ApiSymbol = {
  /** `specifier#name` — see {@link symbolKey}. Its identity everywhere off this page. */
  readonly key: string;
  readonly name: string;
  readonly kind: 'function' | 'variable' | 'type';
  /** Which page it lives on — the `id` of its {@link ApiCategory}. */
  readonly category: string;
  readonly specifier: string;
  /** The declaration as a reader would write it, with referenced symbols kept linkable. */
  readonly signature: readonly DocPart[];
  readonly summary: readonly DocPart[];
  readonly remarks: readonly DocPart[];
  readonly see: readonly (readonly DocPart[])[];
  readonly examples: readonly string[];
  readonly typeParams: readonly ApiMember[];
  readonly params: readonly ApiMember[];
  readonly returns: readonly DocPart[];
  readonly members: readonly ApiMember[];
};

export type ApiCategory = {
  readonly id: string;
  readonly label: string;
  readonly specifier: string;
  readonly blurb: string;
  readonly symbols: readonly ApiSymbol[];
};

type CommentPart = { kind: string; text?: string; tag?: string; target?: unknown };
type Comment = { summary?: CommentPart[]; blockTags?: { tag: string; content: CommentPart[] }[] };
type Flags = { isOptional?: boolean; isRest?: boolean; isReadonly?: boolean };
type Node = {
  id?: number;
  name: string;
  kind: number;
  flags?: Flags;
  comment?: Comment;
  signatures?: Node[];
  children?: Node[];
  parameters?: Node[];
  typeParameters?: Node[];
  type?: TypeNode;
  default?: TypeNode;
};

/** Typedoc's serialized type tree. Every `type` discriminant it emits is handled by `printType`. */
type TypeNode = {
  type?: string;
  name?: string;
  value?: unknown;
  types?: TypeNode[];
  typeArguments?: TypeNode[];
  elementType?: TypeNode;
  elements?: TypeNode[];
  element?: TypeNode;
  target?: unknown;
  declaration?: Node;
  objectType?: TypeNode;
  indexType?: TypeNode;
  checkType?: TypeNode;
  extendsType?: TypeNode;
  trueType?: TypeNode;
  falseType?: TypeNode;
  operator?: string;
  queryType?: TypeNode;
  head?: string;
  tail?: [TypeNode, string][];
  parameter?: string;
  parameterType?: TypeNode;
  templateType?: TypeNode;
  optionalModifier?: string;
  readonlyModifier?: string;
  isOptional?: boolean;
};

/**
 * Undo the source file's hard wrap.
 *
 * A doc comment is wrapped at 100 columns for the editor; rendering those newlines verbatim
 * gives a ragged half-width paragraph in a browser. Single newlines become spaces so the
 * browser wraps, while blank lines (paragraphs) and lines opening a list, heading, quote or
 * table are left alone — those newlines are meaning, not formatting.
 */
function reflow(value: string): string {
  // Both guards matter: `(?<!\n)` keeps the second newline of a paragraph break from being
  // eaten, which would leave the next paragraph indented by a stray space instead of separated.
  return value.replace(/(?<!\n)\n(?!\n)(?![ \t]*(?:[-*+]|\d+\.|#|>|\|))/g, ' ');
}

/** Flatten typedoc's comment parts, newlines and all — the form code samples need. */
function rawText(parts: CommentPart[] | undefined): string {
  return (parts ?? [])
    .map((part) => {
      return part.text ?? '';
    })
    .join('')
    .trim();
}

/** Flatten to prose — for places that render no links. */
function text(parts: CommentPart[] | undefined): string {
  return reflow(rawText(parts));
}

/**
 * Same, but keeping `{@link}` targets as links.
 *
 * Typedoc gives an inline tag a numeric `target` pointing into its own reflection graph, so
 * `names` maps those ids back to symbol names; the name is then resolved against the specifier
 * the linking symbol ships from, and anything neither step can answer degrades to the text the
 * author wrote.
 */
function doc(
  parts: CommentPart[] | undefined,
  names: Map<number, string>,
  ctx: PrintContext
): DocPart[] {
  return (parts ?? [])
    .map((part) => {
      const target = typeof part.target === 'number' ? names.get(part.target) : undefined;
      // A target the entry points do not export stays a link part carrying its bare name: the
      // page renders those as inline code, which is the honest answer for a type a reader
      // cannot navigate to.
      return part.kind === 'inline-tag' && target !== undefined
        ? { text: part.text ?? target, link: ctx.resolve(target) ?? target }
        : { text: reflow(part.text ?? '') };
    })
    .filter((part) => {
      return part.text !== '';
    });
}

function blockTag(
  comment: Comment | undefined,
  tag: string,
  names: Map<number, string>,
  ctx: PrintContext
): DocPart[] {
  const found = comment?.blockTags?.find((entry) => {
    return entry.tag === tag;
  });
  return doc(found?.content, names, ctx);
}

/** Typedoc hands `@example` back as a fenced markdown block; the page renders code, not markdown. */
function unfence(block: string): string {
  const trimmed = block.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }
  const lines = trimmed.split('\n');
  const inner = lines.slice(1, lines.at(-1)?.startsWith('```') === true ? -1 : undefined);
  return inner.join('\n').trim();
}

function allBlockTags(comment: Comment | undefined, tag: string): string[] {
  return (comment?.blockTags ?? [])
    .filter((entry) => {
      return entry.tag === tag;
    })
    .map((entry) => {
      return unfence(rawText(entry.content));
    })
    .filter((example) => {
      return example !== '';
    });
}

// ── Type printing ────────────────────────────────────────────────────────────
//
// A signature is the one thing a reference page cannot paraphrase, so the printer below
// covers every `type` discriminant typedoc emits for this library and reports anything it
// does not recognise instead of quietly printing something plausible and wrong.

/** Emits tokens, merging plain runs so the page renders a handful of spans, not hundreds. */
class Tokens {
  private readonly parts: DocPart[] = [];

  push(value: string): void {
    const last = this.parts.at(-1);
    if (last !== undefined && last.link === undefined) {
      this.parts[this.parts.length - 1] = { text: last.text + value };
      return;
    }
    this.parts.push({ text: value });
  }

  link(name: string, key: string): void {
    this.parts.push({ text: name, link: key });
  }

  done(): DocPart[] {
    return this.parts;
  }
}

type PrintContext = {
  /**
   * The symbol a name means *here*, as a {@link symbolKey}, or `undefined` when nothing on these
   * pages answers to it.
   *
   * Own specifier first, then the core — so `UseModalOptions` inside a Solid signature links to
   * Solid's page and `ModalPhase` inside the same signature links to the core's. Driven by the
   * category table rather than by where typedoc happened to materialise a declaration: a type
   * three bindings re-export is one reflection, and a reader following a link from the Solid
   * chapter should land in the Solid chapter.
   */
  readonly resolve: (name: string) => string | undefined;
  readonly warn: (message: string) => void;
};

/** An object literal type prints as a placeholder; its shape is the members table below it. */
const OBJECT_PLACEHOLDER = '{ … }';

function printCallSignature(signature: Node, out: Tokens, ctx: PrintContext): void {
  printTypeParams(signature.typeParameters, out, ctx);
  printParams(signature.parameters, out, ctx);
  out.push(' => ');
  printType(signature.type, out, ctx);
}

/** Typedoc's placeholder for a destructured parameter — a React component's props object. */
const DESTRUCTURED = '__namedParameters';

function paramName(param: Node): string {
  return param.name === DESTRUCTURED ? 'props' : param.name;
}

function printParams(params: Node[] | undefined, out: Tokens, ctx: PrintContext): void {
  out.push('(');
  (params ?? []).forEach((param, index) => {
    if (index > 0) {
      out.push(', ');
    }
    out.push(
      `${param.flags?.isRest === true ? '...' : ''}${paramName(param)}${param.flags?.isOptional === true ? '?' : ''}: `
    );
    printType(param.type, out, ctx);
  });
  out.push(')');
}

function printTypeParams(params: Node[] | undefined, out: Tokens, ctx: PrintContext): void {
  if (params === undefined || params.length === 0) {
    return;
  }
  out.push('<');
  params.forEach((param, index) => {
    if (index > 0) {
      out.push(', ');
    }
    out.push(param.name);
    if (param.type !== undefined) {
      out.push(' extends ');
      printType(param.type, out, ctx);
    }
    if (param.default !== undefined) {
      out.push(' = ');
      printType(param.default, out, ctx);
    }
  });
  out.push('>');
}

function printList(
  nodes: TypeNode[] | undefined,
  separator: string,
  out: Tokens,
  ctx: PrintContext
) {
  (nodes ?? []).forEach((node, index) => {
    if (index > 0) {
      out.push(separator);
    }
    printType(node, out, ctx);
  });
}

function printType(node: TypeNode | undefined, out: Tokens, ctx: PrintContext): void {
  if (node === undefined) {
    out.push('unknown');
    return;
  }

  switch (node.type) {
    case undefined: {
      ctx.warn('a type node arrived with no discriminant');
      out.push('unknown');
      return;
    }
    case 'intrinsic':
    case 'unknown': {
      out.push(node.name ?? 'unknown');
      return;
    }
    case 'literal': {
      out.push(typeof node.value === 'string' ? `'${node.value}'` : String(node.value));
      return;
    }
    case 'reference': {
      const name = node.name ?? 'unknown';
      const key = ctx.resolve(name);
      if (key !== undefined) {
        out.link(name, key);
      } else {
        out.push(name);
      }
      if (node.typeArguments !== undefined && node.typeArguments.length > 0) {
        out.push('<');
        printList(node.typeArguments, ', ', out, ctx);
        out.push('>');
      }
      return;
    }
    case 'union': {
      printList(node.types, ' | ', out, ctx);
      return;
    }
    case 'intersection': {
      printList(node.types, ' & ', out, ctx);
      return;
    }
    case 'array': {
      // `(A | B)[]` — an unparenthesised union would bind to the last member only.
      const composite =
        node.elementType?.type === 'union' || node.elementType?.type === 'intersection';
      out.push(composite ? '(' : '');
      printType(node.elementType, out, ctx);
      out.push(composite ? ')[]' : '[]');
      return;
    }
    case 'tuple': {
      out.push('[');
      printList(node.elements, ', ', out, ctx);
      out.push(']');
      return;
    }
    case 'namedTupleMember': {
      out.push(`${node.name ?? ''}${node.isOptional === true ? '?' : ''}: `);
      printType(node.element, out, ctx);
      return;
    }
    case 'indexedAccess': {
      printType(node.objectType, out, ctx);
      out.push('[');
      printType(node.indexType, out, ctx);
      out.push(']');
      return;
    }
    case 'typeOperator': {
      out.push(`${node.operator ?? 'keyof'} `);
      printType(asTypeNode(node.target), out, ctx);
      return;
    }
    case 'query': {
      out.push('typeof ');
      printType(node.queryType, out, ctx);
      return;
    }
    case 'conditional': {
      printType(node.checkType, out, ctx);
      out.push(' extends ');
      printType(node.extendsType, out, ctx);
      out.push(' ? ');
      printType(node.trueType, out, ctx);
      out.push(' : ');
      printType(node.falseType, out, ctx);
      return;
    }
    case 'mapped': {
      out.push(`{ [${node.parameter ?? 'K'} in `);
      printType(node.parameterType, out, ctx);
      out.push(`]${node.optionalModifier === '+' ? '?' : ''}: `);
      printType(node.templateType, out, ctx);
      out.push(' }');
      return;
    }
    case 'templateLiteral': {
      out.push(`\`${node.head ?? ''}`);
      for (const [inner, literal] of node.tail ?? []) {
        out.push('${');
        printType(inner, out, ctx);
        out.push(`}${literal}`);
      }
      out.push('`');
      return;
    }
    case 'reflection': {
      const declaration = node.declaration;
      const signature = declaration?.signatures?.[0];
      if (signature !== undefined) {
        printCallSignature(signature, out, ctx);
        return;
      }
      out.push(OBJECT_PLACEHOLDER);
      return;
    }
    default: {
      // Honest degradation: an unhandled discriminant prints as `unknown` and says so at build
      // time, rather than rendering a signature the compiler would reject.
      ctx.warn(`unhandled type kind "${node.type ?? 'undefined'}"`);
      out.push('unknown');
      return;
    }
  }
}

/**
 * `target` is the generic slot typedoc uses for both a reflection id and a nested type, so it
 * arrives as `unknown`; only the object form is a type.
 */
function asTypeNode(value: unknown): TypeNode | undefined {
  return typeof value === 'object' && value !== null ? { ...value } : undefined;
}

/** The declaration line a reader would write themselves. */
function printSignature(node: Node, kind: ApiSymbol['kind'], ctx: PrintContext): DocPart[] {
  const out = new Tokens();
  const signature = node.signatures?.[0];

  if (kind === 'function' && signature !== undefined) {
    out.push(node.name);
    printTypeParams(signature.typeParameters, out, ctx);
    printParams(signature.parameters, out, ctx);
    out.push(': ');
    printType(signature.type, out, ctx);
    return out.done();
  }

  if (kind === 'variable') {
    out.push(`const ${node.name}: `);
    printType(node.type, out, ctx);
    return out.done();
  }

  out.push(`type ${node.name}`);
  printTypeParams(node.typeParameters, out, ctx);
  out.push(' = ');
  // An object-literal alias arrives as a declaration with children and no `type` at all —
  // printing it as `unknown` would be a lie, and its shape is the members table below.
  if (node.type === undefined && (node.children ?? []).length > 0) {
    out.push(OBJECT_PLACEHOLDER);
    return out.done();
  }
  printType(node.type, out, ctx);
  return out.done();
}

// ── Projection ───────────────────────────────────────────────────────────────

/**
 * A type parameter's "type" is its constraint or its default — never the parameter itself.
 * Printing `node.type` the way a property does would render every unconstrained one as
 * `unknown`, which reads as a real annotation and is not one.
 */
function toTypeParam(node: Node, ctx: PrintContext): ApiMember {
  const out = new Tokens();
  if (node.type !== undefined) {
    out.push('extends ');
    printType(node.type, out, ctx);
  } else if (node.default !== undefined) {
    out.push('= ');
    printType(node.default, out, ctx);
  }
  return {
    name: node.name,
    summary: text(node.comment?.summary),
    type: out.done(),
    optional: false,
  };
}

function toMember(node: Node, ctx: PrintContext): ApiMember {
  const signature = node.signatures?.[0];
  return {
    name: paramName(node),
    summary: text((signature?.comment ?? node.comment)?.summary),
    type: (() => {
      const out = new Tokens();
      if (signature !== undefined) {
        printCallSignature(signature, out, ctx);
      } else {
        printType(node.type, out, ctx);
      }
      return out.done();
    })(),
    optional: node.flags?.isOptional === true,
  };
}

/**
 * The fields a symbol exposes: an object type's properties, a const object's entries like
 * `Key`, or a component's props.
 *
 * Undescribed entries are kept — the type is rendered beside the name, which is most of what
 * a reader came for; `Escape: 'Escape'` needs no prose. Intersections are unwrapped so
 * `A & { b }` still lists `b`; the `A` half stays a link in the signature.
 */
function members(node: Node, ctx: PrintContext): ApiMember[] {
  const shapes: (TypeNode | undefined)[] =
    node.type?.type === 'intersection' ? (node.type.types ?? []) : [node.type];
  const props = node.signatures?.[0]?.parameters?.find((param) => {
    return param.name === DESTRUCTURED;
  });

  const children = [
    ...(node.children ?? []),
    ...shapes.flatMap((shape) => {
      return shape?.declaration?.children ?? [];
    }),
    ...(props?.type?.declaration?.children ?? []),
  ];

  return children.map((child) => {
    return toMember(child, ctx);
  });
}

function toSymbol(
  node: Node,
  specifier: string,
  category: string,
  names: Map<number, string>,
  ctx: PrintContext
): ApiSymbol | null {
  const kind = KIND[node.kind];
  if (!kind) {
    return null;
  }
  // A function's prose lives on its signature, everything else on the declaration.
  const signature = node.signatures?.[0];
  const comment = signature?.comment ?? node.comment;

  return {
    key: symbolKey(specifier, node.name),
    name: node.name,
    kind,
    category,
    specifier,
    signature: printSignature(node, kind, ctx),
    summary: doc(comment?.summary, names, ctx),
    remarks: blockTag(comment, '@remarks', names, ctx),
    see: (comment?.blockTags ?? [])
      .filter((entry) => {
        return entry.tag === '@see';
      })
      .map((entry) => {
        return doc(entry.content, names, ctx);
      }),
    examples: allBlockTags(comment, '@example'),
    typeParams: (signature?.typeParameters ?? node.typeParameters ?? []).map((param) => {
      return toTypeParam(param, ctx);
    }),
    // A destructured props object is listed field by field under members, so listing it again
    // here as one anonymous `{ … }` parameter would say nothing.
    params: (signature?.parameters ?? [])
      .filter((param) => {
        return param.name !== DESTRUCTURED;
      })
      .map((param) => {
        return toMember(param, ctx);
      }),
    returns: blockTag(comment, '@returns', names, ctx),
    members: members(node, ctx),
  };
}

/** Every reflection id in the project, so `{@link}` targets resolve to a name. */
function collectNames(root: Node): Map<number, string> {
  const names = new Map<number, string>();
  const walk = (node: Node) => {
    if (typeof node.id === 'number') {
      names.set(node.id, node.name);
    }
    for (const child of [...(node.children ?? []), ...(node.signatures ?? [])]) {
      walk(child);
    }
  };
  walk(root);
  return names;
}

/** Whatever a failed `execFileSync` captured, as text. */
function captured(error: unknown, stream: 'stdout' | 'stderr'): string {
  if (typeof error !== 'object' || error === null || !(stream in error)) {
    return '';
  }
  const value: unknown = Object.getOwnPropertyDescriptor(error, stream)?.value;
  return typeof value === 'string' ? value : (value?.toString() ?? '');
}

/**
 * Say what typedoc said.
 *
 * `stdio: 'pipe'` is what lets the plugin decide when typedoc's output matters, but it also
 * means a failure arrives as `Command failed: node …/typedoc` with the actual diagnostics
 * sitting unread on the error. Typedoc runs with `treatWarningsAsErrors`, so this is the
 * message a broken `{@link}` produces — during `yarn dev`, and during a deploy build, which is
 * the worst possible moment to be told only that something failed.
 */
export function typedocFailure(error: unknown): Error {
  const output = [captured(error, 'stdout'), captured(error, 'stderr')].join('').trim();
  const reason = error instanceof Error ? error.message : String(error);

  return new Error(
    output === ''
      ? `[dialog-api] typedoc failed: ${reason}`
      : `[dialog-api] typedoc failed — its own output follows.

${output}
`
  );
}

function buildModel(repoRoot: string, cacheDir: string, warn: (message: string) => void) {
  mkdirSync(cacheDir, { recursive: true });
  const jsonPath = join(cacheDir, 'typedoc.json');

  // Typedoc's programmatic serializer needs a filesystem it does not have here, so the CLI
  // writes the JSON. `--out` points at the cache so the committed docs are never touched.
  try {
    execFileSync(
      process.execPath,
      [
        join(repoRoot, 'node_modules', 'typedoc', 'bin', 'typedoc'),
        '--options',
        join(repoRoot, 'typedoc.json'),
        // Named here rather than taken from `typedoc.json` so this projection decides its own
        // scope: the reference documents every published entry point, and adding one is a line
        // here plus its categories above. The projection keys declarations by `specifier#name`
        // (see `symbolKey`), which is what lets three bindings export `useModal` and get three
        // pages rather than the last one to be walked.
        '--entryPoints',
        'src/index.ts',
        '--entryPoints',
        'src/react.ts',
        '--entryPoints',
        'src/solid.ts',
        '--entryPoints',
        'src/vanilla.ts',
        '--json',
        jsonPath,
        '--out',
        join(cacheDir, 'html'),
      ],
      { cwd: repoRoot, stdio: 'pipe' }
    );
  } catch (error) {
    throw typedocFailure(error);
  }

  const root = JSON.parse(readFileSync(jsonPath, 'utf8')) as Node;
  rmSync(join(cacheDir, 'html'), { recursive: true, force: true });
  const names = collectNames(root);

  // Every declaration typedoc emitted, by qualified key and by bare name.
  //
  // The two indexes exist because a re-exported type is **one** reflection: `ModalHandle` comes
  // from `core/types.ts` and is named by `./react`, `./solid` and `./vanilla` alike, so typedoc
  // materialises it under whichever entry point it walked first and emits references from the
  // rest — which `KIND` filters out. So a binding asking for a name it genuinely exports has to
  // be able to fall back to that single declaration. `UseModalOptions` is the opposite case:
  // `react/types.ts` and `solid/types.ts` declare two different aliases, each gets its own
  // qualified key, and the fallback is never consulted.
  //
  // A binding's `export * from './index.js'` does not land here either, for the same reason —
  // so the root's symbols are documented once, on the root's pages.
  const declarations = new Map<string, Declaration>();
  const byName = new Map<string, Declaration[]>();
  for (const module of root.children ?? []) {
    const specifier = ENTRY_LABEL[module.name] ?? module.name;
    for (const child of module.children ?? []) {
      if (KIND[child.kind]) {
        const declaration = { node: child, specifier };
        declarations.set(symbolKey(specifier, child.name), declaration);
        byName.set(child.name, [...(byName.get(child.name) ?? []), declaration]);
      }
    }
  }

  /**
   * The declaration a category means. Its own if it has one, otherwise the single shared
   * reflection — and never a guess: two declarations of a name are two different types, and
   * picking one of them is how a binding's page ends up showing the other's signature.
   */
  const declarationFor = (specifier: string, name: string): Declaration | undefined => {
    const own = declarations.get(symbolKey(specifier, name));
    if (own !== undefined) {
      return own;
    }
    const shared = byName.get(name) ?? [];
    return shared.length === 1 ? shared[0] : undefined;
  };

  // Where the category table says each name is rendered — built before anything is printed,
  // because that is what a cross-reference has to resolve against. A link out of the Solid
  // chapter lands in the Solid chapter, whichever entry point typedoc happened to walk first.
  const pageOf = new Set(
    CATEGORIES.flatMap((category) => {
      return category.symbols.map((name) => {
        return symbolKey(category.specifier, name);
      });
    })
  );

  const consumed = new Set<string>();

  const categories: ApiCategory[] = CATEGORIES.map((category) => {
    const ctx: PrintContext = {
      resolve: (name) => {
        const own = symbolKey(category.specifier, name);
        if (pageOf.has(own)) {
          return own;
        }
        const core = symbolKey(CORE, name);
        return pageOf.has(core) ? core : undefined;
      },
      warn,
    };
    return {
      id: category.id,
      label: category.label,
      specifier: category.specifier,
      blurb: category.blurb,
      symbols: category.symbols.map((name) => {
        const declaration = declarationFor(category.specifier, name);
        if (declaration === undefined) {
          throw new Error(
            `[dialog-api] category "${category.id}" lists "${name}", which "${category.specifier}" does not export.`
          );
        }
        consumed.add(symbolKey(declaration.specifier, name));
        // The symbol is keyed by the page it is on, not by where it was declared: a shared type
        // appears in each binding's chapter, and each copy has to be its own link target.
        const symbol = toSymbol(declaration.node, category.specifier, category.id, names, ctx);
        if (symbol === null) {
          throw new Error(
            `[dialog-api] "${symbolKey(category.specifier, name)}" has no renderable kind.`
          );
        }
        return symbol;
      }),
    };
  });

  const orphans = [...declarations.keys()].filter((key) => {
    return !consumed.has(key);
  });
  if (orphans.length > 0) {
    throw new Error(
      `[dialog-api] ${String(orphans.length)} export(s) belong to no category and would be ` +
        `unreachable in the reference: ${orphans.join(', ')}. Add them to CATEGORIES in ` +
        `playground/vite-plugins/api-model.ts.`
    );
  }

  return categories;
}

export function apiModelPlugin(): Plugin {
  const repoRoot = resolve(import.meta.dirname, '..', '..');
  const cacheDir = join(repoRoot, 'node_modules', '.cache', 'dialog-api');
  const watched = join(repoRoot, 'src');
  let cached: string | null = null;

  return {
    name: 'dialog-api-model',

    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },

    load(id) {
      if (id !== RESOLVED_ID) {
        return null;
      }
      const seen = new Set<string>();
      cached ??= JSON.stringify(
        buildModel(repoRoot, cacheDir, (message) => {
          // Once per distinct message: an unhandled type kind repeats across every symbol.
          if (!seen.has(message)) {
            seen.add(message);
            this.warn(message);
          }
        })
      );
      return `export default ${cached};`;
    },

    configureServer(server) {
      // The model is generated from `src`, which Vite does not otherwise watch on behalf of a
      // virtual module. Re-generate on change and let HMR push the new page.
      server.watcher.add(watched);
      server.watcher.on('change', (file) => {
        if (!file.startsWith(watched)) {
          return;
        }
        cached = null;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}
