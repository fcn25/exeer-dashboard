import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  FileText,
  Gavel,
  ListTodo,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useQuickCreate } from "../../context/QuickCreateContext.jsx";
import {
  QUICK_CREATE_GROUP_LABELS,
  getQuickCreateActionsForRole,
} from "../../constants/quickCreateActions.ts";
import { isNative } from "../../lib/platform.ts";
import { useIsMobile } from "../../hooks/useIsMobile.js";

const ICONS = {
  UserPlus,
  Gavel,
  ListTodo,
  Calendar,
  FileText,
};

const MENU_PANEL =
  "rounded-[16px] border border-[#E2E8F0] bg-white dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]";

const MENU_ITEM =
  "flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-start text-sm font-normal text-[#0F172A] transition-colors hover:bg-[#F8FAFC] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-surface-hover)]";

function groupActions(actions) {
  const groups = { people: [], work: [] };
  for (const action of actions) {
    groups[action.group].push(action);
  }
  return groups;
}

function QuickCreateList({ actions, onSelect, searchQuery = "" }) {
  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? actions.filter((action) => action.label.toLowerCase().includes(query))
    : actions;

  if (filtered.length === 0) {
    return (
      <p className="px-3 py-4 text-center text-xs font-normal text-[#64748B] dark:text-[var(--text-secondary)]">
        لا توجد نتائج
      </p>
    );
  }

  const grouped = groupActions(filtered);

  return (
    <div className="flex flex-col gap-3 p-2">
      {(["people", "work"]).map((groupKey) => {
        const items = grouped[groupKey];
        if (items.length === 0) return null;
        const GroupIcon = groupKey === "people" ? UserPlus : ListTodo;

        return (
          <section key={groupKey}>
            <p className="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-[#64748B] dark:text-[var(--text-secondary)]">
              <GroupIcon className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden />
              {QUICK_CREATE_GROUP_LABELS[groupKey]}
            </p>
            <ul className="flex flex-col gap-0.5">
              {items.map((action) => {
                const Icon = ICONS[action.icon] ?? ListTodo;
                return (
                  <li key={action.id}>
                    <button
                      type="button"
                      className={MENU_ITEM}
                      onClick={() => onSelect(action.id)}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#475569] dark:bg-[var(--bg-elevated)] dark:text-[var(--text-secondary)]">
                        <Icon className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
                      </span>
                      <span className="font-medium">{action.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default function QuickCreateMenu({
  isOpen,
  onClose,
  anchorRef,
  searchMode = false,
}) {
  const { role } = useAuth();
  const { openQuickCreate } = useQuickCreate();
  const isMobileViewport = useIsMobile();
  const useSheet = isNative() || isMobileViewport;
  const panelRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");

  const actions = useMemo(
    () => getQuickCreateActionsForRole(role),
    [role],
  );

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      return undefined;
    }

    const handlePointerDown = (event) => {
      const target = event.target;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  const handleSelect = (actionId) => {
    onClose();
    queueMicrotask(() => {
      openQuickCreate(actionId);
    });
  };

  if (!isOpen || actions.length === 0) return null;

  const list = (
    <>
      {searchMode ? (
        <div className="border-b border-[#E2E8F0] px-3 py-2 dark:border-[var(--border-color)]">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="ابحث عن إجراء…"
            autoFocus
            className="w-full rounded-[12px] border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-normal text-[#0F172A] outline-none placeholder:text-[#64748B] focus:border-[#0F172A] dark:border-[var(--border-color)] dark:bg-[var(--bg-elevated)] dark:text-[var(--text-primary)]"
          />
        </div>
      ) : null}
      <QuickCreateList
        actions={actions}
        onSelect={handleSelect}
        searchQuery={searchMode ? searchQuery : ""}
      />
    </>
  );

  if (useSheet) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col justify-end">
        <button
          type="button"
          className="absolute inset-0 bg-black/30"
          aria-label="إغلاق"
          onClick={onClose}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="إنشاء سريع"
          className={`relative z-10 ${MENU_PANEL} mx-0 max-h-[min(70vh,520px)] overflow-y-auto rounded-b-none pb-[env(safe-area-inset-bottom)]`}
        >
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3 dark:border-[var(--border-color)]">
            <p className="text-sm font-medium text-[#0F172A] dark:text-[var(--text-primary)]">
              الجديد
            </p>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-normal text-[#64748B] dark:text-[var(--text-secondary)]"
            >
              إغلاق
            </button>
          </div>
          {list}
        </div>
      </div>
    );
  }

  const anchorRect = anchorRef?.current?.getBoundingClientRect();
  const top = anchorRect ? anchorRect.bottom + 8 : 0;
  const insetInlineEnd = anchorRect
    ? window.innerWidth - anchorRect.right
    : 16;

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label="إنشاء سريع"
      className={`fixed z-[70] w-[min(280px,calc(100vw-2rem))] ${MENU_PANEL}`}
      style={{ top, insetInlineEnd }}
    >
      {list}
    </div>
  );
}

/** Web-only: global Cmd/Ctrl+K listener */
export function useQuickCreateCommandPalette(onOpen) {
  const { role } = useAuth();
  const hasActions = getQuickCreateActionsForRole(role).length > 0;

  useEffect(() => {
    if (!hasActions || isNative()) return undefined;

    const handleKeyDown = (event) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod || event.key.toLowerCase() !== "k") return;
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || event.target?.isContentEditable) {
        return;
      }
      event.preventDefault();
      onOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasActions, onOpen]);
}
