import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, StickyNote, X } from "lucide-react";
import { useAppLocale } from "../../i18n/useAppLocale.js";
import {
  getMyQuickNote,
  normalizeNoteColor,
  upsertMyQuickNote,
} from "../../services/quickNotesService.js";

const COLOR_STYLES = {
  amber: "bg-[#FEF3C7] border-[#FCD34D] text-[#78350F]",
  mint: "bg-[#D1FAE5] border-[#6EE7B7] text-[#065F46]",
  sky: "bg-[#E0F2FE] border-[#7DD3FC] text-[#0C4A6E]",
  rose: "bg-[#FFE4E6] border-[#FDA4AF] text-[#881337]",
};

const COLOR_OPTIONS = Object.keys(COLOR_STYLES);

export default function QuickStickyNote({ isOpen, onClose }) {
  const { t, dir } = useAppLocale();
  const [content, setContent] = useState("");
  const [color, setColor] = useState("amber");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const saveTimerRef = useRef(null);

  const loadNote = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const row = await getMyQuickNote();
      if (row) {
        setContent(row.content ?? "");
        setColor(normalizeNoteColor(row.color));
      }
    } catch (err) {
      setError(err.message || t("quickNote.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isOpen) return;
    loadNote();
  }, [isOpen, loadNote]);

  const persistNote = useCallback(
    async (nextContent, nextColor, pinned = true) => {
      setIsSaving(true);
      setError("");
      try {
        await upsertMyQuickNote({
          content: nextContent,
          color: nextColor,
          is_pinned: pinned,
        });
      } catch (err) {
        setError(err.message || t("quickNote.saveError"));
      } finally {
        setIsSaving(false);
      }
    },
    [t],
  );

  const scheduleSave = useCallback(
    (nextContent, nextColor) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        persistNote(nextContent, nextColor, true);
      }, 600);
    },
    [persistNote],
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const handleClose = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      await upsertMyQuickNote({ content, color, is_pinned: false });
    } catch {
      // keep UI closable even if save fails
    }
    onClose?.();
  };

  const handleContentChange = (value) => {
    setContent(value);
    scheduleSave(value, color);
  };

  const handleColorChange = (value) => {
    setColor(value);
    scheduleSave(content, value);
  };

  if (!isOpen) return null;

  const palette = COLOR_STYLES[color] ?? COLOR_STYLES.amber;

  return (
    <div
      dir={dir}
      className="pointer-events-none fixed bottom-8 start-4 z-[45] max-w-[min(300px,calc(100vw-2rem))]"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto rotate-[-1.5deg] rounded-md border-2 p-3 shadow-none transition-transform hover:rotate-0 ${palette}`}
        role="complementary"
        aria-label={t("quickNote.title")}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-bold">
            <StickyNote className="h-4 w-4" aria-hidden />
            {t("quickNote.title")}
          </div>
          <div className="flex items-center gap-1">
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin opacity-70" aria-hidden />
            ) : null}
            <button
              type="button"
              onClick={handleClose}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-black/10 bg-white/40 hover:bg-white/70"
              aria-label={t("common.close")}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-xs opacity-80">{t("common.loading")}</p>
        ) : (
          <>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={t("quickNote.placeholder")}
              rows={5}
              className="w-full resize-none rounded-md border border-black/10 bg-white/50 px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-current/50 focus:border-black/20"
            />
            <div className="mt-2 flex items-center gap-1.5">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleColorChange(option)}
                  className={`h-5 w-5 rounded-full border-2 ${
                    COLOR_STYLES[option]
                  } ${color === option ? "ring-2 ring-black/30" : "opacity-80"}`}
                  aria-label={t(`quickNote.colors.${option}`)}
                  aria-pressed={color === option}
                />
              ))}
            </div>
          </>
        )}

        {error ? (
          <p className="mt-2 text-[11px] text-red-800">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
