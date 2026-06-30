import React, { useState } from 'react';
import { GoalDetailed, RecoveryPlan } from '../types.ts';
import { GoalHeader } from './GoalHeader.tsx';
import { TaskList } from './TaskList.tsx';
import { RiskPanel } from './RiskPanel.tsx';
import { RecoveryPanel } from './RecoveryPanel.tsx';
import { WorkspacePanel } from './WorkspacePanel.tsx';
import { GanttChart } from './GanttChart.tsx';
import { TimelineView } from './TimelineView.tsx';

interface GoalDetailsViewProps {
  goal: GoalDetailed;
  onBack: () => void;
  onCompleteTask: (taskId: string) => void;
  onMissTask: (taskId: string) => void;
  onRegeneratePlan: () => Promise<void> | void;
  onRegenerateSchedule: () => Promise<void> | void;
  onGenerateRecovery: (score: number) => Promise<RecoveryPlan>;
  onDeleteGoal?: (goalId: string) => Promise<void> | void;
}

export const GoalDetailsView: React.FC<GoalDetailsViewProps> = React.memo(({
  goal,
  onBack,
  onCompleteTask,
  onMissTask,
  onRegeneratePlan,
  onRegenerateSchedule,
  onGenerateRecovery,
  onDeleteGoal,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryPlan, setRecoveryPlan] = useState<RecoveryPlan | null>(null);
  const [showRecoveryPlan, setShowRecoveryPlan] = useState(false);
  const [scheduleViewMode, setScheduleViewMode] = useState<'timeline' | 'gantt'>('gantt');

  const handleAction = async (actionName: string, fn: () => Promise<any> | any) => {
    setLoadingAction(actionName);
    setError(null);
    try {
      await fn();
    } catch (err: any) {
      console.error(`Error in action ${actionName}:`, err);
      setError(err.message || `An error occurred while trying to perform ${actionName}.`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTriggerRecovery = async () => {
    handleAction('recovery', async () => {
      const plan = await onGenerateRecovery(goal.risk?.score || 50);
      setRecoveryPlan(plan);
      setShowRecoveryPlan(true);
    });
  };

  const applyRecovery = async () => {
    handleAction('applyRecovery', async () => {
      // Re-trigger scheduling sequence
      await onRegenerateSchedule();
      setRecoveryPlan(null);
      setShowRecoveryPlan(false);
    });
  };

  return (
    <div id="goal-details-view" className="space-y-6 overflow-y-auto pr-2 max-h-full pb-10">
      
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-800 shadow-sm animate-fade-in">
          {error}
        </div>
      )}

      {/* 1. Header & Banner */}
      <GoalHeader
        goal={goal}
        onBack={onBack}
        onRegeneratePlan={() => handleAction('regeneratePlan', onRegeneratePlan)}
        onRegenerateSchedule={() => handleAction('regenerateSchedule', onRegenerateSchedule)}
        onDeleteGoal={onDeleteGoal}
      />

      {/* 2. Main Split View Grid */}
      <div className="grid grid-cols-5 gap-6">
        {/* Left Column: Task Sequencer */}
        <div className="col-span-3">
          <TaskList
            goal={goal}
            onCompleteTask={onCompleteTask}
            onMissTask={onMissTask}
          />
        </div>

        {/* Right Column: Risk & Collaboration Controls */}
        <div className="col-span-2 space-y-6">
          {/* Risk assessment section */}
          <RiskPanel
            goal={goal}
            onTriggerRecovery={handleTriggerRecovery}
            showRecoveryPlan={showRecoveryPlan}
            loadingRecovery={loadingAction === 'recovery'}
          />

          {/* Recovery advice panel */}
          <RecoveryPanel
            recoveryPlan={recoveryPlan}
            onApplyRecovery={applyRecovery}
            onDismissRecovery={() => setShowRecoveryPlan(false)}
            loadingApply={loadingAction === 'applyRecovery'}
          />


          {/* Workspace collaboration panel */}
          <WorkspacePanel goal={goal} />

          {/* Schedule Visualization panel */}
          <div id="schedule-visualization" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold tracking-tight uppercase text-slate-400">
                Schedule
              </h3>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  id="btn-switch-gantt"
                  onClick={() => setScheduleViewMode('gantt')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    scheduleViewMode === 'gantt'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Gantt Chart
                </button>
                <button
                  type="button"
                  id="btn-switch-timeline"
                  onClick={() => setScheduleViewMode('timeline')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    scheduleViewMode === 'timeline'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  List View
                </button>
              </div>
            </div>

            {scheduleViewMode === 'gantt' ? (
              <GanttChart goal={goal} />
            ) : (
              <TimelineView goal={goal} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
