import ConfirmationCard from "./ConfirmationCard.jsx";

export default function AgentMessage({ children, confirmation }) {
  if (confirmation) {
    return (
      <div className="me-auto max-w-full">
        <ConfirmationCard {...confirmation} />
      </div>
    );
  }

  return (
    <div className="me-auto max-w-[85%] rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-normal leading-relaxed text-[#0F172A]">
      {children}
    </div>
  );
}
