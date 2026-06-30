import React, { useState } from 'react';
import { GoalDetailed } from '../types.ts';
import { ArrowLeft, RefreshCw, Play, Loader2, Trash2 } from 'lucide-react';

interface GoalHeaderProps {
  goal: GoalDetailed;
  onBack: () => void;
  onRegeneratePlan: () => Promise<void> | void;
  onRegenerateSchedule: () => Promise<void> | void;
  onDeleteGoal?: (goalId: string) => Promise<void> | void;
}

export const GoalHeader: React.FC<GoalHeaderProps> = ({
  goal,
  onBack,
  onRegeneratePlan,
  onRegenerateSchedule,
  onDeleteGoal,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const totalTasks = goal.tasks.length;
  const completedTasks = goal.tasks.filter((t) => t.status === 'COMPLETED').length;
  const missedTasks = goal.tasks.filter((t) => t.status === 'MISSED').length;
  const pendingTasks = goal.tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'MISSED').length;

  const percentCompleted = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const percentMissed = totalTasks > 0 ? Math.round((missedTasks / totalTasks) * 100) : 0;
  const percentPending = totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0;

  const handleAction = async (actionName: string, fn: () => Promise<any> | any) => {
    setLoadingAction(actionName);
    try {
      await fn();
    } catch (err) {
      console.error(`Error in ${actionName}:`, err);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div id="goal-header-container" className="space-y-6">
      {/* 1. Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-to-dashboard"
          onClick={onBack}
          className="flex items-center text-sm font-medium text-slate-500 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 rounded min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>
        <div className="flex space-x-3">
          {onDeleteGoal && (
            showConfirmDelete ? (
              <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 rounded-lg px-2">
                <span className="text-xs font-medium text-rose-700">Delete goal?</span>
                <button
                  onClick={() => handleAction('deleteGoal', () => onDeleteGoal(goal.id))}
                  disabled={loadingAction !== null}
                  className="px-2 py-1 bg-rose-600 text-white rounded text-xs font-medium hover:bg-rose-700 disabled:opacity-50 flex items-center focus-visible:ring-2 focus-visible:ring-rose-900 min-h-[44px] sm:min-h-[auto]"
                >
                  {loadingAction === 'deleteGoal' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yes'}
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={loadingAction !== null}
                  className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs font-medium focus-visible:ring-2 focus-visible:ring-slate-900 min-h-[44px] sm:min-h-[auto] rounded"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                id="btn-delete-goal"
                onClick={() => setShowConfirmDelete(true)}
                disabled={loadingAction !== null}
                className="px-3 py-1.5 border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 font-medium text-xs rounded-lg flex items-center transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-rose-900 min-h-[44px]"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Goal
              </button>
            )
          )}
          <button
            id="btn-regenerate-plan"
            onClick={() => handleAction('regeneratePlan', onRegeneratePlan)}
            disabled={loadingAction !== null}
            className="px-3 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium text-xs rounded-lg flex items-center transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-900 min-h-[44px]"
          >
            {loadingAction === 'regeneratePlan' ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            )}
            Regenerate Plan
          </button>
          <button
            id="btn-optimize-schedule"
            onClick={() => handleAction('regenerateSchedule', onRegenerateSchedule)}
            disabled={loadingAction !== null}
            className="px-3 py-1.5 bg-black text-white hover:bg-slate-800 font-medium text-xs rounded-lg flex items-center transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 min-h-[44px]"
          >
            {loadingAction === 'regenerateSchedule' ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
            )}
            Regenerate Schedule
          </button>
        </div>
      </div>

      {/* 2. Goal Detail Space Banner */}
      <div id="goal-detail-banner" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Goal Details
            </span>
            <h2 className="text-2xl font-light tracking-tight text-slate-900 mt-0.5">
              Goal: <span className="font-semibold">{goal.title}</span>
            </h2>
          </div>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
            {goal.status}
          </span>
        </div>
        <p className="text-sm text-slate-500 font-medium italic mt-2">
          {goal.description || 'No description provided.'}
        </p>
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span id="progress-label">Progress</span>
            <span>{percentCompleted}% Complete</span>
          </div>
          <div 
            className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex"
            role="progressbar"
            aria-labelledby="progress-label"
            aria-valuenow={percentCompleted}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {percentCompleted > 0 && (
              <div
                style={{ width: `${percentCompleted}%` }}
                className="h-full bg-green-500 transition-all duration-500"
                title={`${completedTasks} Tasks Completed`}
              />
            )}
            {percentMissed > 0 && (
              <div
                style={{ width: `${percentMissed}%` }}
                className="h-full bg-rose-500 transition-all duration-500"
                title={`${missedTasks} Tasks Missed`}
              />
            )}
            {percentPending > 0 && (
              <div
                style={{ width: `${percentPending}%` }}
                className="h-full bg-slate-300 transition-all duration-500"
                title={`${pendingTasks} Tasks Pending`}
              />
            )}
          </div>
          <div className="flex justify-start space-x-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-0.5">
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
              Completed: {completedTasks}
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5" />
              Missed: {missedTasks}
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-slate-300 mr-1.5" />
              Pending: {pendingTasks}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-4 gap-6 text-xs text-slate-400 font-medium">
          <div>
            Deadline:{' '}
            <span className="text-slate-800 font-semibold">
              {new Date(goal.deadline).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div>
            Complexity Level:{' '}
            <span className="text-slate-800 font-semibold uppercase">{goal.complexity}</span>
          </div>
          <div>
            Estimated Commitment:{' '}
            <span className="text-slate-800 font-semibold">{goal.estimatedHours} hours</span>
          </div>
          <div>
            Tasks:{' '}
            <span className="text-slate-800 font-semibold">{totalTasks}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
