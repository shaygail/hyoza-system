"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export interface SearchSelectOption {
  id: string;
  label: string;
  hint?: string;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Search...",
  emptyLabel = "Unassigned",
  disabled = false,
}: SearchSelectProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.id === value) ?? null;

  useEffect(() => {
    if (selected) setQuery(selected.label);
    else if (!open) setQuery("");
  }, [selected, open]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = options.filter((option) => {
    const haystack = `${option.label} ${option.hint ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  function selectOption(id: string | null, label: string) {
    onChange(id);
    setQuery(id ? label : "");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value.trim()) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="text-sm"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
      />
      {open && !disabled && (
        <ul
          id={listId}
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <li>
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectOption(null, "")}
            >
              {emptyLabel}
            </button>
          </li>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">No matches</li>
          ) : (
            filtered.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    option.id === value ? "bg-ourcloud-50 text-ourcloud-700" : "text-slate-900"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOption(option.id, option.label)}
                >
                  <span className="font-medium">{option.label}</span>
                  {option.hint && (
                    <span className="mt-0.5 block text-xs text-slate-400">{option.hint}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
