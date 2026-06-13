import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { normalizeAppRole } from "../../constants/roles.js";
import { MOCK_JOB_TITLE_CHANGE } from "./constants/mockData.js";
import ExampleChips from "./ExampleChips.jsx";
import UserBubble from "./UserBubble.jsx";
import AgentMessage from "./AgentMessage.jsx";
import { AGENT_INPUT, AGENT_PRIMARY_BTN } from "./agentStyles.js";

let messageCounter = 0;
function nextId(prefix) {
  messageCounter += 1;
  return `${prefix}-${messageCounter}`;
}

export default function AgentConversation({
  role,
  onConfirmChange,
  className = "",
}) {
  const normalizedRole = normalizeAppRole(role) ?? "Direct_Manager";
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const inputRef = useRef(null);
  const threadEndRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const handleSend = useCallback(
    (textOverride) => {
      const text = String(textOverride ?? input).trim();
      if (!text || isThinking) return;

      const userMessageId = nextId("user");
      setMessages((current) => [
        ...current,
        { id: userMessageId, type: "user", text },
      ]);
      setInput("");
      setIsThinking(true);

      window.setTimeout(() => {
        const cardId = nextId("card");
        setMessages((current) => [
          ...current,
          {
            id: nextId("agent"),
            type: "confirmation",
            cardId,
            status: "pending",
            payload: { ...MOCK_JOB_TITLE_CHANGE },
          },
        ]);
        setIsThinking(false);
      }, 600);
    },
    [input, isThinking],
  );

  const handleConfirm = useCallback(
    (messageId) => {
      setMessages((current) =>
        current.map((item) =>
          item.id === messageId ? { ...item, status: "confirmed" } : item,
        ),
      );
      onConfirmChange?.();
    },
    [onConfirmChange],
  );

  const handleCancel = useCallback((messageId) => {
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId ? { ...item, status: "cancelled" } : item,
      ),
    );
  }, []);

  const isEmpty = messages.length === 0 && !isThinking;

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`.trim()}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col justify-center py-6">
            <h2 className="text-lg font-semibold text-[#0F172A]">
              كيف أساعدك اليوم؟
            </h2>
            <p className="mt-1 text-sm font-normal text-[#64748B]">
              اكتب أمرك بالعربية أو اختر من الأمثلة
            </p>
            <div className="mt-5">
              <ExampleChips
                role={normalizedRole}
                onSelect={(text) => {
                  setInput(text);
                  inputRef.current?.focus();
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => {
              if (message.type === "user") {
                return <UserBubble key={message.id} text={message.text} />;
              }

              if (message.type === "confirmation") {
                return (
                  <AgentMessage
                    key={message.id}
                    confirmation={{
                      ...message.payload,
                      status: message.status,
                      onConfirm: () => handleConfirm(message.id),
                      onCancel: () => handleCancel(message.id),
                    }}
                  />
                );
              }

              return null;
            })}
            {isThinking ? (
              <p className="me-auto text-xs font-normal text-[#64748B]">
                جاري المعالجة…
              </p>
            ) : null}
            <div ref={threadEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#E2E8F0] bg-white px-4 py-3">
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="اكتب أمراً أو استفساراً للوكيل…"
            className={AGENT_INPUT}
            aria-label="اكتب أمراً أو استفساراً للوكيل"
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className={`${AGENT_PRIMARY_BTN} h-11 w-11 shrink-0 rounded-full p-0`}
            aria-label="إرسال"
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}
