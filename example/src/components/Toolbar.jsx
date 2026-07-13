// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import React from "react";

export default function Toolbar({
  showInlineDiff,
  onToggleInlineDiff,
  onOpenReport,
}) {
  return (
    <div className="diff-toolbar">
      <span className="diff-toolbar__title">API Diff Viewer</span>

      <div className="diff-toolbar__legend">
        <span className="diff-legend diff-added">added</span>
        <span className="diff-legend diff-deleted">deleted</span>
        <span className="diff-legend">
          <span className="diff-updated-old">old</span>
          <span className="diff-updated-arrow"> → </span>
          <span className="diff-updated-new">new</span>
        </span>
      </div>

      <div className="diff-toolbar__actions">
        <button type="button" className="diff-btn" onClick={onOpenReport}>
          Show Changes Report
        </button>
        <button
          type="button"
          className="diff-btn diff-btn--toggle"
          onClick={onToggleInlineDiff}
          aria-pressed={showInlineDiff}
        >
          {showInlineDiff ? "Disable Inline Changes" : "Enable Inline Changes"}
        </button>
      </div>
    </div>
  );
}
