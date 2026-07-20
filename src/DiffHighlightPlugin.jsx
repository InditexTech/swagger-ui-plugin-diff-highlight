// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import React from "react";

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
    Model: (Original) => (props) => {
      const status = readStatus(props.schema);

      if (status === "deleted") {
        return (
          <span className="diff-deleted">
            <Original {...props} />
          </span>
        );
      }

      if (status === "added") {
        return (
          <span className="diff-added">
            <Original {...props} />
          </span>
        );
      }

      if (status === "updated") {
        const original = props.schema.get("x-diff-original");
        const updated = props.schema.get("x-diff-new");
        return (
          <span className="diff-updated-inline">
            <span className="diff-updated-old">{describeSchema(original)}</span>
            <span className="diff-updated-arrow"> → </span>
            <span className="diff-updated-new">{describeSchema(updated)}</span>
          </span>
        );
      }

      return <Original {...props} />;
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
