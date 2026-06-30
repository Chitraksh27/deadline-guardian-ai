import React, { useState } from 'react';
import { Play, Cpu, ChevronRight, Loader2, Target } from 'lucide-react';

interface CreateGoalViewProps {
  onSubmit: (rawText: string) => Promise<any>;
  onGoalCreated: (goalId: string) => void;
}

export const CreateGoalView: React.FC<CreateGoalViewProps> = React.memo(({ onSubmit, onGoalCreated }) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: 'Goal Analysis', desc: 'Analyzing your goal and extracting deadlines...', active: 'Analyzing Goal...' },
    { label: 'Task Breakdown', desc: 'Breaking down your goal into a sequence of tasks...', active: 'Decomposing Tasks...' },
    { label: 'Schedule Creation', desc: 'Allocating tasks to available days...', active: 'Scheduling Sequence...' },
    { label: 'Risk Assessment', desc: 'Evaluating timeline and identifying risks...', active: 'Evaluating Deadline Risk...' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);
    setCurrentStep(0);

    // Animate the step-by-step execution to represent the actual multi-agent pipeline
    const timer1 = setTimeout(() => setCurrentStep(1), 2200);
    const timer2 = setTimeout(() => setCurrentStep(2), 4400);
    const timer3 = setTimeout(() => setCurrentStep(3), 6600);

    try {
      const response = await onSubmit(inputText);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setCurrentStep(4);

      if (response && response.data && response.data.goalId) {
        // Redirect to details
        setTimeout(() => onGoalCreated(response.data.goalId), 800);
      } else {
         setError('Failed to extract goal details. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to create goal via multi-agent chain:', err);
      setError(err.message || 'An unexpected error occurred while processing your goal.');
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'Finish compiler design project by Friday',
    'Prepare DBMS mock interview in 10 days',
    'Build and deploy MVP project by June 29',
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm max-w-3xl mx-auto space-y-8 my-4">
      {/* 1. Header description */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          New Goal
        </span>
        <h2 className="text-2xl font-light tracking-tight text-slate-900">
          Create <span className="font-semibold">Goal</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Describe your objective, and we will automatically translate it into an
          actionable task list, build a schedule, and forecast any risks.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-800 shadow-sm animate-fade-in">
          {error}
        </div>
      )}

      {/* 2. Main Form */}
      {!loading ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="goal-intent" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              What is your goal?
            </label>
            <textarea
              id="goal-intent"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your objective, deadline, and constraints..."
              className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:border-black focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors resize-none"
              required
            />
          </div>

          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block" id="suggested-presets">
              Suggested Presets
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="suggested-presets">
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInputText(p)}
                  className="px-3.5 py-1.5 border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-black font-medium text-xs rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-[auto]"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-black text-white hover:bg-slate-800 transition-colors font-medium text-sm rounded-xl flex items-center justify-center shadow-sm focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 min-h-[44px]"
          >
            <Target className="w-4 h-4 mr-2" />
            Create Goal
          </button>
        </form>
      ) : (
        /* Step-by-Step Multi-agent Loading Visualizer */
        <div className="py-10 space-y-8 animate-fade-in">
          <div className="flex flex-col items-center text-center space-y-3 mb-6">
            <Loader2 className="w-10 h-10 text-slate-800 animate-spin" />
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
              Creating your plan
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Please wait while we build your task list and schedule.
            </p>
          </div>

          <div className="space-y-4 max-w-md mx-auto">
            {steps.map((step, idx) => {
              const isPending = idx > currentStep;
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;

              return (
                <div
                  key={idx}
                  className={`flex items-center space-x-4 p-3.5 rounded-lg border transition-all ${
                    isActive
                      ? 'border-slate-800 bg-slate-50/50 shadow-sm scale-[1.01]'
                      : isCompleted
                      ? 'border-green-100 bg-green-50/10'
                      : 'border-slate-100 opacity-50'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      isCompleted
                        ? 'bg-green-100 text-green-700'
                        : isActive
                        ? 'bg-black text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between">
                      <span className="text-xs font-semibold text-slate-800">{step.label}</span>
                      {isActive && (
                        <span className="text-[10px] font-bold text-slate-400 animate-pulse uppercase tracking-wider">
                          {step.active}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium truncate block">
                      {step.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
