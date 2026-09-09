"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  filterMentionUsers,
  getActiveMention,
  insertMention,
  isCompletedMentionQuery,
  type MentionUser,
} from "@/lib/mentions";

export function MentionTextarea({
  value,
  onChange,
  users,
  mentionedIds,
  onMentionedIdsChange,
  placeholder,
  className,
  minRows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  users: MentionUser[];
  mentionedIds: string[];
  onMentionedIdsChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
}) {
  const listId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const active = getActiveMention(value, caret);
  const completed =
    active != null && isCompletedMentionQuery(active.query, mentionedIds, users);
  const candidates =
    active && !completed ? filterMentionUsers(users, active.query).slice(0, 8) : [];

  useEffect(() => {
    setOpen(Boolean(active) && !completed && candidates.length > 0);
    setHighlight(0);
  }, [active?.start, active?.query, completed, candidates.length]);

  function syncCaret() {
    const el = textareaRef.current;
    if (el) setCaret(el.selectionStart ?? 0);
  }

  function applyMention(user: MentionUser) {
    if (!active) return;
    const next = insertMention(value, caret, active.start, user, users);
    onChange(next.value);
    if (!mentionedIds.includes(user.id)) {
      onMentionedIdsChange([...mentionedIds, user.id]);
    }
    setOpen(false);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.caret, next.caret);
      setCaret(next.caret);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || candidates.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % candidates.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + candidates.length) % candidates.length);
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applyMention(candidates[highlight] ?? candidates[0]);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        rows={minRows}
        placeholder={placeholder}
        spellCheck={false}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        className={cn(
          "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-ourcloud-500 focus:outline-none focus:ring-2 focus:ring-ourcloud-500/20 min-h-[100px]",
          className
        )}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart ?? 0);
        }}
        onKeyUp={syncCaret}
        onClick={syncCaret}
        onSelect={syncCaret}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {candidates.map((user, index) => (
            <li key={user.id} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2 text-left text-sm",
                  index === highlight ? "bg-ourcloud-50 text-ourcloud-900" : "hover:bg-slate-50"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyMention(user);
                }}
                onMouseEnter={() => setHighlight(index)}
              >
                <span className="font-medium text-slate-900">{user.name}</span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-slate-400">
        Type @ to mention someone — inserts their full name; you can delete the last name and they stay tagged
      </p>
    </div>
  );
}
