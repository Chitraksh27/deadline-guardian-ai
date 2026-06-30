import React from 'react';
import { GoalDetailed } from '../types.ts';

interface GanttChartProps {
  goal: GoalDetailed;
}

export const GanttChart: React.FC<GanttChartProps> = ({ goal }) => {
  const blocksByDate = goal.schedule.reduce((acc, block) => {
    const date = block.scheduledDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(block);
    return acc;
  }, {} as Record<string, typeof goal.schedule>);

  const sortedDates = Object.keys(blocksByDate).sort();

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-xs font-medium">
        No blocks allocated. Use "Regenerate Schedule" to plan your tasks.
      </div>
    );
  }

  return (
    <div id="gantt-chart-container" className="overflow-x-auto border border-slate-100 rounded-lg max-h-[350px]">
      <table className="w-full text-left border-collapse min-w-[360px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="p-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-32 shrink-0 border-r border-slate-100 sticky left-0 bg-slate-50 z-10">
              Tasks
            </th>
            {sortedDates.map((date) => (
              <th key={date} className="p-2 text-center text-[9px] font-mono font-bold text-slate-500 min-w-[55px] border-r border-slate-100 last:border-r-0">
                {new Date(date).toLocaleDateString(undefined, {
                  month: 'numeric',
                  day: 'numeric',
                })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {goal.tasks.map((task) => {
            return (
              <tr key={task.id} className="hover:bg-slate-50/50">
                <td className="p-2.5 text-[11px] font-semibold text-slate-700 max-w-[120px] truncate border-r border-slate-100 sticky left-0 bg-white hover:bg-slate-50 z-10" title={task.title}>
                  {task.title}
                </td>
                {sortedDates.map((date) => {
                  const block = goal.schedule.find(
                    (b) => b.taskId === task.id && b.scheduledDate === date
                  );

                  if (!block) {
                    return (
                      <td key={date} className="p-2 border-r border-slate-100 last:border-r-0 bg-slate-50/10">
                        <div className="h-4" />
                      </td>
                    );
                  }

                  // Find how many hours are scheduled in this block
                  const hoursScheduled = block.endTime && block.startTime 
                    ? Math.round((new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 3600000)
                    : 3; // fallback to default

                  const blockColor =
                    block.status === 'COMPLETED'
                      ? 'bg-green-500 text-white'
                      : block.status === 'MISSED'
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-800 text-white';

                  return (
                    <td key={date} className="p-1 border-r border-slate-100 last:border-r-0">
                      <div
                        className={`rounded py-1 px-1.5 text-center text-[9px] font-bold tracking-tight shadow-sm cursor-help ${blockColor}`}
                        title={`${task.title} — ${block.status} (${hoursScheduled} hrs scheduled)`}
                      >
                        {hoursScheduled}h
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
