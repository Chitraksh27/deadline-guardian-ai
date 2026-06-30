import React, { useMemo } from 'react';
import { Sparkles, ArrowRight, Zap, Target, Clock, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';
import { Goal, DashboardMetrics, Task, ScheduleBlock } from '../types.ts';

interface GuardianBriefProps {
  metrics: DashboardMetrics;
  goals: Goal[];
  todayTasks: Array<{ task: Task; block: ScheduleBlock }>;
  userName?: string;
  onSelectGoal: (id: string) => void;
}

export const GuardianBrief: React.FC<GuardianBriefProps> = ({
  metrics,
  goals,
  todayTasks,
  userName = 'User',
  onSelectGoal,
}) => {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const totalHoursToday = useMemo(() => {
    return todayTasks.reduce((acc, curr) => acc + (curr.task.estimatedHours || 0), 0);
  }, [todayTasks]);

  const highRiskGoal = useMemo(() => {
    return goals.find((g) => g.risk && g.risk.level === 'HIGH' && g.status === 'ACTIVE');
  }, [goals]);

  const nextDeadline = useMemo(() => {
    const activeGoals = goals.filter((g) => g.status === 'ACTIVE' && g.deadline);
    if (activeGoals.length === 0) return null;
    const sorted = [...activeGoals].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    return sorted[0].deadline;
  }, [goals]);

  const nextTask = useMemo(() => {
    if (todayTasks.length > 0) {
      const pendingTasks = todayTasks.filter((t) => t.task.status === 'PENDING');
      if (pendingTasks.length > 0) {
        if (highRiskGoal) {
          const highRiskTask = pendingTasks.find((t) => t.task.goalId === highRiskGoal.id);
          if (highRiskTask) return highRiskTask;
        }
        return pendingTasks[0];
      }
    }
    return null;
  }, [todayTasks, highRiskGoal]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden flex flex-col gap-6 animate-fade-in">
      {/* Greeting Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            {greeting}, {userName}.
          </h2>
        </div>
      </div>

      {/* KPI Cards / Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 mb-0.5">Active Goals</div>
            <div className="text-lg font-bold text-slate-900 leading-none">{metrics.activeGoals}</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 mb-0.5">Today's Workload</div>
            <div className="text-lg font-bold text-slate-900 leading-none">{totalHoursToday}h</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 mb-0.5">Next Deadline</div>
            <div className="text-lg font-bold text-slate-900 leading-none">
              {nextDeadline ? formatDate(nextDeadline) : 'None'}
            </div>
          </div>
        </div>
      </div>

      {/* Risk & Recommendation Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Risk Highlight */}
        {highRiskGoal ? (
          <div className="border border-rose-200 bg-rose-50 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-start space-x-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600">High Risk Alert</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 leading-tight">
                  "{highRiskGoal.title}" requires attention due to increasing deadline risk.
                </div>
              </div>
            </div>
            <button
              onClick={() => onSelectGoal(highRiskGoal.id)}
              className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center mt-auto w-fit transition-colors"
            >
              Review Goal Status <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        ) : (
          <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4 flex flex-col justify-center space-y-1">
            <div className="flex items-center space-x-2 text-emerald-600 mb-1">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">All Clear</span>
            </div>
            <div className="text-sm font-medium text-slate-800">
              Your active goals are tracking sustainably towards their deadlines.
            </div>
          </div>
        )}

        {/* Recommended Action */}
        <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-start space-x-3 mb-3">
            <Zap className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">Recommended Action</div>
              {nextTask ? (
                <div>
                  <div className="text-sm font-semibold text-slate-900 leading-tight mb-1">
                    {nextTask.task.title}
                  </div>
                  <div className="text-xs text-indigo-600/80 font-medium">
                    Est. {nextTask.task.estimatedHours}h • {nextTask.block.startTime} - {nextTask.block.endTime}
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-slate-900 leading-tight">
                  You're on track today. Consider planning your next milestone to maintain momentum.
                </div>
              )}
            </div>
          </div>

          {nextTask ? (
            <button
              onClick={() => onSelectGoal(nextTask.task.goalId)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center mt-auto w-fit transition-colors"
            >
              Focus on Task <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          ) : metrics.activeGoals > 0 ? (
            <button
              onClick={() => onSelectGoal(goals[0].id)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center mt-auto w-fit transition-colors"
            >
              Review Schedule <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

