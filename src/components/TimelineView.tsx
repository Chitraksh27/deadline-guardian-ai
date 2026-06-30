import React from 'react';
import { GoalDetailed } from '../types.ts';

interface TimelineViewProps {
  goal: GoalDetailed;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ goal }) => {
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
    <div id="timeline-view-container" className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
      {sortedDates.map((date) => {
        const dayBlocks = blocksByDate[date];
        return (
          <div key={date} className="border-l-2 border-slate-100 pl-4 space-y-2 relative pb-2">
            {/* Timeline Dot Indicator */}
            <div className="absolute w-2.5 h-2.5 rounded-full bg-slate-300 -left-[6px] top-1.5" />
            
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
              <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                {new Date(date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            
            <div className="space-y-2">
              {dayBlocks.map((block) => {
                const taskObj = goal.tasks.find((t) => t.id === block.taskId);
                const scheduledTimeStr = '18:00 - 21:00'; // Default window standard in algorithm

                const blockStatusColor =
                  block.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-700'
                    : block.status === 'MISSED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-600';

                return (
                  <div
                    key={block.id}
                    className="flex items-center justify-between bg-slate-50/50 border border-slate-100/80 rounded-lg p-2.5 text-xs font-medium hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-0.5 pr-2">
                      <span className="text-slate-800 font-semibold">{taskObj?.title || 'Unknown Task'}</span>
                      <div className="text-slate-400 text-[10px] font-mono">
                        {scheduledTimeStr}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded font-mono shrink-0 ${blockStatusColor}`}>
                      {block.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
