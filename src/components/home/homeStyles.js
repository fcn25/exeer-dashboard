/** Page shell — dark uses black surfaces only, never white backgrounds */
export const PAGE_DARK =
  "dark:bg-[var(--bg-main)] dark:text-[var(--text-primary)]";

export const SURFACE_DARK =
  "dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]";

export const HOME_SHELL =
  "rounded-[16px] border border-[#E2E8F0] bg-white shadow-none dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]";

export const HOME_CARD =
  "rounded-[12px] border border-[#E2E8F0] bg-white shadow-none dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]";

export const HOME_SURFACE =
  "rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] shadow-none dark:border-[var(--border-color)] dark:bg-[var(--bg-surface-hover)]";

export const HOME_BTN =
  "rounded-[10px] shadow-none transition-colors";

export const HOME_TEXT_TITLE =
  "text-[#0F172A] dark:text-[var(--text-primary)] dark:font-bold";

export const HOME_TEXT_HEADING =
  "text-[#0F172A] dark:text-[var(--text-primary)] dark:font-semibold";

export const HOME_TEXT_BODY =
  "text-[#0F172A] dark:text-[var(--text-primary)] dark:font-medium";

export const HOME_TEXT_LABEL =
  "text-[#64748B] dark:text-[var(--text-secondary)] dark:font-medium";

export const HOME_TEXT_HINT =
  "text-[#94A3B8] dark:text-[var(--text-secondary)] dark:font-normal";

export const HOME_BTN_PRIMARY =
  "rounded-full bg-[#0F172A] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 dark:bg-[var(--accent-color)] dark:text-[#131314] dark:font-semibold dark:hover:brightness-105";

export const HOME_BTN_SECONDARY =
  "inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-[13px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-primary)] dark:font-medium dark:hover:bg-[var(--bg-surface-hover)]";

export const HOME_ICON_BTN =
  "flex h-9 w-9 items-center justify-center rounded-md border border-[#E2E8F0] text-[#0F172A] transition-colors hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-surface-hover)]";

export const PRIORITY_ICON_STYLES = {
  red: "bg-[#FEE2E2] text-[#EF4444] dark:bg-red-950/50 dark:text-red-300",
  orange: "bg-[#FEF3C7] text-[#F59E0B] dark:bg-amber-950/50 dark:text-amber-300",
  blue: "bg-[#DBEAFE] text-[#3B82F6] dark:bg-blue-950/50 dark:text-blue-300",
  gray: "bg-[#F1F5F9] text-[#64748B] dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)] dark:font-medium",
};
