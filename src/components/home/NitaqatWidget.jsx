import { formatLocaleNumber } from "../../i18n/formatLocale.js";
import { getNitaqatBandStyles } from "../../utils/nitaqat.js";
import {
  HOME_CARD,
  HOME_TEXT_BODY,
  HOME_TEXT_HEADING,
  HOME_TEXT_HINT,
  HOME_TEXT_LABEL,
} from "./homeStyles.js";

function ProgressBar({ value, max, barClassName }) {
  const safeMax = Math.max(Number(max) || 0, 1);
  const width = Math.min(100, Math.max(0, (Number(value) / safeMax) * 100));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0] dark:bg-[var(--bg-elevated)]">
      <div
        className={`h-full rounded-full transition-all ${barClassName}`}
        style={{ width: `${width}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
      />
    </div>
  );
}

export default function NitaqatWidget({ snapshot, isLoading }) {
  if (isLoading) {
    return (
      <article className={HOME_CARD}>
        <h2 className={HOME_TEXT_HEADING}>متتبّع السعودة (نطاقات)</h2>
        <p className={`${HOME_TEXT_HINT} mt-2`}>جاري التحميل…</p>
      </article>
    );
  }

  if (!snapshot) {
    return (
      <article className={HOME_CARD}>
        <h2 className={HOME_TEXT_HEADING}>متتبّع السعودة (نطاقات)</h2>
        <p className={`${HOME_TEXT_HINT} mt-2`}>تعذّر حساب المؤشر.</p>
      </article>
    );
  }

  const styles = getNitaqatBandStyles(snapshot.band);
  const progressTarget =
    snapshot.requiredPlatinum ??
    snapshot.requiredGreen ??
    100;

  return (
    <article className={HOME_CARD}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className={HOME_TEXT_HEADING}>متتبّع السعودة (نطاقات)</h2>
          <p className={HOME_TEXT_HINT}>
            {snapshot.sectorName ?? "لم يُحدَّد قطاع المنشأة بعد"}
          </p>
        </div>
        {snapshot.band ? (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles.badge}`}
          >
            {snapshot.bandLabel}
          </span>
        ) : null}
      </div>

      <p className={`${HOME_TEXT_LABEL} mt-4`}>
        حجم الكيان: {snapshot.entitySizeLabel}
      </p>

      {snapshot.isSmallEntity ? (
        <div className="mt-4 space-y-2">
          <p className={HOME_TEXT_BODY}>
            {snapshot.band === "green"
              ? "متوافق (مبسّط): يوجد سعودي مسجّل والمالك مسجّل."
              : "غير متوافق (مبسّط): يلزم سعودي واحد على الأقل + تسجيل المالك."}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={HOME_TEXT_LABEL}>النسبة التقديرية الحالية</p>
              <p className="text-3xl font-semibold tabular-nums text-exeer-primary">
                {formatLocaleNumber(snapshot.estimatedRate)}%
              </p>
            </div>
            {!snapshot.needsThresholds ? (
              <div className="text-end text-xs text-exeer-muted">
                <p>
                  المطلوب للأخضر:{" "}
                  <span className="font-medium text-exeer-primary">
                    {formatLocaleNumber(snapshot.requiredGreen)}%
                  </span>
                </p>
                {snapshot.requiredPlatinum != null ? (
                  <p>
                    المطلوب للبلاتيني:{" "}
                    <span className="font-medium text-exeer-primary">
                      {formatLocaleNumber(snapshot.requiredPlatinum)}%
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {snapshot.needsThresholds ? (
            <p className="rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              النسبة المطلوبة لقطاعك غير محددة — أدخلها من nitaqat.mlsd.gov.sa
              في الإعدادات.
            </p>
          ) : (
            <ProgressBar
              value={snapshot.estimatedRate}
              max={progressTarget}
              barClassName={styles.bar}
            />
          )}

          {snapshot.simulationMessage ? (
            <p className={`${HOME_TEXT_BODY} text-sm`}>
              {snapshot.simulationMessage}
            </p>
          ) : null}
        </div>
      )}

      <p className={`${HOME_TEXT_HINT} mt-4 border-t border-exeer-border pt-3 text-[11px] leading-relaxed dark:border-[var(--border-color)]`}>
        {snapshot.disclaimer}
      </p>
    </article>
  );
}
