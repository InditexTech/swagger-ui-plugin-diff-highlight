// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import React, { useEffect } from "react";

const CHANGE_META = {
  added: { label: "Added", className: "added" },
  removed: { label: "Removed", className: "removed" },
  changed: { label: "Changed", className: "changed" },
};

function countByChange(groups) {
  const totals = { added: 0, removed: 0, changed: 0 };
  groups.forEach((group) => {
    group.entries.forEach((entry) => {
      if (totals[entry.change] !== undefined) {
        totals[entry.change] += 1;
      }
    });
  });
  return totals;
}

export default function ReportModal({ report, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const totals = countByChange(report.groups);

  return (
    <div
      className="diff-modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-label="API Changes Report"
      onClick={onClose}
    >
      <div className="diff-modal" onClick={(event) => event.stopPropagation()}>
        <div className="diff-modal__header">
          <div>
            <h2 className="diff-modal__title">API Changes Report</h2>
            <p className="diff-modal__subtitle">
              {report.api}
              <span className="diff-modal__version">{report.from}</span>
              <span className="diff-modal__version-arrow">→</span>
              <span className="diff-modal__version diff-modal__version--new">
                {report.to}
              </span>
            </p>
          </div>
          <button
            type="button"
            className="diff-modal__close"
            onClick={onClose}
            aria-label="Close report"
          >
            ×
          </button>
        </div>

        <div className="diff-modal__summary">
          <span className="diff-stat diff-stat--added">
            <strong>{totals.added}</strong> added
          </span>
          <span className="diff-stat diff-stat--removed">
            <strong>{totals.removed}</strong> removed
          </span>
          <span className="diff-stat diff-stat--changed">
            <strong>{totals.changed}</strong> changed
          </span>
        </div>

        <div className="diff-modal__body">
          {report.groups.map((group) => (
            <section className="diff-report__group" key={group.title}>
              <h3 className="diff-report__group-title">{group.title}</h3>
              <ul className="diff-report__list">
                {group.entries.map((entry, index) => {
                  const meta = CHANGE_META[entry.change] || CHANGE_META.changed;
                  return (
                    <li className="diff-report__row" key={`${entry.label}-${index}`}>
                      <span className={`diff-badge diff-badge--${meta.className}`}>
                        {meta.label}
                      </span>
                      <span className="diff-report__label">{entry.label}</span>
                      {entry.detail && (
                        <span className="diff-report__detail">{entry.detail}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
