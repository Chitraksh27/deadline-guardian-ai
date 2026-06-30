import React, { useState } from "react";
import { Goal, DashboardMetrics, Task, ScheduleBlock } from "../types.ts";
import {
  Target,
  Calendar,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Play,
  Loader2,
  Compass,
  ShieldAlert,
  Sparkles,
  Inbox,
} from "lucide-react";
import { GuardianBrief } from "./GuardianBrief.tsx";

interface DashboardViewProps {
  metrics: DashboardMetrics;
  goals: Goal[];
  todayTasks: Array<{ task: Task; block: ScheduleBlock }>;
  currentUser?: { name: string; initials: string; workspaceName: string };
  loading: boolean;
  onSelectGoal: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onMissTask: (id: string) => void;
  onQuickIntake: (rawText: string) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = React.memo(
  ({
    metrics,
    goals,
    todayTasks,
    currentUser,
    loading,
    onSelectGoal,
    onCompleteTask,
    onMissTask,
    onQuickIntake,
  }) => {
    const [inputText, setInputText] = useState("");
    const [submittingIntake, setSubmittingIntake] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    const handleIntakeSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim()) return;
      setSubmittingIntake(true);
      setErrorText(null);
      try {
        await onQuickIntake(inputText);
        setInputText("");
      } catch (err: any) {
        setErrorText(
          err.message || "Intake analysis failed. Check prompt constraints.",
        );
      } finally {
        setSubmittingIntake(false);
      }
    };

    const cards = [
      {
        label: "Active Goals",
        value: metrics.activeGoals,
        icon: Target,
        color: "text-slate-800",
        bg: "bg-slate-50",
      },
      {
        label: "Today's Schedule",
        value: metrics.tasksToday,
        icon: Calendar,
        color: "text-blue-600",
        bg: "bg-blue-50/40",
      },
      {
        label: "Tasks Completed",
        value: metrics.completedTasks,
        icon: CheckSquare,
        color: "text-green-600",
        bg: "bg-green-50/40",
      },
      {
        label: "High Risk Goals",
        value: metrics.highRiskGoals,
        icon: AlertTriangle,
        color:
          metrics.highRiskGoals > 0
            ? "text-rose-500 font-bold"
            : "text-slate-400",
        bg: metrics.highRiskGoals > 0 ? "bg-rose-50" : "bg-slate-50",
      },
    ];

    return (
      <div className="space-y-6 overflow-y-auto pr-2 max-h-full pb-8 animate-fade-in">
        <GuardianBrief
          metrics={metrics}
          goals={goals}
          todayTasks={todayTasks}
          userName={currentUser?.name || "User"}
          onSelectGoal={onSelectGoal}
        />

        {/* 1. Quick Intake Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-12 -translate-y-12 pointer-events-none" />

          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="w-4 h-4 text-slate-800 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              Create a New Goal
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed max-w-xl">
            Describe what you need to achieve in plain natural language (e.g.{" "}
            <span className="font-semibold text-slate-700">
              "Build database project by Friday"
            </span>
            ). We will automatically break down the tasks, resolve dependencies,
            and map out a schedule.
          </p>

          <form
            onSubmit={handleIntakeSubmit}
            className="flex gap-3 relative z-10"
            aria-label="Quick goal intake form"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="What do you want to achieve?"
              aria-label="Describe what you need to achieve"
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:border-black focus:bg-white focus-visible:ring-2 focus-visible:ring-slate-900 font-medium text-slate-800 placeholder-slate-400 transition-all shadow-inner disabled:opacity-50"
              disabled={submittingIntake}
              aria-disabled={submittingIntake}
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all duration-150 flex items-center shrink-0 disabled:bg-slate-300 transform active:scale-95 shadow-sm focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              disabled={submittingIntake || !inputText.trim()}
              aria-disabled={submittingIntake || !inputText.trim()}
            >
              {submittingIntake ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1.5 fill-current" />
                  Generate Plan
                </>
              )}
            </button>
          </form>

          {/* Polished Error State */}
          {errorText && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-150 rounded-xl flex items-center space-x-2 text-rose-700 text-xs animate-fade-in font-medium">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-4 gap-6">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {card.label}
                  </span>
                  <div className={`p-1.5 rounded-lg ${card.bg}`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-slate-800">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : (
                    card.value
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Main Workspace Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Today's Focus List (Polished Empty/Active States) */}
          <div className="col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-[350px]">
            <h3 className="text-xs font-bold tracking-wider uppercase text-slate-400 mb-4 flex items-center">
              <Calendar className="w-4 h-4 mr-1.5 text-slate-500" />
              Today's Focus
            </h3>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[350px] pr-1">
              {todayTasks.length === 0 ? (
                /* Polished Empty State for Tasks */
                <div className="flex flex-col items-center justify-center text-center h-full py-10 space-y-3">
                  <div className="p-3 bg-slate-50 rounded-full border border-slate-100 text-slate-400">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                      No Tasks for Today
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[180px] leading-relaxed mx-auto font-medium">
                      You have no tasks scheduled for today. Create a new goal
                      or check your existing ones.
                    </p>
                  </div>
                </div>
              ) : (
                todayTasks.map(({ task, block }) => (
                  <div
                    key={task.id}
                    className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-all animate-fade-in"
                  >
                    <div className="mb-3">
                      <span className="text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">
                        Planned Focus Block
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 mt-2">
                        {task.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                        {task.description || "No description provided."}
                      </p>
                    </div>
                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => onMissTask(task.id)}
                        aria-label={`Mark task ${task.title} as missed`}
                        className="px-2.5 py-1 text-[10px] border border-rose-200 text-rose-600 rounded-lg bg-rose-50/50 hover:bg-rose-50 font-bold transition-all transform active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500 min-h-[44px] sm:min-h-[auto]"
                      >
                        Missed
                      </button>
                      <button
                        onClick={() => onCompleteTask(task.id)}
                        aria-label={`Complete task ${task.title}`}
                        className="px-2.5 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all transform active:scale-95 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 min-h-[44px] sm:min-h-[auto]"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Goals Space (Polished Empty/Active States) */}
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold tracking-wider uppercase text-slate-400 mb-4 flex items-center">
              <Compass className="w-4 h-4 mr-1.5 text-slate-500" />
              Active Goals
            </h3>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[350px] pr-1">
              {goals.length === 0 ? (
                /* Polished Empty State for Goals */
                <div className="flex flex-col items-center justify-center text-center h-full py-16 space-y-4">
                  <div
                    className="p-4 bg-slate-50 rounded-full border border-slate-100 text-slate-400 animate-bounce"
                    style={{ animationDuration: "4s" }}
                  >
                    <Target className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      No Active Goals
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1.5 max-w-sm leading-relaxed mx-auto font-medium">
                      You haven't set any goals yet. Describe what you want to
                      achieve above to get started.
                    </p>
                  </div>
                </div>
              ) : (
                goals.map((g) => {
                  const riskColor =
                    g.risk?.level === "HIGH"
                      ? "bg-rose-50/80 text-rose-700 border-rose-200"
                      : g.risk?.level === "MEDIUM"
                        ? "bg-amber-50/80 text-amber-700 border-amber-200"
                        : "bg-green-50/80 text-green-700 border-green-200";

                  return (
                    <button
                      key={g.id}
                      onClick={() => onSelectGoal(g.id)}
                      aria-label={`View details for goal ${g.title}`}
                      className="w-full text-left group border border-slate-150 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50 cursor-pointer transition-all duration-150 flex items-center justify-between hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-900 min-h-[64px]"
                    >
                      <div className="space-y-1.5 flex-1 pr-6">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-xs font-bold text-slate-800 group-hover:text-black transition-colors">
                            {g.title}
                          </h4>
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold border rounded uppercase ${riskColor}`}
                          >
                            Risk Score: {g.risk?.score || 10}% (
                            {g.risk?.level || "LOW"})
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-[10px] text-slate-400 font-bold">
                          <span>
                            Deadline:{" "}
                            {new Date(g.deadline).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>Complexity: {g.complexity}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate italic font-medium leading-relaxed">
                          {g.risk?.reason || "Evaluating timeline..."}
                        </p>
                      </div>
                      <div className="p-2 bg-white group-hover:bg-black rounded-lg border border-slate-150 group-hover:border-black transition-all shadow-sm">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
