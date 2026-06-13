import { Link } from "react-router-dom";
import { AGENT_ENTITY_ROW } from "./agentStyles.js";
import {
  fetchEmployeeAttendanceToday,
  fetchEmployeeIqama,
  fetchEmployeeLeave,
} from "../../services/queryPanelService.js";

function CountResult({ answerText, data }) {
  const count = Number(data?.count ?? 0);
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
      <p className="text-sm font-normal text-[#0F172A]">{answerText}</p>
      <p className="mt-2 text-3xl font-semibold text-[#0F172A]">{count}</p>
    </div>
  );
}

function PulseResult({ answerText, data }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
      <p className="text-sm font-normal text-[#0F172A]">{answerText}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "يعملون", value: data?.working ?? 0 },
          { label: "في إجازة", value: data?.onLeave ?? 0 },
          { label: "متأخرون", value: data?.late ?? 0 },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2 text-center"
          >
            <p className="text-lg font-semibold text-[#0F172A]">{item.value}</p>
            <p className="text-[11px] font-normal text-[#64748B]">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListResult({ answerText, data }) {
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
      <p className="text-sm font-normal text-[#0F172A]">{answerText}</p>
      {items.length ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const href = item.employee_id
              ? `/dashboard/employees?employee=${item.employee_id}`
              : null;
            const row = (
              <>
                <div className="min-w-0 flex-1 text-start">
                  <p className="text-sm font-medium text-[#0F172A]">{item.full_name}</p>
                  {item.subtitle ? (
                    <p className="mt-0.5 text-xs font-normal text-[#64748B]">{item.subtitle}</p>
                  ) : null}
                </div>
                {item.detail ? (
                  <span className="shrink-0 text-xs font-medium text-[#475569]">{item.detail}</span>
                ) : null}
              </>
            );

            return (
              <li key={`${item.employee_id ?? item.request_id ?? item.full_name}-${item.detail}`}>
                {href ? (
                  <Link to={href} className={`${AGENT_ENTITY_ROW} flex items-center gap-3`}>
                    {row}
                  </Link>
                ) : (
                  <div className={`${AGENT_ENTITY_ROW} flex items-center gap-3`}>{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function ProfileQuickChips({ employeeId, onQuickResult }) {
  const chips = [
    { id: "iqama", label: "إقامته", fn: fetchEmployeeIqama },
    { id: "leave", label: "إجازاته", fn: fetchEmployeeLeave },
    { id: "attendance", label: "حضوره", fn: fetchEmployeeAttendanceToday },
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={async () => {
            try {
              const result = await chip.fn(employeeId);
              onQuickResult?.(result);
            } catch (error) {
              onQuickResult?.({
                result_type: "text",
                answer_text: error instanceof Error ? error.message : "تعذّر التحميل.",
                data: {},
              });
            }
          }}
          className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

function ProfileResult({ answerText, data, onQuickResult }) {
  const lines = Array.isArray(data?.lines) ? data.lines : [];
  const employeeId = data?.employee_id;

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-4">
      <p className="text-sm font-medium text-[#0F172A]">{answerText}</p>
      <ul className="mt-3 space-y-2 text-sm font-normal text-[#0F172A]">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {employeeId ? (
        <>
          <ProfileQuickChips employeeId={employeeId} onQuickResult={onQuickResult} />
          <Link
            to={`/dashboard/employees?employee=${employeeId}`}
            className="mt-3 inline-flex text-xs font-medium text-[#0F172A] underline-offset-2 hover:underline"
          >
            عرض ملف الموظف
          </Link>
        </>
      ) : null}
    </div>
  );
}

function TextResult({ answerText, gemini }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
      <p className="text-sm font-normal text-[#0F172A]">{answerText}</p>
      {gemini ? (
        <p className="mt-2 text-[11px] font-normal text-[#64748B]">تمت المعالجة عبر الوكيل الذكي</p>
      ) : null}
    </div>
  );
}

export default function QueryResultView({ result, onQuickResult }) {
  if (!result) return null;

  const { result_type: resultType, answer_text: answerText, data, gemini } = result;

  if (resultType === "count") {
    return <CountResult answerText={answerText} data={data} />;
  }
  if (resultType === "pulse") {
    return <PulseResult answerText={answerText} data={data} />;
  }
  if (resultType === "list") {
    return <ListResult answerText={answerText} data={data} />;
  }
  if (resultType === "profile") {
    return (
      <ProfileResult
        answerText={answerText}
        data={data}
        onQuickResult={onQuickResult}
      />
    );
  }

  return <TextResult answerText={answerText} gemini={gemini} />;
}
