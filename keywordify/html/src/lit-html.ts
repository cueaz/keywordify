/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2017 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// IMPORTANT: these imports must be type-only
import type {
  TrustedHTML,
  TrustedTypesWindow,
} from 'trusted-types/lib/index.js';
import * as K from '~keywords';
import type { Directive, DirectiveResult, PartInfo } from './directive.js';

const DEV_MODE = import.meta.custom.DEV_MODE;

const ENABLE_EXTRA_SECURITY_HOOKS = true;
const ENABLE_SHADYDOM_NOPATCH = false;
const NODE_MODE = false;

// Allows minifiers to rename references to globalThis
const global = globalThis as typeof globalThis & {
  [K.litIssuedWarnings]?: Set<string>;
  [K.litHtmlVersions]?: Array<unknown>;
  [K.litHtmlPolyfillSupportDevMode]?: ((
    template: unknown,
    childPart: unknown,
  ) => void) & {
    noPatchSupported?: boolean;
  };
  [K.litHtmlPolyfillSupport]?: ((
    template: unknown,
    childPart: unknown,
  ) => void) & {
    noPatchSupported?: boolean;
  };
  ShadyDOM?: {
    inUse: boolean;
    noPatch: boolean;
    wrap: <T extends Node>(n: T) => T;
  };
};

/**
 * Contains types that are part of the unstable debug API.
 *
 * Everything in this API is not stable and may change or be removed in the future,
 * even on patch releases.
 */
export namespace LitUnstable {
  /**
   * When Lit is running in dev mode and `window.emitLitDebugLogEvents` is true,
   * we will emit 'lit-debug' events to window, with live details about the update and render
   * lifecycle. These can be useful for writing debug tooling and visualizations.
   *
   * Please be aware that running with window.emitLitDebugLogEvents has performance overhead,
   * making certain operations that are normally very cheap (like a no-op render) much slower,
   * because we must copy data and dispatch events.
   */
  export namespace DebugLog {
    export type Entry =
      | TemplatePrep
      | TemplateInstantiated
      | TemplateInstantiatedAndUpdated
      | TemplateUpdating
      | BeginRender
      | EndRender
      | CommitPartEntry
      | SetPartValue;
    export interface TemplatePrep {
      kind: 'template prep';
      template: Template;
      strings: TemplateStringsArray;
      cloneableTemplate: HTMLTemplateElement;
      parts: TemplatePart[];
    }
    export interface BeginRender {
      kind: 'begin render';
      id: number;
      value: unknown;
      container: RenderRootNode;
      options: RenderOptions | undefined;
      part: ChildPart | undefined;
    }
    export interface EndRender {
      kind: 'end render';
      id: number;
      value: unknown;
      container: RenderRootNode;
      options: RenderOptions | undefined;
      part: ChildPart;
    }
    export interface TemplateInstantiated {
      kind: 'template instantiated';
      template: Template | CompiledTemplate;
      instance: TemplateInstance;
      options: RenderOptions | undefined;
      fragment: Node;
      parts: Array<Part | undefined>;
      values: unknown[];
    }
    export interface TemplateInstantiatedAndUpdated {
      kind: 'template instantiated and updated';
      template: Template | CompiledTemplate;
      instance: TemplateInstance;
      options: RenderOptions | undefined;
      fragment: Node;
      parts: Array<Part | undefined>;
      values: unknown[];
    }
    export interface TemplateUpdating {
      kind: 'template updating';
      template: Template | CompiledTemplate;
      instance: TemplateInstance;
      options: RenderOptions | undefined;
      parts: Array<Part | undefined>;
      values: unknown[];
    }
    export interface SetPartValue {
      kind: 'set part';
      part: Part;
      value: unknown;
      valueIndex: number;
      values: unknown[];
      templateInstance: TemplateInstance;
    }

    export type CommitPartEntry =
      | CommitNothingToChildEntry
      | CommitText
      | CommitNode
      | CommitAttribute
      | CommitProperty
      | CommitBooleanAttribute
      | CommitEventListener
      | CommitToElementBinding;

    export interface CommitNothingToChildEntry {
      kind: 'commit nothing to child';
      start: ChildNode;
      end: ChildNode | null;
      parent: Disconnectable | undefined;
      options: RenderOptions | undefined;
    }

    export interface CommitText {
      kind: 'commit text';
      node: Text;
      value: unknown;
      options: RenderOptions | undefined;
    }

    export interface CommitNode {
      kind: 'commit node';
      start: Node;
      parent: Disconnectable | undefined;
      value: Node;
      options: RenderOptions | undefined;
    }

    export interface CommitAttribute {
      kind: 'commit attribute';
      element: Element;
      name: string;
      value: unknown;
      options: RenderOptions | undefined;
    }

    export interface CommitProperty {
      kind: 'commit property';
      element: Element;
      name: string;
      value: unknown;
      options: RenderOptions | undefined;
    }

    export interface CommitBooleanAttribute {
      kind: 'commit boolean attribute';
      element: Element;
      name: string;
      value: boolean;
      options: RenderOptions | undefined;
    }

    export interface CommitEventListener {
      kind: 'commit event listener';
      element: Element;
      name: string;
      value: unknown;
      oldListener: unknown;
      options: RenderOptions | undefined;
      // True if we're removing the old event listener (e.g. because settings changed, or value is nothing)
      removeListener: boolean;
      // True if we're adding a new event listener (e.g. because first render, or settings changed)
      addListener: boolean;
    }

    export interface CommitToElementBinding {
      kind: 'commit to element binding';
      element: Element;
      value: unknown;
      options: RenderOptions | undefined;
    }
  }
}

interface DebugLoggingWindow {
  // Even in dev mode, we generally don't want to emit these events, as that's
  // another level of cost, so only emit them when DEV_MODE is true _and_ when
  // window.emitLitDebugEvents is true.
  emitLitDebugLogEvents?: boolean;
}

/**
 * Useful for visualizing and logging insights into what the Lit template system is doing.
 *
 * Compiled out of prod mode builds.
 */
const debugLogEvent = DEV_MODE
  ? (event: LitUnstable.DebugLog.Entry) => {
      const shouldEmit = (global as unknown as DebugLoggingWindow)
        .emitLitDebugLogEvents;
      if (!shouldEmit) {
        return;
      }
      global.dispatchEvent(
        new CustomEvent<LitUnstable.DebugLog.Entry>('lit-debug', {
          detail: event,
        }),
      );
    }
  : undefined;
// Used for connecting beginRender and endRender events when there are nested
// renders when errors are thrown preventing an endRender event from being
// called.
let debugLogRenderId = 0;

let issueWarning: (code: string, warning: string) => void;

if (DEV_MODE) {
  global[K.litIssuedWarnings] ??= new Set();

  /**
   * Issue a warning if we haven't already, based either on `code` or `warning`.
   * Warnings are disabled automatically only by `warning`; disabling via `code`
   * can be done by users.
   */
  issueWarning = (code: string, warning: string) => {
    warning += code
      ? ` See https://lit.dev/msg/${code} for more information.`
      : '';
    if (
      !global[K.litIssuedWarnings]!.has(warning) &&
      !global[K.litIssuedWarnings]!.has(code)
    ) {
      console.warn(warning);
      global[K.litIssuedWarnings]!.add(warning);
    }
  };

  queueMicrotask(() => {
    issueWarning(
      'dev-mode',
      `Lit is in dev mode. Not recommended for production!`,
    );
  });
}

const wrap =
  ENABLE_SHADYDOM_NOPATCH &&
  global.ShadyDOM?.inUse &&
  global.ShadyDOM?.noPatch === true
    ? global.ShadyDOM!.wrap
    : <T extends Node>(node: T) => node;

const trustedTypes = (global as unknown as TrustedTypesWindow).trustedTypes;

/**
 * Our TrustedTypePolicy for HTML which is declared using the html template
 * tag function.
 *
 * That HTML is a developer-authored constant, and is parsed with innerHTML
 * before any untrusted expressions have been mixed in. Therefor it is
 * considered safe by construction.
 */
const policy = trustedTypes
  ? trustedTypes.createPolicy(K.LIT_HTML, {
      createHTML: (s) => s,
    })
  : undefined;

/**
 * Used to sanitize any value before it is written into the DOM. This can be
 * used to implement a security policy of allowed and disallowed values in
 * order to prevent XSS attacks.
 *
 * One way of using this callback would be to check attributes and properties
 * against a list of high risk fields, and require that values written to such
 * fields be instances of a class which is safe by construction. Closure's Safe
 * HTML Types is one implementation of this technique (
 * https://github.com/google/safe-html-types/blob/master/doc/safehtml-types.md).
 * The TrustedTypes polyfill in API-only mode could also be used as a basis
 * for this technique (https://github.com/WICG/trusted-types).
 *
 * @param node The HTML node (usually either a #text node or an Element) that
 *     is being written to. Note that this is just an exemplar node, the write
 *     may take place against another instance of the same class of node.
 * @param name The name of an attribute or property (for example, 'href').
 * @param type Indicates whether the write that's about to be performed will
 *     be to a property or a node.
 * @return A function that will sanitize this class of writes.
 */
export type SanitizerFactory = (
  node: Node,
  name: string,
  type: typeof K.property | typeof K.attribute,
) => ValueSanitizer;

/**
 * A function which can sanitize values that will be written to a specific kind
 * of DOM sink.
 *
 * See SanitizerFactory.
 *
 * @param value The value to sanitize. Will be the actual value passed into
 *     the lit-html template literal, so this could be of any type.
 * @return The value to write to the DOM. Usually the same as the input value,
 *     unless sanitization is needed.
 */
export type ValueSanitizer = (value: unknown) => unknown;

const identityFunction: ValueSanitizer = (value: unknown) => value;
const noopSanitizer: SanitizerFactory = (
  _node: Node,
  _name: string,
  _type: typeof K.property | typeof K.attribute,
) => identityFunction;

/** Sets the global sanitizer factory. */
const setSanitizer = (newSanitizer: SanitizerFactory) => {
  if (!ENABLE_EXTRA_SECURITY_HOOKS) {
    return;
  }
  if (sanitizerFactoryInternal !== noopSanitizer) {
    if (DEV_MODE) {
      throw new Error(
        `Attempted to overwrite existing lit-html security policy.` +
          ` setSanitizeDOMValueFactory should be called at most once.`,
      );
    } else {
      throw new Error();
    }
  }
  sanitizerFactoryInternal = newSanitizer;
};

/**
 * Only used in internal tests, not a part of the public API.
 */
const _testOnlyClearSanitizerFactoryDoNotCallOrElse = () => {
  sanitizerFactoryInternal = noopSanitizer;
};

const createSanitizer: SanitizerFactory = (node, name, type) => {
  return sanitizerFactoryInternal(node, name, type);
};

// Added to an attribute name to mark the attribute as bound so we can find
// it easily.
const boundAttributeSuffix = '\ue001\u28f0\ue001';

// This marker is used in many syntactic positions in HTML, so it must be
// a valid element name and attribute name. We don't support dynamic names (yet)
// but this at least ensures that the parse tree is closer to the template
// intention.
const _r = () => (Math.random() * 15) | 0x28f1;
const marker = `z\ue001${String.fromCharCode(...Array.from({ length: 30 }, _r))}\ue001`;

// String used to tell if a comment is a marker comment. We must preserve
// a prefix (like `z`) to distinguish `CHILD_PART` structural nodes from
// user-defined comments that happen to contain a binding (e.g., `<!--${x}-->`).
const markerMatch = `z${marker}`;

// Text used to insert a comment marker node. We use standard HTML comment
// syntax `<!--...-->` to prevent parse-time generation of bogus comments `<?...>`
// which leaves `?` character residue in the DOM.
const nodeMarker = `<!--${markerMatch}-->`;

const d =
  NODE_MODE && global.document === undefined
    ? ({
        createTreeWalker() {
          return {};
        },
      } as unknown as Document)
    : document;

// Creates a dynamic marker. We never have to search for these in the DOM.
const createMarker = () => d.createComment('');

// https://tc39.github.io/ecma262/#sec-typeof-operator
type Primitive = null | undefined | boolean | number | string | symbol | bigint;
const isPrimitive = (value: unknown): value is Primitive =>
  value === null || (typeof value !== 'object' && typeof value !== 'function');
const isArray = Array.isArray;
const isIterable = (value: unknown): value is Iterable<unknown> =>
  isArray(value) ||
  typeof (value as { [Symbol.iterator]?: unknown })?.[Symbol.iterator] ===
    'function';

const SPACE_CHAR = `[ \t\n\f\r]`;
const ATTR_VALUE_CHAR = `[^ \t\n\f\r"'\`<>=]`;
const NAME_CHAR = `[^\\s"'>=/]`;

// These regexes represent the five parsing states that we care about in the
// Template's HTML scanner. They match the *end* of the state they're named
// after.
// Depending on the match, we transition to a new state. If there's no match,
// we stay in the same state.
// Note that the regexes are stateful. We utilize lastIndex and sync it
// across the multiple regexes used. In addition to the five regexes below
// we also dynamically create a regex to find the matching end tags for raw
// text elements.

/**
 * End of text is: `<` followed by:
 *   (comment start) or (tag) or (dynamic tag binding)
 */
const textEndRegex = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
const COMMENT_START = 1;
const TAG_NAME = 2;
const DYNAMIC_TAG_NAME = 3;

const commentEndRegex = /-->/g;
/**
 * Comments not started with <!--, like </{, can be ended by a single `>`
 */
const comment2EndRegex = />/g;

/**
 * The tagEnd regex matches the end of the "inside an opening" tag syntax
 * position. It either matches a `>`, an attribute-like sequence, or the end
 * of the string after a space (attribute-name position ending).
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#elements-attributes
 *
 * " \t\n\f\r" are HTML space characters:
 * https://infra.spec.whatwg.org/#ascii-whitespace
 *
 * So an attribute is:
 *  * The name: any character except a whitespace character, ("), ('), ">",
 *    "=", or "/". Note: this is different from the HTML spec which also excludes control characters.
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const tagEndRegex = new RegExp(
  `>|${SPACE_CHAR}(?:(${NAME_CHAR}+)(${SPACE_CHAR}*=${SPACE_CHAR}*(?:${ATTR_VALUE_CHAR}|("|')|))|$)`,
  'g',
);
const ENTIRE_MATCH = 0;
const ATTRIBUTE_NAME = 1;
const SPACES_AND_EQUALS = 2;
const QUOTE_CHAR = 3;

const singleQuoteAttrEndRegex = /'/g;
const doubleQuoteAttrEndRegex = /"/g;
/**
 * Matches the raw text elements.
 *
 * Comments are not parsed within raw text elements, so we need to search their
 * text content for marker strings.
 */
const rawTextElement = /^(?:script|style|textarea|title)$/i;

/** TemplateResult types */
const HTML_RESULT = 1;
const SVG_RESULT = 2;
const MATHML_RESULT = 3;

type ResultType = typeof HTML_RESULT | typeof SVG_RESULT | typeof MATHML_RESULT;

// TemplatePart types
// IMPORTANT: these must match the values in PartType
const ATTRIBUTE_PART = 1;
const CHILD_PART = 2;
const PROPERTY_PART = 3;
const BOOLEAN_ATTRIBUTE_PART = 4;
const EVENT_PART = 5;
const ELEMENT_PART = 6;
const COMMENT_PART = 7;

/**
 * The return type of the template tag functions, {@linkcode html} and
 * {@linkcode svg} when it hasn't been compiled by @lit-labs/compiler.
 *
 * A `TemplateResult` object holds all the information about a template
 * expression required to render it: the template strings, expression values,
 * and type of template (html or svg).
 *
 * `TemplateResult` objects do not create any DOM on their own. To create or
 * update DOM you need to render the `TemplateResult`. See
 * [Rendering](https://lit.dev/docs/components/rendering) for more information.
 *
 */
export type UncompiledTemplateResult<T extends ResultType = ResultType> = {
  // This property needs to remain unminified.
  [K._$litType$]: T;
  [K.strings]: TemplateStringsArray;
  [K.values]: unknown[];
};

/**
 * This is a template result that may be either uncompiled or compiled.
 *
 * In the future, TemplateResult will be this type. If you want to explicitly
 * note that a template result is potentially compiled, you can reference this
 * type and it will continue to behave the same through the next major version
 * of Lit. This can be useful for code that wants to prepare for the next
 * major version of Lit.
 */
export type MaybeCompiledTemplateResult<T extends ResultType = ResultType> =
  | UncompiledTemplateResult<T>
  | CompiledTemplateResult;

/**
 * The return type of the template tag functions, {@linkcode html} and
 * {@linkcode svg}.
 *
 * A `TemplateResult` object holds all the information about a template
 * expression required to render it: the template strings, expression values,
 * and type of template (html or svg).
 *
 * `TemplateResult` objects do not create any DOM on their own. To create or
 * update DOM you need to render the `TemplateResult`. See
 * [Rendering](https://lit.dev/docs/components/rendering) for more information.
 *
 * In Lit 4, this type will be an alias of
 * MaybeCompiledTemplateResult, so that code will get type errors if it assumes
 * that Lit templates are not compiled. When deliberately working with only
 * one, use either {@linkcode CompiledTemplateResult} or
 * {@linkcode UncompiledTemplateResult} explicitly.
 */
export type TemplateResult<T extends ResultType = ResultType> =
  UncompiledTemplateResult<T>;

export type HTMLTemplateResult = TemplateResult<typeof HTML_RESULT>;

export type SVGTemplateResult = TemplateResult<typeof SVG_RESULT>;

export type MathMLTemplateResult = TemplateResult<typeof MATHML_RESULT>;

/**
 * A TemplateResult that has been compiled by @lit-labs/compiler, skipping the
 * prepare step.
 */
export interface CompiledTemplateResult {
  // This is a factory in order to make template initialization lazy
  // and allow ShadyRenderOptions scope to be passed in.
  // This property needs to remain unminified.
  [K._$litType$]: CompiledTemplate;
  [K.values]: unknown[];
}

export interface CompiledTemplate extends Omit<Template, typeof K.el> {
  // el is overridden to be optional. We initialize it on first render
  [K.el]?: HTMLTemplateElement;

  // The prepared HTML string to create a template element from.
  // The type is a TemplateStringsArray to guarantee that the value came from
  // source code, preventing a JSON injection attack.
  [K.h]: TemplateStringsArray;
}

/**
 * Generates a template literal tag function that returns a TemplateResult with
 * the given result type.
 */
const tag =
  <T extends ResultType>(type: T) =>
  (strings: TemplateStringsArray, ...values: unknown[]): TemplateResult<T> => {
    // Warn against templates octal escape sequences
    // We do this here rather than in render so that the warning is closer to the
    // template definition.
    if (DEV_MODE && strings.some((s) => s === undefined)) {
      console.warn(
        'Some template strings are undefined.\n' +
          'This is probably caused by illegal octal escape sequences.',
      );
    }
    if (DEV_MODE) {
      // Import static-html.js results in a circular dependency which g3 doesn't
      // handle. Instead we know that static values must have the field
      // `_$litStatic$`.
      if (
        values.some(
          (val) => (val as { [K._$litStatic$]: unknown })?.[K._$litStatic$],
        )
      ) {
        issueWarning(
          '',
          `Static values 'literal' or 'unsafeStatic' cannot be used as values to non-static templates.\n` +
            `Please use the static 'html' tag function. See https://lit.dev/docs/templates/expressions/#static-expressions`,
        );
      }
    }
    return {
      // This property needs to remain unminified.
      [K._$litType$]: type,
      [K.strings]: strings,
      [K.values]: values,
    };
  };

/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 *
 * ```ts
 * const header = (title: string) => html`<h1>${title}</h1>`;
 * ```
 *
 * The `html` tag returns a description of the DOM to render as a value. It is
 * lazy, meaning no work is done until the template is rendered. When rendering,
 * if a template comes from the same expression as a previously rendered result,
 * it's efficiently updated instead of replaced.
 */
export const html = tag(HTML_RESULT);

/**
 * Interprets a template literal as an SVG fragment that can efficiently render
 * to and update a container.
 *
 * ```ts
 * const rect = svg`<rect width="10" height="10"></rect>`;
 *
 * const myImage = html`
 *   <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
 *     ${rect}
 *   </svg>`;
 * ```
 *
 * The `svg` *tag function* should only be used for SVG fragments, or elements
 * that would be contained **inside** an `<svg>` HTML element. A common error is
 * placing an `<svg>` *element* in a template tagged with the `svg` tag
 * function. The `<svg>` element is an HTML element and should be used within a
 * template tagged with the {@linkcode html} tag function.
 *
 * In LitElement usage, it's invalid to return an SVG fragment from the
 * `render()` method, as the SVG fragment will be contained within the element's
 * shadow root and thus not be properly contained within an `<svg>` HTML
 * element.
 */
export const svg = tag(SVG_RESULT);

/**
 * Interprets a template literal as MathML fragment that can efficiently render
 * to and update a container.
 *
 * ```ts
 * const num = mathml`<mn>1</mn>`;
 *
 * const eq = html`
 *   <math>
 *     ${num}
 *   </math>`;
 * ```
 *
 * The `mathml` *tag function* should only be used for MathML fragments, or
 * elements that would be contained **inside** a `<math>` HTML element. A common
 * error is placing a `<math>` *element* in a template tagged with the `mathml`
 * tag function. The `<math>` element is an HTML element and should be used
 * within a template tagged with the {@linkcode html} tag function.
 *
 * In LitElement usage, it's invalid to return an MathML fragment from the
 * `render()` method, as the MathML fragment will be contained within the
 * element's shadow root and thus not be properly contained within a `<math>`
 * HTML element.
 */
export const mathml = tag(MATHML_RESULT);

/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
export const noChange = Symbol.for(K.LIT_NOCHANGE);

/**
 * A sentinel value that signals a ChildPart to fully clear its content.
 *
 * ```ts
 * const button = html`${
 *  user.isAdmin
 *    ? html`<button>DELETE</button>`
 *    : nothing
 * }`;
 * ```
 *
 * Prefer using `nothing` over other falsy values as it provides a consistent
 * behavior between various expression binding contexts.
 *
 * In child expressions, `undefined`, `null`, `''`, and `nothing` all behave the
 * same and render no nodes. In attribute expressions, `nothing` _removes_ the
 * attribute, while `undefined` and `null` will render an empty string. In
 * property expressions `nothing` becomes `undefined`.
 */
export const nothing = Symbol.for(K.LIT_NOTHING);

/**
 * The cache of prepared templates, keyed by the tagged TemplateStringsArray
 * and _not_ accounting for the specific template tag used. This means that
 * template tags cannot be dynamic - they must statically be one of html, svg,
 * or attr. This restriction simplifies the cache lookup, which is on the hot
 * path for rendering.
 */
const templateCache = new WeakMap<TemplateStringsArray, Template>();

/**
 * Object specifying options for controlling lit-html rendering. Note that
 * while `render` may be called multiple times on the same `container` (and
 * `renderBefore` reference node) to efficiently update the rendered content,
 * only the options passed in during the first render are respected during
 * the lifetime of renders to that unique `container` + `renderBefore`
 * combination.
 */
export interface RenderOptions {
  /**
   * An object to use as the `this` value for event listeners. It's often
   * useful to set this to the host component rendering a template.
   */
  [K.host]?: object;
  /**
   * A DOM node before which to render content in the container.
   */
  [K.renderBefore]?: ChildNode | null;
  /**
   * Node used for cloning the template (`importNode` will be called on this
   * node). This controls the `ownerDocument` of the rendered DOM, along with
   * any inherited context. Defaults to the global `document`.
   */
  [K.creationScope]?: { importNode(node: Node, deep?: boolean): Node };
  /**
   * The initial connected state for the top-level part being rendered. If no
   * `isConnected` option is set, `AsyncDirective`s will be connected by
   * default. Set to `false` if the initial render occurs in a disconnected tree
   * and `AsyncDirective`s should see `isConnected === false` for their initial
   * render. The `part.setConnected()` method must be used subsequent to initial
   * render to change the connected state of the part.
   */
  [K.isConnected]?: boolean;
}

/**
 * The root DOM node for rendering.
 */
export type RenderRootNode = HTMLElement | SVGElement | DocumentFragment;

const walker = d.createTreeWalker(
  d,
  129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */,
);

let sanitizerFactoryInternal: SanitizerFactory = noopSanitizer;

//
// Classes only below here, const variable declarations only above here...
//
// Keeping variable declarations and classes together improves minification.
// Interfaces and type aliases can be interleaved freely.
//

// Type for classes that have a `_directive` or `_directives[]` field, used by
// `resolveDirective`
export interface DirectiveParent {
  [K._$parent]?: DirectiveParent | undefined;
  [K._$isConnected]: boolean;
  [K.__directive]?: Directive | undefined;
  [K.__directives]?: Array<Directive | undefined> | undefined;
}

function trustFromTemplateString(
  tsa: TemplateStringsArray,
  stringFromTSA: string,
): TrustedHTML {
  // A security check to prevent spoofing of Lit template results.
  // In the future, we may be able to replace this with Array.isTemplateObject,
  // though we might need to make that check inside of the html and svg
  // functions, because precompiled templates don't come in as
  // TemplateStringArray objects.
  if (!isArray(tsa) || !Object.hasOwn(tsa, 'raw')) {
    if (DEV_MODE) {
      let message = 'invalid template strings array';
      message = `
          Internal Error: expected template strings to be an array
          with a 'raw' field. Faking a template strings array by
          calling html or svg like an ordinary function is effectively
          the same as calling unsafeHtml and can lead to major security
          issues, e.g. opening your code up to XSS attacks.
          If you're using the html or svg tagged template functions normally
          and still seeing this error, please file a bug at
          https://github.com/lit/lit/issues/new?template=bug_report.md
          and include information about your build tooling, if any.
        `
        .trim()
        .replace(/\n */g, '\n');
      throw new Error(message);
    } else {
      throw new Error();
    }
  }
  return policy !== undefined
    ? policy.createHTML(stringFromTSA)
    : (stringFromTSA as unknown as TrustedHTML);
}

/**
 * Returns an HTML string for the given TemplateStringsArray and result type
 * (HTML or SVG), along with the case-sensitive bound attribute names in
 * template order. The HTML contains comment markers denoting the `ChildPart`s
 * and suffixes on bound attributes denoting the `AttributeParts`.
 *
 * @param strings template strings array
 * @param type HTML or SVG
 * @return Array containing `[html, attrNames]` (array returned for terseness,
 *     to avoid object fields since this code is shared with non-minified SSR
 *     code)
 */
const getTemplateHtml = (
  strings: TemplateStringsArray,
  type: ResultType,
): [TrustedHTML, Array<string>] => {
  // Insert makers into the template HTML to represent the position of
  // bindings. The following code scans the template strings to determine the
  // syntactic position of the bindings. They can be in text position, where
  // we insert an HTML comment, attribute value position, where we insert a
  // sentinel string and re-write the attribute name, or inside a tag where
  // we insert the sentinel string.
  const l = strings.length - 1;
  // Stores the case-sensitive bound attribute names in the order of their
  // parts. ElementParts are also reflected in this array as undefined
  // rather than a string, to disambiguate from attribute bindings.
  const attrNames: Array<string> = [];
  let html =
    type === SVG_RESULT ? '<svg>' : type === MATHML_RESULT ? '<math>' : '';

  // When we're inside a raw text tag (not it's text content), the regex
  // will still be tagRegex so we can find attributes, but will switch to
  // this regex when the tag ends.
  let rawTextEndRegex: RegExp | undefined;

  // The current parsing state, represented as a reference to one of the
  // regexes
  let regex = textEndRegex;

  for (let i = 0; i < l; i++) {
    const s = strings[i]!;
    // The index of the end of the last attribute name. When this is
    // positive at end of a string, it means we're in an attribute value
    // position and need to rewrite the attribute name.
    // We also use a special value of -2 to indicate that we encountered
    // the end of a string in attribute name position.
    let attrNameEndIndex = -1;
    let attrName: string | undefined;
    let lastIndex = 0;
    let match!: RegExpExecArray | null;

    // The conditions in this loop handle the current parse state, and the
    // assignments to the `regex` variable are the state transitions.
    while (lastIndex < s.length) {
      // Make sure we start searching from where we previously left off
      regex.lastIndex = lastIndex;
      match = regex.exec(s);
      if (match === null) {
        break;
      }
      lastIndex = regex.lastIndex;
      if (regex === textEndRegex) {
        if (match[COMMENT_START] === '!--') {
          regex = commentEndRegex;
        } else if (match[COMMENT_START] !== undefined) {
          // We started a weird comment, like </{
          regex = comment2EndRegex;
        } else if (match[TAG_NAME] !== undefined) {
          if (rawTextElement.test(match[TAG_NAME])) {
            // Record if we encounter a raw-text element. We'll switch to
            // this regex at the end of the tag.
            rawTextEndRegex = new RegExp(`</${match[TAG_NAME]}`, 'g');
          }
          regex = tagEndRegex;
        } else if (match[DYNAMIC_TAG_NAME] !== undefined) {
          if (DEV_MODE) {
            throw new Error(
              'Bindings in tag names are not supported. Please use static templates instead. ' +
                'See https://lit.dev/docs/templates/expressions/#static-expressions',
            );
          }
          regex = tagEndRegex;
        }
      } else if (regex === tagEndRegex) {
        if (match[ENTIRE_MATCH] === '>') {
          // End of a tag. If we had started a raw-text element, use that
          // regex
          regex = rawTextEndRegex ?? textEndRegex;
          // We may be ending an unquoted attribute value, so make sure we
          // clear any pending attrNameEndIndex
          attrNameEndIndex = -1;
        } else if (match[ATTRIBUTE_NAME] === undefined) {
          // Attribute name position
          attrNameEndIndex = -2;
        } else {
          attrNameEndIndex = regex.lastIndex - match[SPACES_AND_EQUALS]!.length;
          attrName = match[ATTRIBUTE_NAME];
          regex =
            match[QUOTE_CHAR] === undefined
              ? tagEndRegex
              : match[QUOTE_CHAR] === '"'
                ? doubleQuoteAttrEndRegex
                : singleQuoteAttrEndRegex;
        }
      } else if (
        regex === doubleQuoteAttrEndRegex ||
        regex === singleQuoteAttrEndRegex
      ) {
        regex = tagEndRegex;
      } else if (regex === commentEndRegex || regex === comment2EndRegex) {
        regex = textEndRegex;
      } else {
        // Not one of the five state regexes, so it must be the dynamically
        // created raw text regex and we're at the close of that element.
        regex = tagEndRegex;
        rawTextEndRegex = undefined;
      }
    }

    if (DEV_MODE) {
      // If we have a attrNameEndIndex, which indicates that we should
      // rewrite the attribute name, assert that we're in a valid attribute
      // position - either in a tag, or a quoted attribute value.
      console.assert(
        attrNameEndIndex === -1 ||
          regex === tagEndRegex ||
          regex === singleQuoteAttrEndRegex ||
          regex === doubleQuoteAttrEndRegex,
        'unexpected parse state B',
      );
    }

    // We have four cases:
    //  1. We're in text position, and not in a raw text element
    //     (regex === textEndRegex): insert a comment marker.
    //  2. We have a non-negative attrNameEndIndex which means we need to
    //     rewrite the attribute name to add a bound attribute suffix.
    //  3. We're at the non-first binding in a multi-binding attribute, use a
    //     plain marker.
    //  4. We're somewhere else inside the tag. If we're in attribute name
    //     position (attrNameEndIndex === -2), add a sequential suffix to
    //     generate a unique attribute name.

    // Detect a binding next to self-closing tag end and insert a space to
    // separate the marker from the tag end:
    const end =
      regex === tagEndRegex && strings[i + 1]!.startsWith('/>') ? ' ' : '';
    html +=
      regex === textEndRegex
        ? s + nodeMarker
        : attrNameEndIndex >= 0
          ? (() => {
              attrNames.push(attrName!);
              return (
                s.slice(0, attrNameEndIndex) +
                boundAttributeSuffix +
                s.slice(attrNameEndIndex)
              );
            })() +
            marker +
            end
          : s + marker + (attrNameEndIndex === -2 ? i : end);
  }

  const htmlResult: string | TrustedHTML =
    html +
    (strings[l] || '<!---->') +
    (type === SVG_RESULT ? '</svg>' : type === MATHML_RESULT ? '</math>' : '');

  // Returned as an array for terseness
  return [trustFromTemplateString(strings, htmlResult), attrNames];
};

/** @internal */
export type { Template };

class Template {
  /** @internal */
  [K.el]!: HTMLTemplateElement;

  [K.parts]: Array<TemplatePart> = [];

  constructor(
    // This property needs to remain unminified.
    { [K.strings]: strings, [K._$litType$]: type }: UncompiledTemplateResult,
    options?: RenderOptions,
  ) {
    let node: Node | null;
    let nodeIndex = 0;
    let attrNameIndex = 0;
    const partCount = strings.length - 1;
    const parts = this[K.parts];

    // Create template element
    const [html, attrNames] = getTemplateHtml(strings, type);
    this[K.el] = Template[K.createElement](html, options);
    walker.currentNode = this[K.el].content;

    // Re-parent SVG or MathML nodes into template root
    if (type === SVG_RESULT || type === MATHML_RESULT) {
      const wrapper = this[K.el].content.firstChild!;
      wrapper.replaceWith(...wrapper.childNodes);
    }

    // Walk the template to find binding markers and create TemplateParts
    while (parts.length < partCount) {
      node = walker.nextNode();
      if (node === null) {
        break;
      }
      if (node.nodeType === 1) {
        if (DEV_MODE) {
          const tag = (node as Element).localName;
          // Warn if `textarea` includes an expression and throw if `template`
          // does since these are not supported. We do this by checking
          // innerHTML for anything that looks like a marker. This catches
          // cases like bindings in textarea there markers turn into text nodes.
          if (
            /^(?:textarea|template)$/i.test(tag) &&
            (node as Element).innerHTML.includes(marker)
          ) {
            const m =
              `Expressions are not supported inside \`${tag}\` ` +
              `elements. See https://lit.dev/msg/expression-in-${tag} for more ` +
              `information.`;
            if (tag === 'template') {
              throw new Error(m);
            } else issueWarning('', m);
          }
        }
        // TODO (justinfagnani): for attempted dynamic tag names, we don't
        // increment the bindingIndex, and it'll be off by 1 in the element
        // and off by two after it.
        if ((node as Element).hasAttributes()) {
          for (const name of (node as Element).getAttributeNames()) {
            if (name.endsWith(boundAttributeSuffix)) {
              const realName = attrNames[attrNameIndex++]!;
              const value = (node as Element).getAttribute(name)!;
              const statics = value.split(marker);
              const m = /([.?@])?(.*)/.exec(realName)!;
              parts.push({
                [K.type]: ATTRIBUTE_PART,
                [K.index]: nodeIndex,
                [K.name]: m[2]!,
                [K.strings]: statics,
                [K.ctor]:
                  m[1] === '.'
                    ? PropertyPart
                    : m[1] === '?'
                      ? BooleanAttributePart
                      : m[1] === '@'
                        ? EventPart
                        : AttributePart,
              });
              (node as Element).removeAttribute(name);
            } else if (name.startsWith(marker)) {
              parts.push({
                [K.type]: ELEMENT_PART,
                [K.index]: nodeIndex,
              });
              (node as Element).removeAttribute(name);
            }
          }
        }
        // TODO (justinfagnani): benchmark the regex against testing for each
        // of the 3 raw text element names.
        if (rawTextElement.test((node as Element).tagName)) {
          // For raw text elements we need to split the text content on
          // markers, create a Text node for each segment, and create
          // a TemplatePart for each marker.
          const strings = (node as Element).textContent!.split(marker);
          const lastIndex = strings.length - 1;
          if (lastIndex > 0) {
            (node as Element).textContent = trustedTypes
              ? (trustedTypes.emptyScript as unknown as '')
              : '';
            // Generate a new text node for each literal section
            // These nodes are also used as the markers for child parts
            for (let i = 0; i < lastIndex; i++) {
              (node as Element).append(strings[i]!, createMarker());
              // Walk past the marker node we just added
              walker.nextNode();
              parts.push({ [K.type]: CHILD_PART, [K.index]: ++nodeIndex });
            }
            // Note because this marker is added after the walker's current
            // node, it will be walked to in the outer loop (and ignored), so
            // we don't need to adjust nodeIndex here
            (node as Element).append(strings[lastIndex]!, createMarker());
          }
        }
      } else if (node.nodeType === 8) {
        const data = (node as Comment).data;
        if (data === markerMatch) {
          parts.push({ [K.type]: CHILD_PART, [K.index]: nodeIndex });
          // Erase the random marker signature completely from the parsed DOM
          // so that cloned template instances leave an entirely generic footprint (<!---->).
          (node as Comment).data = '';
        } else {
          let i = -1;
          while (true) {
            i = (node as Comment).data.indexOf(marker, i + 1);
            if (i === -1) {
              break;
            }
            // Comment node has a binding marker inside, make an inactive part
            // The binding won't work, but subsequent bindings will
            parts.push({ [K.type]: COMMENT_PART, [K.index]: nodeIndex });
            // Move to the end of the match
            i += marker.length - 1;
          }
          // Erase embedded markers completely.
          // `nodeMarker` inserts `<${markerMatch}>` (`<zz...`). Inside the parser,
          // `textEndRegex` inserts `<${nodeMarker}>` into the string.
          // Other bindings insert `<${marker}>` directly.
          // First, we wipe the leading `markerMatch` (`zz...`) to handle the first binding.
          (node as Comment).data = (node as Comment).data
            .split(markerMatch)
            .join('');
          // Then, we wipe any subsequent `marker` (`z...`) bindings in the same comment.
          (node as Comment).data = (node as Comment).data
            .split(marker)
            .join('');
        }
      }
      nodeIndex++;
    }

    if (DEV_MODE) {
      // If there was a duplicate attribute on a tag, then when the tag is
      // parsed into an element the attribute gets de-duplicated. We can detect
      // this mismatch if we haven't precisely consumed every attribute name
      // when preparing the template. This works because `attrNames` is built
      // from the template string and `attrNameIndex` comes from processing the
      // resulting DOM.
      if (attrNames.length !== attrNameIndex) {
        throw new Error(
          `Detected duplicate attribute bindings. This occurs if your template ` +
            `has duplicate attributes on an element tag. For example ` +
            `"<input ?disabled=\${true} ?disabled=\${false}>" contains a ` +
            `duplicate "disabled" attribute. The error was detected in ` +
            `the following template: \n` +
            '`' +
            // biome-ignore lint/suspicious/noTemplateCurlyInString: explaining code in error message
            strings.join('${...}') +
            '`',
        );
      }
    }

    // We could set walker.currentNode to another node here to prevent a memory
    // leak, but every time we prepare a template, we immediately render it
    // and re-use the walker in new TemplateInstance._clone().
    debugLogEvent?.({
      kind: 'template prep',
      template: this,
      cloneableTemplate: this[K.el],
      parts: this[K.parts],
      strings,
    });
  }

  // Overridden via `litHtmlPolyfillSupport` to provide platform support.
  /** @nocollapse */
  static [K.createElement](html: TrustedHTML, _options?: RenderOptions) {
    const el = d.createElement('template');
    el.innerHTML = html as unknown as string;
    return el;
  }
}

export interface Disconnectable {
  [K._$parent]?: Disconnectable | undefined;
  [K._$disconnectableChildren]?: Set<Disconnectable> | undefined;
  // Rather than hold connection state on instances, Disconnectables recursively
  // fetch the connection state from the RootPart they are connected in via
  // getters up the Disconnectable tree via _$parent references. This pushes the
  // cost of tracking the isConnected state to `AsyncDirectives`, and avoids
  // needing to pass all Disconnectables (parts, template instances, and
  // directives) their connection state each time it changes, which would be
  // costly for trees that have no AsyncDirectives.
  [K._$isConnected]: boolean;
}

function resolveDirective(
  part: ChildPart | AttributePart | ElementPart,
  value: unknown,
  parent: DirectiveParent = part,
  attributeIndex?: number,
): unknown {
  // Bail early if the value is explicitly noChange. Note, this means any
  // nested directive is still attached and is not run.
  if (value === noChange) {
    return value;
  }
  let currentDirective =
    attributeIndex !== undefined
      ? (parent as AttributePart)[K.__directives]?.[attributeIndex]
      : (parent as ChildPart | ElementPart | Directive)[K.__directive];
  const nextDirectiveConstructor = isPrimitive(value)
    ? undefined
    : // This property needs to remain unminified.
      (value as DirectiveResult)[K._$litDirective$];
  if (currentDirective?.constructor !== nextDirectiveConstructor) {
    // This property needs to remain unminified.
    currentDirective?.[K._$notifyDirectiveConnectionChanged]?.(false);
    if (nextDirectiveConstructor === undefined) {
      currentDirective = undefined;
    } else {
      currentDirective = new nextDirectiveConstructor(part as PartInfo);
      currentDirective[K._$initialize](part, parent, attributeIndex);
    }
    if (attributeIndex !== undefined) {
      const dirs = (parent as AttributePart)[K.__directives] ?? [];
      if (dirs.length === 0) {
        (parent as AttributePart)[K.__directives] = dirs;
      }
      dirs[attributeIndex] = currentDirective;
    } else {
      (parent as ChildPart | Directive)[K.__directive] = currentDirective;
    }
  }
  if (currentDirective !== undefined) {
    value = resolveDirective(
      part,
      currentDirective[K._$resolve](part, (value as DirectiveResult)[K.values]),
      currentDirective,
      attributeIndex,
    );
  }
  return value;
}

export type { TemplateInstance };

/**
 * An updateable instance of a Template. Holds references to the Parts used to
 * update the template instance.
 */
class TemplateInstance implements Disconnectable {
  [K._$template]: Template;
  [K._$parts]: Array<Part | undefined> = [];

  /** @internal */
  [K._$parent]: ChildPart;
  /** @internal */
  [K._$disconnectableChildren]?: Set<Disconnectable> = undefined;

  constructor(template: Template, parent: ChildPart) {
    this[K._$template] = template;
    this[K._$parent] = parent;
  }

  // Called by ChildPart parentNode getter
  get [K.parentNode]() {
    return this[K._$parent][K.parentNode];
  }

  // See comment in Disconnectable interface for why this is a getter
  get [K._$isConnected]() {
    return this[K._$parent][K._$isConnected];
  }

  // This method is separate from the constructor because we need to return a
  // DocumentFragment and we don't want to hold onto it with an instance field.
  [K._clone](options: RenderOptions | undefined) {
    const {
      [K.el]: { content },
      [K.parts]: parts,
    } = this[K._$template];
    const fragment = (options?.[K.creationScope] ?? d).importNode(
      content,
      true,
    );
    walker.currentNode = fragment;

    let node = walker.nextNode()!;
    let nodeIndex = 0;
    let partIndex = 0;
    let templatePart = parts[0];

    while (templatePart !== undefined) {
      if (nodeIndex === templatePart[K.index]) {
        let part: Part | undefined;
        if (templatePart[K.type] === CHILD_PART) {
          part = new ChildPart(
            node as HTMLElement,
            node.nextSibling,
            this,
            options,
          );
        } else if (templatePart[K.type] === ATTRIBUTE_PART) {
          part = new templatePart[K.ctor](
            node as HTMLElement,
            templatePart[K.name],
            templatePart[K.strings],
            this,
            options,
          );
        } else if (templatePart[K.type] === ELEMENT_PART) {
          part = new ElementPart(node as HTMLElement, this, options);
        }
        this[K._$parts].push(part);
        templatePart = parts[++partIndex];
      }
      if (nodeIndex !== templatePart?.[K.index]) {
        node = walker.nextNode()!;
        nodeIndex++;
      }
    }
    // We need to set the currentNode away from the cloned tree so that we
    // don't hold onto the tree even if the tree is detached and should be
    // freed.
    walker.currentNode = d;
    return fragment;
  }

  [K._update](values: Array<unknown>) {
    let i = 0;
    for (const part of this[K._$parts]) {
      if (part !== undefined) {
        debugLogEvent?.({
          kind: 'set part',
          part,
          value: values[i],
          valueIndex: i,
          values,
          templateInstance: this,
        });
        if ((part as AttributePart)[K.strings] !== undefined) {
          (part as AttributePart)[K._$setValue](
            values,
            part as AttributePart,
            i,
          );
          // The number of values the part consumes is part.strings.length - 1
          // since values are in between template spans. We increment i by 1
          // later in the loop, so increment it by part.strings.length - 2 here
          i += (part as AttributePart)[K.strings]!.length - 2;
        } else {
          part[K._$setValue](values[i]);
        }
      }
      i++;
    }
  }
}

/*
 * Parts
 */
type AttributeTemplatePart = {
  readonly [K.type]: typeof ATTRIBUTE_PART;
  readonly [K.index]: number;
  readonly [K.name]: string;
  readonly [K.ctor]: typeof AttributePart;
  readonly [K.strings]: ReadonlyArray<string>;
};
type ChildTemplatePart = {
  readonly [K.type]: typeof CHILD_PART;
  readonly [K.index]: number;
};
type ElementTemplatePart = {
  readonly [K.type]: typeof ELEMENT_PART;
  readonly [K.index]: number;
};
type CommentTemplatePart = {
  readonly [K.type]: typeof COMMENT_PART;
  readonly [K.index]: number;
};

/**
 * A TemplatePart represents a dynamic part in a template, before the template
 * is instantiated. When a template is instantiated Parts are created from
 * TemplateParts.
 */
type TemplatePart =
  | ChildTemplatePart
  | AttributeTemplatePart
  | ElementTemplatePart
  | CommentTemplatePart;

export type Part =
  | ChildPart
  | AttributePart
  | PropertyPart
  | BooleanAttributePart
  | ElementPart
  | EventPart;

export type { ChildPart };

class ChildPart implements Disconnectable {
  readonly [K.type] = CHILD_PART;
  readonly [K.options]: RenderOptions | undefined;
  [K._$committedValue]: unknown = nothing;
  /** @internal */
  [K.__directive]?: Directive | undefined;
  /** @internal */
  [K._$startNode]: ChildNode;
  /** @internal */
  [K._$endNode]: ChildNode | null;
  private [K._textSanitizer]: ValueSanitizer | undefined;
  /** @internal */
  [K._$parent]: Disconnectable | undefined;
  /**
   * Connection state for RootParts only (i.e. ChildPart without _$parent
   * returned from top-level `render`). This field is unused otherwise. The
   * intention would be clearer if we made `RootPart` a subclass of `ChildPart`
   * with this field (and a different _$isConnected getter), but the subclass
   * caused a perf regression, possibly due to making call sites polymorphic.
   * @internal
   */
  [K.__isConnected]: boolean;

  // See comment in Disconnectable interface for why this is a getter
  get [K._$isConnected]() {
    // ChildParts that are not at the root should always be created with a
    // parent; only RootChildNode's won't, so they return the local isConnected
    // state
    return this[K._$parent]?.[K._$isConnected] ?? this[K.__isConnected];
  }

  // The following fields will be patched onto ChildParts when required by
  // AsyncDirective
  /** @internal */
  [K._$disconnectableChildren]?: Set<Disconnectable> = undefined;
  /** @internal */
  [K._$notifyConnectionChanged]?(
    isConnected: boolean,
    removeFromParent?: boolean,
    from?: number,
  ): void;
  /** @internal */
  [K._$reparentDisconnectables]?(parent: Disconnectable): void;

  constructor(
    startNode: ChildNode,
    endNode: ChildNode | null,
    parent: TemplateInstance | ChildPart | undefined,
    options: RenderOptions | undefined,
  ) {
    this[K._$startNode] = startNode;
    this[K._$endNode] = endNode;
    this[K._$parent] = parent;
    this[K.options] = options;
    // Note __isConnected is only ever accessed on RootParts (i.e. when there is
    // no _$parent); the value on a non-root-part is "don't care", but checking
    // for parent would be more code
    this[K.__isConnected] = options?.[K.isConnected] ?? true;
    if (ENABLE_EXTRA_SECURITY_HOOKS) {
      // Explicitly initialize for consistent class shape.
      this[K._textSanitizer] = undefined;
    }
  }

  /**
   * The parent node into which the part renders its content.
   *
   * A ChildPart's content consists of a range of adjacent child nodes of
   * `.parentNode`, possibly bordered by 'marker nodes' (`.startNode` and
   * `.endNode`).
   *
   * - If both `.startNode` and `.endNode` are non-null, then the part's content
   * consists of all siblings between `.startNode` and `.endNode`, exclusively.
   *
   * - If `.startNode` is non-null but `.endNode` is null, then the part's
   * content consists of all siblings following `.startNode`, up to and
   * including the last child of `.parentNode`. If `.endNode` is non-null, then
   * `.startNode` will always be non-null.
   *
   * - If both `.endNode` and `.startNode` are null, then the part's content
   * consists of all child nodes of `.parentNode`.
   */
  get [K.parentNode](): Node {
    let parentNode: Node = wrap(this[K._$startNode]).parentNode!;
    const parent = this[K._$parent];
    if (
      parent !== undefined &&
      parentNode?.nodeType === 11 /* Node.DOCUMENT_FRAGMENT */
    ) {
      // If the parentNode is a DocumentFragment, it may be because the DOM is
      // still in the cloned fragment during initial render; if so, get the real
      // parentNode the part will be committed into by asking the parent.
      parentNode = (parent as ChildPart | TemplateInstance)[K.parentNode];
    }
    return parentNode;
  }

  /**
   * The part's leading marker node, if any. See `.parentNode` for more
   * information.
   */
  get [K.startNode](): Node | null {
    return this[K._$startNode];
  }

  /**
   * The part's trailing marker node, if any. See `.parentNode` for more
   * information.
   */
  get [K.endNode](): Node | null {
    return this[K._$endNode];
  }

  [K._$setValue](
    value: unknown,
    directiveParent: DirectiveParent = this,
  ): void {
    if (DEV_MODE && this[K.parentNode] === null) {
      throw new Error(
        `This \`ChildPart\` has no \`parentNode\` and therefore cannot accept a value. This likely means the element containing the part was manipulated in an unsupported way outside of Lit's control such that the part's marker nodes were ejected from DOM. For example, setting the element's \`innerHTML\` or \`textContent\` can do this.`,
      );
    }
    value = resolveDirective(this, value, directiveParent);
    if (isPrimitive(value)) {
      // Non-rendering child values. It's important that these do not render
      // empty text nodes to avoid issues with preventing default <slot>
      // fallback content.
      if (value === nothing || value == null || value === '') {
        if (this[K._$committedValue] !== nothing) {
          debugLogEvent?.({
            kind: 'commit nothing to child',
            start: this[K._$startNode],
            end: this[K._$endNode],
            parent: this[K._$parent],
            options: this[K.options],
          });
          this[K._$clear]();
        }
        this[K._$committedValue] = nothing;
      } else if (value !== this[K._$committedValue] && value !== noChange) {
        this[K._commitText](value);
      }
      // This property needs to remain unminified.
    } else if ((value as TemplateResult)[K._$litType$] !== undefined) {
      this[K._commitTemplateResult](value as TemplateResult);
    } else if ((value as Node).nodeType !== undefined) {
      if (DEV_MODE && this[K.options]?.[K.host] === value) {
        this[K._commitText](
          `[probable mistake: rendered a template's host in itself ` +
            `(commonly caused by writing \${this} in a template]`,
        );
        console.warn(
          `Attempted to render the template host`,
          value,
          `inside itself. This is almost always a mistake, and in dev mode `,
          `we render some warning text. In production however, we'll `,
          `render it, which will usually result in an error, and sometimes `,
          `in the element disappearing from the DOM.`,
        );
        return;
      }
      this[K._commitNode](value as Node);
    } else if (isIterable(value)) {
      this[K._commitIterable](value);
    } else {
      // Fallback, will render the string representation
      this[K._commitText](value);
    }
  }

  private [K._insert]<T extends Node>(node: T) {
    return wrap(wrap(this[K._$startNode]).parentNode!).insertBefore(
      node,
      this[K._$endNode],
    );
  }

  private [K._commitNode](value: Node): void {
    if (this[K._$committedValue] !== value) {
      this[K._$clear]();
      if (
        ENABLE_EXTRA_SECURITY_HOOKS &&
        sanitizerFactoryInternal !== noopSanitizer
      ) {
        const parentNodeName = this[K._$startNode].parentNode?.nodeName;
        if (parentNodeName === 'STYLE' || parentNodeName === 'SCRIPT') {
          if (DEV_MODE) {
            let message = 'Forbidden';
            if (parentNodeName === 'STYLE') {
              message =
                `Lit does not support binding inside style nodes. ` +
                `This is a security risk, as style injection attacks can ` +
                `exfiltrate data and spoof UIs. ` +
                `Consider instead using css\`...\` literals ` +
                `to compose styles, and do dynamic styling with ` +
                `css custom properties, ::parts, <slot>s, ` +
                `and by mutating the DOM rather than stylesheets.`;
            } else {
              message =
                `Lit does not support binding inside script nodes. ` +
                `This is a security risk, as it could allow arbitrary ` +
                `code execution.`;
            }
            throw new Error(message);
          } else {
            throw new Error();
          }
        }
      }
      debugLogEvent?.({
        kind: 'commit node',
        start: this[K._$startNode],
        parent: this[K._$parent],
        value: value,
        options: this[K.options],
      });
      this[K._$committedValue] = this[K._insert](value);
    }
  }

  private [K._commitText](value: unknown): void {
    // If the committed value is a primitive it means we called _commitText on
    // the previous render, and we know that this._$startNode.nextSibling is a
    // Text node. We can now just replace the text content (.data) of the node.
    if (
      this[K._$committedValue] !== nothing &&
      isPrimitive(this[K._$committedValue])
    ) {
      const node = wrap(this[K._$startNode]).nextSibling as Text;
      if (ENABLE_EXTRA_SECURITY_HOOKS) {
        if (this[K._textSanitizer] === undefined) {
          this[K._textSanitizer] = createSanitizer(node, 'data', K.property);
        }
        value = this[K._textSanitizer](value);
      }
      debugLogEvent?.({
        kind: 'commit text',
        node,
        value,
        options: this[K.options],
      });
      (node as Text).data = value as string;
    } else {
      if (ENABLE_EXTRA_SECURITY_HOOKS) {
        const textNode = d.createTextNode('');
        this[K._commitNode](textNode);
        // When setting text content, for security purposes it matters a lot
        // what the parent is. For example, <style> and <script> need to be
        // handled with care, while <span> does not. So first we need to put a
        // text node into the document, then we can sanitize its content.
        if (this[K._textSanitizer] === undefined) {
          this[K._textSanitizer] = createSanitizer(
            textNode,
            'data',
            K.property,
          );
        }
        value = this[K._textSanitizer](value);
        debugLogEvent?.({
          kind: 'commit text',
          node: textNode,
          value,
          options: this[K.options],
        });
        textNode.data = value as string;
      } else {
        this[K._commitNode](d.createTextNode(value as string));
        debugLogEvent?.({
          kind: 'commit text',
          node: wrap(this[K._$startNode]).nextSibling as Text,
          value,
          options: this[K.options],
        });
      }
    }
    this[K._$committedValue] = value;
  }

  private [K._commitTemplateResult](
    result: TemplateResult | CompiledTemplateResult,
  ): void {
    // This property needs to remain unminified.
    const { [K.values]: values, [K._$litType$]: type } = result;
    // If $litType$ is a number, result is a plain TemplateResult and we get
    // the template from the template cache. If not, result is a
    // CompiledTemplateResult and _$litType$ is a CompiledTemplate and we need
    // to create the <template> element the first time we see it.
    let template: Template | CompiledTemplate;
    if (typeof type === 'number') {
      template = this[K._$getTemplate](result as UncompiledTemplateResult);
    } else {
      if (type[K.el] === undefined) {
        type[K.el] = Template[K.createElement](
          trustFromTemplateString(type[K.h], type[K.h][0]!),
          this[K.options],
        );
      }
      template = type;
    }

    if (
      (this[K._$committedValue] as TemplateInstance)?.[K._$template] ===
      template
    ) {
      debugLogEvent?.({
        kind: 'template updating',
        template,
        instance: this[K._$committedValue] as TemplateInstance,
        parts: (this[K._$committedValue] as TemplateInstance)[K._$parts],
        options: this[K.options],
        values,
      });
      (this[K._$committedValue] as TemplateInstance)[K._update](values);
    } else {
      const instance = new TemplateInstance(template as Template, this);
      const fragment = instance[K._clone](this[K.options]);
      debugLogEvent?.({
        kind: 'template instantiated',
        template,
        instance,
        parts: instance[K._$parts],
        options: this[K.options],
        fragment,
        values,
      });
      instance[K._update](values);
      debugLogEvent?.({
        kind: 'template instantiated and updated',
        template,
        instance,
        parts: instance[K._$parts],
        options: this[K.options],
        fragment,
        values,
      });
      this[K._commitNode](fragment);
      this[K._$committedValue] = instance;
    }
  }

  // Overridden via `litHtmlPolyfillSupport` to provide platform support.
  /** @internal */
  [K._$getTemplate](result: UncompiledTemplateResult) {
    let template = templateCache.get(result[K.strings]);
    if (template === undefined) {
      template = new Template(result);
      templateCache.set(result[K.strings], template);
    }
    return template;
  }

  private [K._commitIterable](value: Iterable<unknown>): void {
    // For an Iterable, we create a new InstancePart per item, then set its
    // value to the item. This is a little bit of overhead for every item in
    // an Iterable, but it lets us recurse easily and efficiently update Arrays
    // of TemplateResults that will be commonly returned from expressions like:
    // array.map((i) => html`${i}`), by reusing existing TemplateInstances.

    // If value is an array, then the previous render was of an
    // iterable and value will contain the ChildParts from the previous
    // render. If value is not an array, clear this part and make a new
    // array for ChildParts.
    if (!isArray(this[K._$committedValue])) {
      this[K._$committedValue] = [];
      this[K._$clear]();
    }

    // Lets us keep track of how many items we stamped so we can clear leftover
    // items from a previous render
    const itemParts = this[K._$committedValue] as ChildPart[];
    let partIndex = 0;
    let itemPart: ChildPart | undefined;

    for (const item of value) {
      if (partIndex === itemParts.length) {
        // If no existing part, create a new one
        // TODO (justinfagnani): test perf impact of always creating two parts
        // instead of sharing parts between nodes
        // https://github.com/lit/lit/issues/1266
        itemPart = new ChildPart(
          this[K._insert](createMarker()),
          this[K._insert](createMarker()),
          this,
          this[K.options],
        );
        itemParts.push(itemPart);
      } else {
        // Reuse an existing part
        itemPart = itemParts[partIndex]!;
      }
      itemPart[K._$setValue](item);
      partIndex++;
    }

    if (partIndex < itemParts.length) {
      // itemParts always have end nodes
      this[K._$clear](
        itemPart && wrap(itemPart[K._$endNode]!).nextSibling,
        partIndex,
      );
      // Truncate the parts array so _value reflects the current state
      itemParts.length = partIndex;
    }
  }

  /**
   * Removes the nodes contained within this Part from the DOM.
   *
   * @param start Start node to clear from, for clearing a subset of the part's
   *     DOM (used when truncating iterables)
   * @param from  When `start` is specified, the index within the iterable from
   *     which ChildParts are being removed, used for disconnecting directives
   *     in those Parts.
   *
   * @internal
   */
  [K._$clear](
    start: ChildNode | null = wrap(this[K._$startNode]).nextSibling,
    from?: number,
  ) {
    this[K._$notifyConnectionChanged]?.(false, true, from);
    while (start !== this[K._$endNode]) {
      // The non-null assertion is safe because if _$startNode.nextSibling is
      // null, then _$endNode is also null, and we would not have entered this
      // loop.
      const n = wrap(start!).nextSibling;
      wrap(start!).remove();
      start = n;
    }
  }

  /**
   * Implementation of RootPart's `isConnected`. Note that this method
   * should only be called on `RootPart`s (the `ChildPart` returned from a
   * top-level `render()` call). It has no effect on non-root ChildParts.
   * @param isConnected Whether to set
   * @internal
   */
  [K.setConnected](isConnected: boolean) {
    if (this[K._$parent] === undefined) {
      this[K.__isConnected] = isConnected;
      this[K._$notifyConnectionChanged]?.(isConnected);
    } else if (DEV_MODE) {
      throw new Error(
        'part.setConnected() may only be called on a ' +
          'RootPart returned from render().',
      );
    }
  }
}

/**
 * A top-level `ChildPart` returned from `render` that manages the connected
 * state of `AsyncDirective`s created throughout the tree below it.
 */
export interface RootPart extends ChildPart {
  /**
   * Sets the connection state for `AsyncDirective`s contained within this root
   * ChildPart.
   *
   * lit-html does not automatically monitor the connectedness of DOM rendered;
   * as such, it is the responsibility of the caller to `render` to ensure that
   * `part.setConnected(false)` is called before the part object is potentially
   * discarded, to ensure that `AsyncDirective`s have a chance to dispose of
   * any resources being held. If a `RootPart` that was previously
   * disconnected is subsequently re-connected (and its `AsyncDirective`s should
   * re-connect), `setConnected(true)` should be called.
   *
   * @param isConnected Whether directives within this tree should be connected
   * or not
   */
  [K.setConnected](isConnected: boolean): void;
}

export type { AttributePart };

class AttributePart implements Disconnectable {
  readonly [K.type]:
    | typeof ATTRIBUTE_PART
    | typeof PROPERTY_PART
    | typeof BOOLEAN_ATTRIBUTE_PART
    | typeof EVENT_PART = ATTRIBUTE_PART;
  readonly [K.element]: HTMLElement;
  readonly [K.name]: string;
  readonly [K.options]: RenderOptions | undefined;

  /**
   * If this attribute part represents an interpolation, this contains the
   * static strings of the interpolation. For single-value, complete bindings,
   * this is undefined.
   */
  readonly [K.strings]?: ReadonlyArray<string>;
  /** @internal */
  [K._$committedValue]: unknown | Array<unknown> = nothing;
  /** @internal */
  [K.__directives]?: Array<Directive | undefined> | undefined;
  /** @internal */
  [K._$parent]: Disconnectable;
  /** @internal */
  [K._$disconnectableChildren]?: Set<Disconnectable> = undefined;

  protected [K._sanitizer]: ValueSanitizer | undefined;

  get [K.tagName]() {
    return this[K.element].tagName;
  }

  // See comment in Disconnectable interface for why this is a getter
  get [K._$isConnected]() {
    return this[K._$parent][K._$isConnected];
  }

  constructor(
    element: HTMLElement,
    name: string,
    strings: ReadonlyArray<string>,
    parent: Disconnectable,
    options: RenderOptions | undefined,
  ) {
    this[K.element] = element;
    this[K.name] = name;
    this[K._$parent] = parent;
    this[K.options] = options;
    if (strings.length > 2 || strings[0] !== '' || strings[1] !== '') {
      this[K._$committedValue] = new Array(strings.length - 1).fill(
        new String(),
      );
      this[K.strings] = strings;
    } else {
      this[K._$committedValue] = nothing;
    }
    if (ENABLE_EXTRA_SECURITY_HOOKS) {
      this[K._sanitizer] = undefined;
    }
  }

  /**
   * Sets the value of this part by resolving the value from possibly multiple
   * values and static strings and committing it to the DOM.
   * If this part is single-valued, `this._strings` will be undefined, and the
   * method will be called with a single value argument. If this part is
   * multi-value, `this._strings` will be defined, and the method is called
   * with the value array of the part's owning TemplateInstance, and an offset
   * into the value array from which the values should be read.
   * This method is overloaded this way to eliminate short-lived array slices
   * of the template instance values, and allow a fast-path for single-valued
   * parts.
   *
   * @param value The part value, or an array of values for multi-valued parts
   * @param valueIndex the index to start reading values from. `undefined` for
   *   single-valued parts
   * @param noCommit causes the part to not commit its value to the DOM. Used
   *   in hydration to prime attribute parts with their first-rendered value,
   *   but not set the attribute, and in SSR to no-op the DOM operation and
   *   capture the value for serialization.
   *
   * @internal
   */
  [K._$setValue](
    value: unknown | Array<unknown>,
    directiveParent: DirectiveParent = this,
    valueIndex?: number,
    noCommit?: boolean,
  ) {
    const strings = this[K.strings];

    // Whether any of the values has changed, for dirty-checking
    let change = false;

    if (strings === undefined) {
      // Single-value binding case
      value = resolveDirective(this, value, directiveParent, 0);
      change =
        !isPrimitive(value) ||
        (value !== this[K._$committedValue] && value !== noChange);
      if (change) {
        this[K._$committedValue] = value;
      }
    } else {
      // Interpolation case
      const values = value as Array<unknown>;
      value = strings[0];

      let i: number;
      let v: unknown;
      for (i = 0; i < strings.length - 1; i++) {
        v = resolveDirective(this, values[valueIndex! + i], directiveParent, i);

        if (v === noChange) {
          // If the user-provided value is `noChange`, use the previous value
          v = (this[K._$committedValue] as Array<unknown>)[i];
        }
        change ||=
          !isPrimitive(v) ||
          v !== (this[K._$committedValue] as Array<unknown>)[i];
        if (v === nothing) {
          value = nothing;
        } else if (value !== nothing) {
          value += (v ?? '') + strings[i + 1]!;
        }
        // We always record each value, even if one is `nothing`, for future
        // change detection.
        (this[K._$committedValue] as Array<unknown>)[i] = v;
      }
    }
    if (change && !noCommit) {
      this[K._commitValue](value);
    }
  }

  /** @internal */
  [K._commitValue](value: unknown) {
    if (value === nothing) {
      (wrap(this[K.element]) as Element).removeAttribute(this[K.name]);
    } else {
      if (ENABLE_EXTRA_SECURITY_HOOKS) {
        if (this[K._sanitizer] === undefined) {
          this[K._sanitizer] = sanitizerFactoryInternal(
            this[K.element],
            this[K.name],
            K.attribute,
          );
        }
        value = this[K._sanitizer](value ?? '');
      }
      debugLogEvent?.({
        kind: 'commit attribute',
        element: this[K.element],
        name: this[K.name],
        value,
        options: this[K.options],
      });
      (wrap(this[K.element]) as Element).setAttribute(
        this[K.name],
        (value ?? '') as string,
      );
    }
  }
}

export type { PropertyPart };

class PropertyPart extends AttributePart {
  override readonly [K.type] = PROPERTY_PART;

  /** @internal */
  override [K._commitValue](value: unknown) {
    if (ENABLE_EXTRA_SECURITY_HOOKS) {
      if (this[K._sanitizer] === undefined) {
        this[K._sanitizer] = sanitizerFactoryInternal(
          this[K.element],
          this[K.name],
          K.property,
        );
      }
      value = this[K._sanitizer](value);
    }
    debugLogEvent?.({
      kind: 'commit property',
      element: this[K.element],
      name: this[K.name],
      value,
      options: this[K.options],
    });
    (this[K.element] as unknown as Record<string, unknown>)[this[K.name]] =
      value === nothing ? undefined : value;
  }
}

export type { BooleanAttributePart };

class BooleanAttributePart extends AttributePart {
  override readonly [K.type] = BOOLEAN_ATTRIBUTE_PART;

  /** @internal */
  override [K._commitValue](value: unknown) {
    debugLogEvent?.({
      kind: 'commit boolean attribute',
      element: this[K.element],
      name: this[K.name],
      value: !!(value && value !== nothing),
      options: this[K.options],
    });
    (wrap(this[K.element]) as Element).toggleAttribute(
      this[K.name],
      !!value && value !== nothing,
    );
  }
}

type EventListenerWithOptions = EventListenerOrEventListenerObject &
  Partial<AddEventListenerOptions>;

/**
 * An AttributePart that manages an event listener via add/removeEventListener.
 *
 * This part works by adding itself as the event listener on an element, then
 * delegating to the value passed to it. This reduces the number of calls to
 * add/removeEventListener if the listener changes frequently, such as when an
 * inline function is used as a listener.
 *
 * Because event options are passed when adding listeners, we must take case
 * to add and remove the part as a listener when the event options change.
 */
export type { EventPart };

class EventPart extends AttributePart {
  override readonly [K.type] = EVENT_PART;

  constructor(
    element: HTMLElement,
    name: string,
    strings: ReadonlyArray<string>,
    parent: Disconnectable,
    options: RenderOptions | undefined,
  ) {
    super(element, name, strings, parent, options);

    if (DEV_MODE && this[K.strings] !== undefined) {
      throw new Error(
        `A \`<${element.localName}>\` has a \`@${name}=...\` listener with ` +
          'invalid content. Event listeners in templates must have exactly ' +
          'one expression and no surrounding text.',
      );
    }
  }

  // EventPart does not use the base _$setValue/_resolveValue implementation
  // since the dirty checking is more complex
  /** @internal */
  override [K._$setValue](
    newListener: unknown,
    directiveParent: DirectiveParent = this,
  ) {
    newListener =
      resolveDirective(this, newListener, directiveParent, 0) ?? nothing;
    if (newListener === noChange) {
      return;
    }
    const oldListener = this[K._$committedValue];

    // If the new value is nothing or any options change we have to remove the
    // part as a listener.
    const shouldRemoveListener =
      (newListener === nothing && oldListener !== nothing) ||
      (newListener as EventListenerWithOptions).capture !==
        (oldListener as EventListenerWithOptions).capture ||
      (newListener as EventListenerWithOptions).once !==
        (oldListener as EventListenerWithOptions).once ||
      (newListener as EventListenerWithOptions).passive !==
        (oldListener as EventListenerWithOptions).passive;

    // If the new value is not nothing and we removed the listener, we have
    // to add the part as a listener.
    const shouldAddListener =
      newListener !== nothing &&
      (oldListener === nothing || shouldRemoveListener);

    debugLogEvent?.({
      kind: 'commit event listener',
      element: this[K.element],
      name: this[K.name],
      value: newListener,
      options: this[K.options],
      removeListener: shouldRemoveListener,
      addListener: shouldAddListener,
      oldListener,
    });
    if (shouldRemoveListener) {
      this[K.element].removeEventListener(
        this[K.name],
        this,
        oldListener as EventListenerWithOptions,
      );
    }
    if (shouldAddListener) {
      this[K.element].addEventListener(
        this[K.name],
        this,
        newListener as EventListenerWithOptions,
      );
    }
    this[K._$committedValue] = newListener;
  }

  handleEvent(event: Event) {
    if (typeof this[K._$committedValue] === 'function') {
      this[K._$committedValue].call(
        this[K.options]?.[K.host] ?? this[K.element],
        event,
      );
    } else {
      (this[K._$committedValue] as EventListenerObject).handleEvent(event);
    }
  }
}

export type { ElementPart };

class ElementPart implements Disconnectable {
  readonly [K.type] = ELEMENT_PART;

  /** @internal */
  [K.__directive]?: Directive | undefined;

  // This is to ensure that every Part has a _$committedValue
  [K._$committedValue]: undefined;

  /** @internal */
  [K._$parent]!: Disconnectable;

  /** @internal */
  [K._$disconnectableChildren]?: Set<Disconnectable> = undefined;

  [K.options]: RenderOptions | undefined;

  [K.element]!: Element;

  constructor(
    element: Element,
    parent: Disconnectable,
    options: RenderOptions | undefined,
  ) {
    this[K.element] = element;
    this[K._$parent] = parent;
    this[K.options] = options;
  }

  // See comment in Disconnectable interface for why this is a getter
  get [K._$isConnected]() {
    return this[K._$parent][K._$isConnected];
  }

  [K._$setValue](value: unknown): void {
    debugLogEvent?.({
      kind: 'commit to element binding',
      element: this[K.element],
      value,
      options: this[K.options],
    });
    resolveDirective(this, value);
  }
}

/**
 * END USERS SHOULD NOT RELY ON THIS OBJECT.
 *
 * Private exports for use by other Lit packages, not intended for use by
 * external users.
 *
 * We currently do not make a mangled rollup build of the lit-ssr code. In order
 * to keep a number of (otherwise private) top-level exports mangled in the
 * client side code, we export a _$LH object containing those members (or
 * helper methods for accessing private fields of those members), and then
 * re-export them for use in lit-ssr. This keeps lit-ssr agnostic to whether the
 * client-side code is being used in `dev` mode or `prod` mode.
 *
 * This has a unique name, to disambiguate it from private exports in
 * lit-element, which re-exports all of lit-html.
 *
 * @private
 */
// Explicit type prevents tsc from evaluating computed keys to literals.
export const _$LH: {
  [K._boundAttributeSuffix]: typeof boundAttributeSuffix;
  [K._marker]: typeof marker;
  [K._markerMatch]: typeof markerMatch;
  [K._HTML_RESULT]: typeof HTML_RESULT;
  [K._getTemplateHtml]: typeof getTemplateHtml;
  [K._TemplateInstance]: typeof TemplateInstance;
  [K._isIterable]: typeof isIterable;
  [K._resolveDirective]: typeof resolveDirective;
  [K._ChildPart]: typeof ChildPart;
  [K._AttributePart]: typeof AttributePart;
  [K._BooleanAttributePart]: typeof BooleanAttributePart;
  [K._EventPart]: typeof EventPart;
  [K._PropertyPart]: typeof PropertyPart;
  [K._ElementPart]: typeof ElementPart;
} = {
  // Used in lit-ssr
  [K._boundAttributeSuffix]: boundAttributeSuffix,
  [K._marker]: marker,
  [K._markerMatch]: markerMatch,
  [K._HTML_RESULT]: HTML_RESULT,
  [K._getTemplateHtml]: getTemplateHtml,
  // Used in tests and private-ssr-support
  [K._TemplateInstance]: TemplateInstance,
  [K._isIterable]: isIterable,
  [K._resolveDirective]: resolveDirective,
  [K._ChildPart]: ChildPart,
  [K._AttributePart]: AttributePart,
  [K._BooleanAttributePart]: BooleanAttributePart,
  [K._EventPart]: EventPart,
  [K._PropertyPart]: PropertyPart,
  [K._ElementPart]: ElementPart,
};

// Apply polyfills if available
// const polyfillSupport = DEV_MODE
//   ? global[K.litHtmlPolyfillSupportDevMode]
//   : global[K.litHtmlPolyfillSupport];
// polyfillSupport?.(Template, ChildPart);

// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for lit-html usage.
if (DEV_MODE) {
  global[K.litHtmlVersions] ??= [];
  global[K.litHtmlVersions].push('');
  if (global[K.litHtmlVersions].length > 1) {
    queueMicrotask(() => {
      issueWarning!(
        'multiple-versions',
        `Multiple versions of Lit loaded. ` +
          `Loading multiple versions is not recommended.`,
      );
    });
  }
}

/**
 * Renders a value, usually a lit-html TemplateResult, to the container.
 *
 * This example renders the text "Hello, Zoe!" inside a paragraph tag, appending
 * it to the container `document.body`.
 *
 * ```js
 * import {html, render} from 'lit';
 *
 * const name = "Zoe";
 * render(html`<p>Hello, ${name}!</p>`, document.body);
 * ```
 *
 * @param value Any [renderable
 *   value](https://lit.dev/docs/templates/expressions/#child-expressions),
 *   typically a {@linkcode TemplateResult} created by evaluating a template tag
 *   like {@linkcode html} or {@linkcode svg}.
 * @param container A DOM container to render to. The first render will append
 *   the rendered value to the container, and subsequent renders will
 *   efficiently update the rendered value if the same result type was
 *   previously rendered there.
 * @param options See {@linkcode RenderOptions} for options documentation.
 * @see
 * {@link https://lit.dev/docs/libraries/standalone-templates/#rendering-lit-html-templates| Rendering Lit HTML Templates}
 */
export const render = ((
  value: unknown,
  container: RenderRootNode,
  options?: RenderOptions,
): RootPart => {
  if (DEV_MODE && container == null) {
    // Give a clearer error message than
    //     Uncaught TypeError: Cannot read properties of null (reading
    //     '_$litPart$')
    // which reads like an internal Lit error.
    throw new TypeError(`The container to render into may not be ${container}`);
  }
  const renderId = DEV_MODE ? debugLogRenderId++ : 0;
  const partOwnerNode = options?.[K.renderBefore] ?? container;
  // This property needs to remain unminified.
  let part: ChildPart | undefined = (
    partOwnerNode as { [K._$litPart$]?: ChildPart }
  )[K._$litPart$];
  debugLogEvent?.({
    kind: 'begin render',
    id: renderId,
    value,
    container,
    options,
    part,
  });
  if (part === undefined) {
    const endNode = options?.[K.renderBefore] ?? null;
    part = new ChildPart(
      container.insertBefore(createMarker(), endNode),
      endNode,
      undefined,
      options ?? {},
    );
    // This property needs to remain unminified.
    (partOwnerNode as { [K._$litPart$]?: ChildPart })[K._$litPart$] = part;
  }
  part[K._$setValue](value);
  debugLogEvent?.({
    kind: 'end render',
    id: renderId,
    value,
    container,
    options,
    part,
  });
  return part as RootPart;
}) as {
  (
    value: unknown,
    container: RenderRootNode,
    options?: RenderOptions,
  ): RootPart;
  [K.setSanitizer]?: typeof setSanitizer;
  [K.createSanitizer]?: typeof createSanitizer;
  [K._testOnlyClearSanitizerFactoryDoNotCallOrElse]?: typeof _testOnlyClearSanitizerFactoryDoNotCallOrElse;
};

if (ENABLE_EXTRA_SECURITY_HOOKS) {
  render[K.setSanitizer] = setSanitizer;
  render[K.createSanitizer] = createSanitizer;
  if (DEV_MODE) {
    render[K._testOnlyClearSanitizerFactoryDoNotCallOrElse] =
      _testOnlyClearSanitizerFactoryDoNotCallOrElse;
  }
}
