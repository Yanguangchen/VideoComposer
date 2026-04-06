"use client";

const INSTRUCTION_JSON_URL = "/VideoComposerInstruction.json";

export function AiAgentsInstructionFab() {
  return (
    <button
      type="button"
      onClick={() => {
        window.open(INSTRUCTION_JSON_URL, "_blank", "noopener,noreferrer");
      }}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[110] max-w-[min(100vw-2rem,18rem)] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold leading-snug text-slate-800 shadow-lg transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-700"
      aria-label="Open Instruction for AI Agents (JSON) in a new tab"
    >
      Instruction for AI Agents
    </button>
  );
}
