// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import React, { useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

import DiffHighlightPlugin from "@inditextech/swagger-ui-plugin-diff-highlight";
import "@inditextech/swagger-ui-plugin-diff-highlight/styles.css";

import Toolbar from "./components/Toolbar";
import ReportModal from "./components/ReportModal";
import diffSpec from "./specs/diffSpec.json";
import latestSpec from "./specs/latestSpec.json";
import changesReport from "./specs/diffReport";
import "./demo.css";

export default function App() {
  const [showInlineDiff, setShowInlineDiff] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  // When inline changes are disabled we render the clean "latest" (version B)
  // spec without the highlighting plugin. The `key` forces Swagger UI to fully
  // re-initialize when the active spec/plugin set changes.
  const spec = showInlineDiff ? diffSpec : latestSpec;
  const plugins = showInlineDiff ? [DiffHighlightPlugin] : [];

  return (
    <div className="app">
      <Toolbar
        showInlineDiff={showInlineDiff}
        onToggleInlineDiff={() => setShowInlineDiff((value) => !value)}
        onOpenReport={() => setReportOpen(true)}
      />

      <SwaggerUI
        key={showInlineDiff ? "diff" : "latest"}
        spec={spec}
        plugins={plugins}
        docExpansion="list"
        defaultModelsExpandDepth={2}
      />

      {reportOpen && (
        <ReportModal report={changesReport} onClose={() => setReportOpen(false)} />
      )}
    </div>
  );
}
