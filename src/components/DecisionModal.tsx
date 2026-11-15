import React from 'react';
import { DilemmaChoice, MissionDilemma } from '../data/missionScenarios';

interface DecisionModalProps {
  dilemma: MissionDilemma;
  dayUnit: string;
  day: number;
  onChoose: (choice: DilemmaChoice) => void;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  dilemma,
  dayUnit,
  day,
  onChoose,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dilemma-title"
    >
      <div className="w-full max-w-2xl rounded-[2rem] border-4 border-amber-400 bg-[#081020] p-7 sm:p-10 text-center shadow-2xl animate-[popupSlideUp_0.3s_ease-out]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/20 text-4xl">
          ⚡
        </div>

        <p className="mt-3 text-xs font-extrabold uppercase tracking-widest text-amber-400">
          {dayUnit} {day} · {dilemma.category}
        </p>

        <h2
          id="dilemma-title"
          className="mt-1 font-display text-3xl sm:text-4xl font-extrabold text-white"
        >
          {dilemma.title}
        </h2>

        <p className="mx-auto mt-3 max-w-lg text-lg font-medium text-slate-100">{dilemma.story}</p>

        <p className="mx-auto mt-3 inline-block rounded-2xl bg-sky-500/15 px-4 py-2 text-sm font-bold text-sky-300">
          {dilemma.nasaScienceNote}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 text-left">
          {dilemma.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChoose(choice)}
              className="rounded-2xl border-2 border-slate-700 border-b-4 bg-slate-900 p-4 hover:border-amber-400 hover:bg-slate-800 active:translate-y-0.5 transition-all"
            >
              <p className="font-display text-base font-extrabold text-white">{choice.label}</p>
              <p className="mt-1.5 text-xs font-bold text-emerald-400">+{choice.gainText}</p>
              <p className="mt-0.5 text-xs font-bold text-amber-300">{choice.costText}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
