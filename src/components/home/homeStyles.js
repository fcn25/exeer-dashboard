/** Page shell — dark uses black surfaces only, never white backgrounds */
export const PAGE_DARK =
  "dark:bg-[var(--bg-main)] dark:text-[var(--text-primary)]";

export const SURFACE_DARK =
  "dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]";

/** Section wrapper on warm canvas — spacing only in light; white card in dark */
export const HOME_SHELL =
  "home-section-shell shadow-none dark:rounded-[16px] dark:border dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]";

/** Floating white card on warm canvas */
export const HOME_CARD =
  "home-card-interactive rounded-[12px] bg-white p-6 shadow-none dark:border dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]";

/** In-card nested areas — dividers, not nested boxes */
export const HOME_SURFACE =
  "rounded-[12px] shadow-none dark:border dark:border-[var(--border-color)] dark:bg-[var(--bg-surface-hover)]";

/** Hairline separators between stacked rows inside a card — not item boxes */
export const HOME_LIST_DIVIDE =
  "home-list-divide divide-y divide-[#F0EEEA] dark:divide-[rgba(255,255,255,0.06)]";

/** Comfortable row padding; pair with HOME_LIST_DIVIDE on the parent list */
export const HOME_LIST_ITEM =
  "py-4 first:pt-0 last:pb-0";

export const HOME_BTN =
  "rounded-[10px] shadow-none transition-colors";

/** Typographic hierarchy — light uses CSS utilities; dark keeps existing weights */
export const TYPE_SECTION =
  "type-section-title dark:text-[var(--text-primary)] dark:font-semibold";

export const TYPE_ITEM =
  "type-item-title dark:text-[var(--text-primary)] dark:font-medium";

export const TYPE_META =
  "type-meta dark:text-[var(--text-secondary)] dark:font-normal";

export const HOME_TEXT_TITLE =
  "type-item-title dark:text-[var(--text-primary)] dark:font-bold";

export const HOME_TEXT_HEADING =
  "type-section-title dark:text-[var(--text-primary)] dark:font-semibold";

export const HOME_TEXT_BODY =
  "type-item-title dark:text-[var(--text-primary)] dark:font-medium";

export const HOME_TEXT_LABEL =
  "type-meta dark:text-[var(--text-secondary)] dark:font-medium";

export const HOME_TEXT_HINT =
  "type-meta dark:text-[var(--text-secondary)] dark:font-normal";

export const HOME_BTN_PRIMARY =
  "rounded-full bg-[#0F172A] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 dark:bg-[var(--accent-on-dark-bg)] dark:text-[var(--accent-color)] dark:font-semibold dark:hover:brightness-105";

export const HOME_BTN_SECONDARY =
  "home-btn-outlined inline-flex items-center gap-1.5 rounded-full border border-[#F0EEEA] bg-white px-4 py-2 text-[13px] font-medium text-[#111111] hover:bg-[#F7F6F3] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-primary)] dark:font-medium dark:hover:bg-[var(--bg-surface-hover)]";

export const HOME_ICON_BTN =
  "home-btn-outlined flex h-9 w-9 items-center justify-center rounded-md border border-[#F0EEEA] text-[#111111] transition-colors hover:bg-[#F7F6F3] dark:border-[var(--border-color)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-surface-hover)]";

export const PRIORITY_ICON_STYLES = {
  red: "bg-[#FEE2E2] text-[#EF4444] dark:bg-red-950/50 dark:text-[var(--text-error)]",
  orange: "bg-[#FEF3C7] text-[#F59E0B] dark:bg-amber-950/50 dark:text-amber-300",
  blue: "bg-[#DBEAFE] text-[#3B82F6] dark:bg-blue-950/50 dark:text-blue-300",
  gray: "bg-[#F1F5F9] text-[#64748B] dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)] dark:font-medium",
};

/** Soft neutral icon well — light theme (not navy/indigo) */
export const ICON_CHIP =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F1F5F9] text-[#64748B] dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]";

export const ICON_CHIP_ROUND =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]";

/** Active tab pill — brand navy (selected state only) */
export const TAB_ACTIVE =
  "bg-[#0F172A] text-white shadow-none dark:border dark:border-[var(--border-color)] dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]";

/** Inactive tab on white card */
export const TAB_INACTIVE =
  "bg-[#F7F6F3] text-[#6B7280] hover:bg-[#F0EEEA] hover:text-[#111111] dark:border dark:border-[var(--border-color)] dark:bg-[var(--bg-main)] dark:text-[var(--text-secondary)] dark:hover:border-[var(--border-color)] dark:hover:text-[var(--text-primary)]";
