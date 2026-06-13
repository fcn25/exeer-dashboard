import { getExamplesForRole } from "./constants/examplePrompts.js";

export default function ExampleChips({ role, onSelect }) {
  const examples = getExamplesForRole(role);

  return (
    <div className="flex flex-wrap gap-2">
      {examples.map((example) => {
        const Icon = example.icon;
        return (
          <button
            key={example.id}
            type="button"
            onClick={() => onSelect(example.text)}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-normal text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
            <span className="text-start leading-snug">{example.text}</span>
          </button>
        );
      })}
    </div>
  );
}
