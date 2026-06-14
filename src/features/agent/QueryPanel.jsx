import { useCallback, useEffect, useState } from "react";
import { FileBarChart } from "lucide-react";
import { fetchAccountReport } from "../../services/queryPanelService.js";
import AgentPanelShell from "./AgentPanelShell.jsx";
import QueryDigestGrid from "./QueryDigestGrid.jsx";
import { AGENT_CANVAS, AGENT_TEXT_MUTED } from "./agentStyles.js";

export default function QueryPanel({ isOpen, onClose }) {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAccountReport();
      setDigest(data);
    } catch (loadErr) {
      setDigest(null);
      setError(
        loadErr instanceof Error ? loadErr.message : "تعذّر تحميل تقرير الحساب.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setDigest(null);
      setError("");
      return;
    }
    loadReport();
  }, [isOpen, loadReport]);

  return (
    <AgentPanelShell
      isOpen={isOpen}
      onClose={onClose}
      title="تقرير حسابك"
      subtitle="نظرة حية على آخر أحداث منشأتك"
      titleIcon={FileBarChart}
      ariaLabelledBy="account-report-panel-title"
    >
      <div className={`flex min-h-0 flex-1 flex-col ${AGENT_CANVAS}`}>
        <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5 ${AGENT_CANVAS}`}>
          {loading ? (
            <p className={AGENT_TEXT_MUTED}>جاري تحميل التقرير…</p>
          ) : null}

          {error ? (
            <p className="mb-4 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-normal text-red-800 dark:border-[var(--color-error-text)]/30 dark:bg-[var(--color-error-surface)] dark:text-[var(--color-error-text)]">
              {error}
            </p>
          ) : null}

          {!loading ? (
            <QueryDigestGrid digest={digest} loading={loading} error={error} />
          ) : null}
        </div>
      </div>
    </AgentPanelShell>
  );
}
