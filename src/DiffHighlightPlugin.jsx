// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import React, { createContext, useContext } from "react";

const EnumDiffContext = createContext(null);

const enumValueKey = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]])
        )
      : item
  );

/**
 * Wraps a swagger-ui component's output without breaking table layout.
 *
 * Several swagger-ui components (ParameterRow, OperationSummary, Response)
 * render a `<tr>` or a block that must remain a direct child of its table
 * parent. A wrapper element with `display: contents` keeps the original DOM
 * flow intact while still allowing us to attach a diff class that CSS targets
 * via descendant selectors.
 *
 * @param {string} status - The diff status used to build the wrapper's class.
 * @param {React.ReactNode} children - The original component output to wrap.
 * @returns {React.ReactElement} The wrapped children with a diff class applied.
 */
export const wrapContents = (status, children) => (
  <div className={`diff-wrap diff-${status}`} style={{ display: "contents" }}>
    {children}
  </div>
);

/**
 * Reads the `x-diff-status` extension from a swagger-ui spec object.
 *
 * The spec object is an Immutable Map, so the value is retrieved via its `get`
 * method. Any input that is not a Map is treated as having no status.
 *
 * @param {object} immutableMap - The swagger-ui spec object (Immutable Map).
 * @returns {string|undefined} The `x-diff-status` value, or `undefined` if the
 * object is not a Map or the extension is not present.
 */
export const readStatus = (immutableMap) =>
  immutableMap && typeof immutableMap.get === "function"
    ? immutableMap.get("x-diff-status")
    : undefined;

const CHANGED_STATUSES = new Set(["added", "deleted", "updated"]);

const isMapLike = (value) => value != null && typeof value.get === "function";

const valuesOf = (collection) =>
  collection && typeof collection.valueSeq === "function"
    ? collection.valueSeq().toArray()
    : [];

const childSchemas = (schema) => [
  ...valuesOf(schema.get("properties")),
  schema.get("items"),
  schema.get("additionalProperties"),
  ...valuesOf(schema.get("allOf")),
  ...valuesOf(schema.get("anyOf")),
  ...valuesOf(schema.get("oneOf")),
  schema.get("not"),
];

/**
 * Reports whether a schema accordion would hide a change: the schema itself is
 * updated, or a nested schema (through properties, items, additionalProperties,
 * allOf / anyOf / oneOf / not, following `$ref`s) is added, deleted or updated.
 *
 * `x-diff-original` / `x-diff-new` are never visited, so the snapshots of an
 * updated schema cannot mark an ancestor on their own.
 *
 * @param {object} schema - The schema (Immutable Map), raw or resolved.
 * @param {(ref: string) => object|undefined} [resolveRef] - Resolves a `$ref`
 * string to its target schema.
 * @returns {boolean} `true` when the schema contains a change.
 */
export const containsChange = (schema, resolveRef = () => undefined) => {
  const seenRefs = new Set();

  const deref = (node) => {
    const ref = isMapLike(node) ? node.get("$ref") : undefined;
    if (typeof ref !== "string") {
      return node;
    }
    if (seenRefs.has(ref)) {
      return undefined;
    }
    seenRefs.add(ref);
    return resolveRef(ref);
  };

  const hasChangedDescendant = (node) =>
    childSchemas(node).some((child) => {
      const target = deref(child);
      if (!isMapLike(target)) {
        return false;
      }
      return (
        CHANGED_STATUSES.has(readStatus(target)) || hasChangedDescendant(target)
      );
    });

  const root = deref(schema);
  if (!isMapLike(root)) {
    return false;
  }
  return readStatus(root) === "updated" || hasChangedDescendant(root);
};

/**
 * Builds a resolver for local `$ref`s ("#/components/schemas/User") against
 * the loaded spec.
 *
 * @param {object} specJson - The raw spec (Immutable Map).
 * @returns {(ref: string) => object|undefined} The ref resolver.
 */
const localRefResolver = (specJson) => (ref) =>
  ref.startsWith("#/") && isMapLike(specJson)
    ? specJson.getIn(
        ref
          .slice(2)
          .split("/")
          .map((token) => token.replace(/~1/g, "/").replace(/~0/g, "~"))
      )
    : undefined;

const specJsonOf = (system) => system?.specSelectors?.specJson?.();

/**
 * Whether the nearest enclosing `Model` contains a change. `undefined` means
 * the consumer is not rendered inside a `Model`.
 */
const ContainsChangeContext = createContext(undefined);

/**
 * Describes a schema as a compact human-readable type string.
 *
 * Renders a compact "old → new" representation for an updated schema, reading
 * the `x-diff-original` / `x-diff-new` sub-schemas embedded in the spec.
 *
 * @param {object} schema - The schema object (Immutable Map) to describe.
 * @returns {string} A human-readable type string, e.g. `string($date-time)`.
 */
export const describeSchema = (schema) => {
  if (!schema || typeof schema.get !== "function") {
    return "any";
  }
  const type = schema.get("type");
  const format = schema.get("format");
  if (!type) {
    return "object";
  }
  return format ? `${type}($${format})` : type;
};

/**
 * Plugin that highlights API changes inline based on `x-diff-*` extensions
 * present in the loaded "diff" OpenAPI document.
 *
 *  - deleted -> red + strikethrough
 *  - added   -> green + bold
 *  - updated -> original (red strikethrough) followed by new (green bold)
 *
 * @returns {object} A swagger-ui plugin object exposing `wrapComponents`.
 */
const DiffHighlightPlugin = () => ({
  wrapComponents: {
    /**
     * Schema properties: each property value is rendered as a nested `<Model>`.
     */
    Model: (Original, system) =>
      function DiffModel(props) {
        const status = readStatus(props.schema);
        const original = props.schema?.get("x-diff-original");
        const updated = props.schema?.get("x-diff-new");
        const originalEnum = original?.get("enum");
        const updatedEnum = updated?.get("enum");
        const enumChanged =
          status === "updated" && (originalEnum || updatedEnum);

        if (status === "updated" && !enumChanged) {
          const originalType = describeSchema(original);
          const updatedType = describeSchema(updated);
          return (
            <EnumDiffContext.Provider value={null}>
              <span className="diff-updated-inline">
                {originalType === updatedType ? (
                  updatedType
                ) : (
                  <>
                    <span className="diff-updated-old">{originalType}</span>
                    <span className="diff-updated-arrow"> → </span>
                    <span className="diff-updated-new">{updatedType}</span>
                  </>
                )}
              </span>
            </EnumDiffContext.Provider>
          );
        }

        const marked = containsChange(
          props.schema,
          localRefResolver(specJsonOf(system))
        );

        if (enumChanged) {
          const type = props.schema.get("type") || "object";
          const supplemental = type === "object" || type === "array";
          const schema = supplemental
            ? props.schema
                .remove("enum")
                .remove("x-diff-status")
                .remove("x-diff-original")
                .remove("x-diff-new")
            : props.schema.set("enum", updatedEnum || originalEnum);
          return (
            <ContainsChangeContext.Provider value={marked}>
              <EnumDiffContext.Provider
                value={{
                  original,
                  updated,
                  supplemental,
                  getComponent: props.getComponent,
                }}
              >
                <Original {...props} schema={schema} />
              </EnumDiffContext.Provider>
            </ContainsChangeContext.Provider>
          );
        }

        const model = (
          <ContainsChangeContext.Provider value={marked}>
            <EnumDiffContext.Provider value={null}>
              <Original {...props} />
            </EnumDiffContext.Provider>
          </ContainsChangeContext.Provider>
        );

        if (status === "deleted" || status === "added") {
          return <span className={`diff-${status}`}>{model}</span>;
        }
        return model;
      },

    /**
     * Schema accordions: tag every segment whose subtree hides a change so its
     * header can be marked while collapsed. Inside a `Model` the nearest
     * Model's answer applies; the Schemas section's root accordions render
     * outside any Model and before their subtree is resolved, so they read
     * the raw spec at their `specPath`.
     *
     * An object or array whose enum changed also gets the enum diff appended
     * to its accordion body.
     */
    ModelCollapse: (Original, system) =>
      function DiffModelCollapse(props) {
        const fromModel = useContext(ContainsChangeContext);
        const diff = useContext(EnumDiffContext);
        const specJson = specJsonOf(system);
        const marked =
          fromModel ??
          (props.specPath?.size > 0 &&
            isMapLike(specJson) &&
            containsChange(
              specJson.getIn(props.specPath),
              localRefResolver(specJson)
            ));
        const classes = marked
          ? [props.classes, "diff-ancestor"].filter(Boolean).join(" ")
          : props.classes;

        if (!diff?.supplemental) {
          return <Original {...props} classes={classes} />;
        }
        const EnumModel = diff.getComponent("EnumModel");
        return (
          <EnumDiffContext.Provider value={null}>
            <Original {...props} classes={classes}>
              {props.children}
              <EnumDiffContext.Provider
                value={{ ...diff, supplemental: false }}
              >
                <EnumModel getComponent={diff.getComponent} />
              </EnumDiffContext.Provider>
            </Original>
          </EnumDiffContext.Provider>
        );
      },

    EnumModel: (Original) =>
      function EnumModel(props) {
        const diff = useContext(EnumDiffContext);
        if (!diff) return <Original {...props} />;

        const originalEnum = diff.original?.get("enum")?.toJS();
        const updatedEnum = diff.updated?.get("enum")?.toJS();
        const originalKeys = new Set(originalEnum?.map(enumValueKey));
        const updatedKeys = new Set(updatedEnum?.map(enumValueKey));
        const values = (originalEnum || []).concat(
          updatedEnum?.filter(
            (value) => !originalKeys.has(enumValueKey(value))
          ) || []
        );
        const originalType = describeSchema(diff.original);
        const updatedType = describeSchema(diff.updated);
        const ModelCollapse = props.getComponent("ModelCollapse");
        return (
          <span className="prop-enum">
            <br />
            {originalType !== updatedType && (
              <div className="diff-type-change">
                Type:{" "}
                <span className="diff-updated-inline">
                  <span className="diff-updated-old">{originalType}</span>
                  <span className="diff-updated-arrow"> → </span>
                  <span className="diff-updated-new">{updatedType}</span>
                </span>
              </div>
            )}
            Enum:
            <br />
            <ModelCollapse
              collapsedContent={<span>Array [ {values.length} ]</span>}
            >
              {!originalEnum && (
                <>
                  <span className="diff-deleted">unrestricted</span>{" "}
                </>
              )}
              {"[ "}
              {values.map((value, index) => (
                <React.Fragment key={index}>
                  {index > 0 && ", "}
                  <span
                    className={
                      !originalKeys.has(enumValueKey(value))
                        ? "diff-added"
                        : !updatedKeys.has(enumValueKey(value))
                          ? "diff-deleted"
                          : undefined
                    }
                  >
                    {typeof value === "string" ? value : JSON.stringify(value)}
                  </span>
                </React.Fragment>
              ))}
              {" ]"}
              {!updatedEnum && (
                <>
                  {" "}
                  <span className="diff-added">unrestricted</span>
                </>
              )}
            </ModelCollapse>
          </span>
        );
      },

    /**
     * Parameters: one `<tr>` per parameter; status lives on the param object.
     * Registered name is camelCase "parameterRow".
     */
    parameterRow: (Original) => (props) => {
      const status = readStatus(props.param || props.rawParam);
      if (status && status !== "unchanged") {
        return wrapContents(status, <Original {...props} />);
      }
      return <Original {...props} />;
    },

    /**
     * Operations: the status must be read from the *unresolved* spec.
     *
     * swagger-ui resolves an operation's subtree lazily, only once it is
     * expanded. Until then `operationProps.get("op")` is an empty Map, so a
     * wrapper on `OperationSummary` would only see the diff status while the
     * operation is open. Wrapping `operation` instead gives us `specSelectors`
     * + `specPath`, letting us read `x-diff-status` straight from the loaded
     * document — available whether the operation is collapsed or expanded.
     *
     * The wrapper tags the whole opblock; CSS scopes the highlight to the
     * always-visible `.opblock-summary` so the mark shows in both states.
     */
    operation: (Original) => (props) => {
      const { specSelectors, specPath } = props;
      let status;
      if (
        specSelectors &&
        typeof specSelectors.specJson === "function" &&
        specPath &&
        typeof specPath.toJS === "function"
      ) {
        const op = specSelectors.specJson().getIn(specPath.toJS());
        status = readStatus(op);
      }
      if (status && status !== "unchanged") {
        return (
          <div
            className={`diff-op diff-op-${status}`}
            style={{ display: "contents" }}
          >
            <Original {...props} />
          </div>
        );
      }
      return <Original {...props} />;
    },

    /**
     * Responses: one `<tr>` per status code; status lives on the response object.
     * Registered name is lowercase "response".
     */
    response: (Original) => (props) => {
      const status = readStatus(props.response);
      if (status && status !== "unchanged") {
        return wrapContents(status, <Original {...props} />);
      }
      return <Original {...props} />;
    },
  },
});

export default DiffHighlightPlugin;
