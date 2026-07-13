// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import type { ComponentType } from "react";

/**
 * The partial Swagger UI "system" returned by the plugin: a map of component
 * names to wrappers applied through Swagger UI's `wrapComponents` API.
 */
export interface DiffHighlightSystem {
  wrapComponents: Record<
    string,
    (Original: ComponentType<any>, system: unknown) => ComponentType<any>
  >;
}

/**
 * A swagger-ui-react / Swagger UI plugin that highlights API changes inline,
 * based on `x-diff-*` extensions present in the loaded OpenAPI document
 * (`added`, `deleted`, `updated`).
 *
 * @example
 * import SwaggerUI from "swagger-ui-react";
 * import "swagger-ui-react/swagger-ui.css";
 * import DiffHighlightPlugin from "@inditextech/swagger-ui-plugin-diff-highlight";
 * import "@inditextech/swagger-ui-plugin-diff-highlight/styles.css";
 *
 * <SwaggerUI spec={spec} plugins={[DiffHighlightPlugin]} />;
 */
declare const DiffHighlightPlugin: () => DiffHighlightSystem;

export default DiffHighlightPlugin;
export { DiffHighlightPlugin };
