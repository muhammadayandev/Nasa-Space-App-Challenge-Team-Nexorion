import React, { useState } from 'react';
import { AlertTriangle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [showScience, setShowScience] = useState(false);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dilemma-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-[#0B1120] p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {dayUnit} {day} · {dilemma.category}
          </span>
        </div>

        <h2
          id="dilemma-title"
          className="mt-2 font-display text-2xl font-bold text-white leading-tight"
        >
          {dilemma.title}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-200">{dilemma.story}</p>

        {/* Expandable Real NASA Science Context */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900">
          <button
            type="button"
            onClick={() => setShowScience((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold text-sky-300 hover:text-white transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Why does this happen? (Real NASA Science)</span>
            </span>
            {showScience ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showScience && (
            <p className="border-t border-slate-800 px-4 py-3 text-xs leading-relaxed text-slate-300">
              {dilemma.nasaScienceNote}
            </p>
          )}
        </div>

        {/* Trade-Off Choices */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dilemma.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChoose(choice)}
              className="flex flex-col justify-between rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400 hover:bg-slate-800/90 transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <span className="font-display text-sm font-bold text-white leading-snug">
                {choice.label}
              </span>

              <div className="mt-3 space-y-1.5 text-xs">
                <p className="text-emerald-400 font-medium">Gain: {choice.gainText}</p>
                <p className="text-amber-400 font-medium">Cost: {choice.costText}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
