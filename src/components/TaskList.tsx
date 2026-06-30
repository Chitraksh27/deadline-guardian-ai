import React from 'react';
import { GoalDetailed, Task } from '../types.ts';
import { CheckCircle, AlertTriangle, PlayCircle, Loader2, ListChecks, HelpCircle } from 'lucide-react';

interface TaskListProps {
  goal: GoalDetailed;
  onCompleteTask: (taskId: string) => void;
  onMissTask: (taskId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  goal,
  onCompleteTask,
  onMissTask,
}) => {
  return (
    <div id="task-list-panel" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[500px] animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h3 className="text-xs font-bold tracking-wider uppercase text-slate-400 flex items-center">
          <ListChecks className="w-4 h-4 mr-1.5 text-slate-500" />
          Tasks
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold border border-slate-200">
          {goal.tasks.length} Tasks Total
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {goal.tasks.length === 0 ? (
          /* Polished Empty State */
          <div className="flex flex-col items-center justify-center text-center py-24 space-y-3">
            <div className="p-3 bg-slate-50 rounded-full border border-slate-150 text-slate-400">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">No Tasks</h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed mx-auto font-medium">
                No tasks have been generated for this goal yet. Click "Regenerate Schedule" to plan your tasks.
              </p>
            </div>
          </div>
        ) : (
          goal.tasks.map((task) => {
            const isCompleted = task.status === 'COMPLETED';
            const isMissed = task.status === 'MISSED';

            return (
              <div
                key={task.id}
                id={`task-item-${task.id}`}
                className={`border rounded-xl p-4 transition-all duration-200 ${
                  isCompleted
                    ? 'border-emerald-100 bg-emerald-50/10'
                    : isMissed
                    ? 'border-rose-100 bg-rose-50/10'
                    : 'border-slate-150 bg-slate-50/30 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <h4
                        className={`text-xs font-bold leading-normal ${
                          isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'
                        }`}
                      >
                        {task.title}
                      </h4>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono rounded-md bg-slate-100 text-slate-500 border border-slate-200 font-bold">
                        {task.estimatedHours}h
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{task.description}</p>
                    {(() => {
                      const dependsOnTasks = (goal.dependencies || [])
                        .filter((d) => d.taskId === task.id)
                        .map((d) => goal.tasks.find((t) => t.id === d.dependsOnTaskId))
                        .filter((t): t is Exclude<typeof t, undefined> => !!t);

                      if (dependsOnTasks.length === 0) return null;

                      return (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-1.5 border-t border-dashed border-slate-100">
                          <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Prerequisites:</span>
                          {dependsOnTasks.map((depTask) => {
                            const isDepCompleted = depTask.status === 'COMPLETED';
                            return (
                              <span
                                key={depTask.id}
                                className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold rounded-md border ${
                                  isDepCompleted
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : 'bg-amber-50 text-amber-700 border-amber-150'
                                }`}
                              >
                                {depTask.title}
                                {isDepCompleted ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1.5" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1.5 animate-pulse" />
                                )}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="flex items-center space-x-2 shrink-0 self-center">
                    {!isCompleted && !isMissed && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onMissTask(task.id)}
                          aria-label={`Mark task ${task.title} as missed`}
                          className="px-2.5 py-1 text-[10px] border border-rose-200 text-rose-600 bg-rose-50/30 hover:bg-rose-50 rounded-lg transition-colors font-bold transform active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500 min-h-[44px] sm:min-h-[auto]"
                        >
                          Missed
                        </button>
                        <button
                          onClick={() => onCompleteTask(task.id)}
                          aria-label={`Complete task ${task.title}`}
                          className="px-2.5 py-1 text-[10px] bg-slate-900 hover:bg-black text-white rounded-lg transition-colors font-bold transform active:scale-95 shadow-sm focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-[auto]"
                        >
                          Complete
                        </button>
                      </div>
                    )}
                    {isCompleted && (
                      <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                        <CheckCircle className="w-3 h-3 mr-1 text-emerald-500 fill-emerald-50" />
                        Completed
                      </span>
                    )}
                    {isMissed && (
                      <span className="flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                        <AlertTriangle className="w-3 h-3 mr-1 text-rose-500" />
                        Missed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
