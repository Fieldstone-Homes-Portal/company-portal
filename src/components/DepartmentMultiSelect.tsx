"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

interface Props {
  allDepartments: Department[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyLabel?: string;
  placeholder?: string;
}

/**
 * Compact multi-select for department membership. Renders selected
 * departments as pills below the dropdown. An empty selection is
 * meaningful in context: for apps it means "no department restriction",
 * for users it means "not in any department".
 */
export default function DepartmentMultiSelect({
  allDepartments,
  selectedIds,
  onChange,
  emptyLabel = "No departments selected",
  placeholder = "Select departments…",
}: Props) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selectedIds);

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  const selectedDepts = allDepartments.filter((d) => selectedSet.has(d.id));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-left text-sm text-fs-espresso transition-colors hover:border-fs-copper focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
      >
        <span className={selectedDepts.length === 0 ? "text-fs-copper-light" : ""}>
          {selectedDepts.length === 0
            ? placeholder
            : `${selectedDepts.length} department${selectedDepts.length === 1 ? "" : "s"} selected`}
        </span>
        <ChevronDown
          size={16}
          className={`text-fs-copper transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-fs-warm-gray bg-white shadow-lg">
          {allDepartments.length === 0 ? (
            <p className="px-4 py-3 text-sm text-fs-copper-light">
              No departments configured yet. Add some at{" "}
              <span className="font-mono">/admin/departments</span>.
            </p>
          ) : (
            allDepartments.map((d) => {
              const checked = selectedSet.has(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggle(d.id)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-fs-espresso transition-colors hover:bg-fs-warm-white"
                >
                  <span>{d.name}</span>
                  {checked && <Check size={14} className="text-fs-copper" />}
                </button>
              );
            })
          )}
        </div>
      )}

      {selectedDepts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedDepts.map((d) => (
            <span
              key={d.id}
              className="inline-flex items-center gap-1 rounded-full bg-fs-warm-white px-3 py-1 text-xs font-medium text-fs-espresso ring-1 ring-fs-warm-gray"
            >
              {d.name}
              <button
                type="button"
                onClick={() => toggle(d.id)}
                className="text-fs-copper hover:text-fs-espresso"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {selectedDepts.length === 0 && (
        <p className="mt-1.5 text-xs italic text-fs-copper-light">{emptyLabel}</p>
      )}
    </div>
  );
}
