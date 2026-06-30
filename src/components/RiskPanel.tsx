import React from 'react';
import { GoalDetailed } from '../types.ts';
import { Shield, AlertTriangle, CheckCircle, TrendingUp, HelpCircle, Flame, Calendar, Clock } from 'lucide-react';

interface RiskPanelProps {
  goal: GoalDetailed;
  onTriggerRecovery: () => void;
  showRecoveryPlan: boolean;
  loadingRecovery: boolean;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({
  goal,
  onTriggerRecovery,
  showRecoveryPlan,
  loadingRecovery,
}) => {
  const risk = goal.risk || { score: 10, level: 'LOW', reason: 'Tasks proceeding as scheduled.' };

  // Calculate detailed metrics for Explainability
  const allTasks = goal.tasks || [];
  const totalHours = allTasks.reduce((sum, t) => sum + t.estimatedHours, 0) || goal.estimatedHours || 10;
  const completedTasks = allTasks.filter((t) => t.status === 'COMPLETED');
  const completedHours = completedTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const remainingHours = allTasks.filter((t) => t.status !== 'COMPLETED').reduce((sum, t) => sum + t.estimatedHours, 0);
  const missedTasksCount = allTasks.filter((t) => t.status === 'MISSED').length;

  const refDate = new Date();
  const deadlineDate = new Date(goal.deadline);
  const createdDate = new Date(goal.createdAt);

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(1, Math.round((deadlineDate.getTime() - createdDate.getTime()) / msPerDay));
  const remainingDays = Math.max(0.5, (deadlineDate.getTime() - refDate.getTime()) / msPerDay);
  const elapsedDays = Math.max(0.5, (refDate.getTime() - createdDate.getTime()) / msPerDay);

  const remainingDaysRounded = Math.max(1, Math.round(remainingDays));

  // Pace calculations (matches backend Agent math)
  const requiredPace = Number((remainingHours / remainingDays).toFixed(1));
  const calculatedCurrentPace = completedHours / elapsedDays;
  const currentPace = Number((calculatedCurrentPace > 0 ? calculatedCurrentPace : 2.0).toFixed(1));

  // Determine threat expected impact
  const potentialDelayDays = Math.max(0, Math.round((remainingHours / (currentPace || 1)) - remainingDays));

  const riskGaugeColor =
    risk.level === 'HIGH'
      ? 'stroke-rose-500'
      : risk.level === 'MEDIUM'
      ? 'stroke-amber-500'
      : 'stroke-green-500';

  const riskBgColor =
    risk.level === 'HIGH'
      ? 'bg-rose-50/70 border-rose-100 text-rose-800'
      : risk.level === 'MEDIUM'
      ? 'bg-amber-50/70 border-amber-100 text-amber-800'
      : 'bg-green-50/70 border-green-100 text-green-800';

  return (
    <div id="risk-panel-widget" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-xs font-bold tracking-wider uppercase text-slate-400 flex items-center">
          <TrendingUp className="w-4 h-4 mr-1.5 text-slate-500" />
          Risk Assessment
        </h3>
        <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded uppercase ${
          risk.level === 'HIGH' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
          risk.level === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
          'bg-green-100 text-green-700 border border-green-200'
        }`}>
          {risk.level} Risk
        </span>
      </div>

      <div className="flex items-center space-x-6">
        {/* Radial Score Gauge */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center bg-slate-50 rounded-full border border-slate-100 p-1.5" aria-hidden="true">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="44"
              cy="44"
              r="36"
              stroke="#F1F5F9"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="44"
              cy="44"
              r="36"
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray="226.1"
              strokeDashoffset={226.1 - (226.1 * risk.score) / 100}
              className={`${riskGaugeColor} transition-all duration-700 ease-out`}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-xl font-bold text-slate-800 tracking-tighter">
              {risk.score}%
            </span>
            <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">
              Score
            </span>
          </div>
        </div>

        {/* Text Reason Card */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Summary
            </span>
          </div>
          <div className={`px-3 py-2.5 rounded-lg border text-xs font-medium leading-relaxed ${riskBgColor}`}>
            {risk.reason}
          </div>
        </div>
      </div>

      {/* Structured Explainability Breakdown */}
      <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-4 space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">
          Risk Analysis
        </h4>

        {/* Why */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight flex items-center">
            <HelpCircle className="w-3 h-3 text-indigo-500 mr-1" />
            Why Risk is {risk.level}:
          </div>
          <p className="text-xs text-slate-600 pl-4 font-medium leading-relaxed">
            {risk.level === 'HIGH' 
              ? `The risk is elevated due to ${missedTasksCount > 0 ? `${missedTasksCount} missed task(s) and ` : ''}an imbalance between the effort required to meet the deadline and your historical productivity pace.` 
              : risk.level === 'MEDIUM' 
              ? 'Moderate risk is detected as remaining workload requires a highly focused effort that slightly exceeds baseline pace.' 
              : 'The project is in a healthy state with ample buffer time and a sustainable daily work pace.'}
          </p>
        </div>

        {/* Evidence */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight flex items-center">
            <CheckCircle className="w-3 h-3 text-emerald-500 mr-1" />
            Evidence Metrics:
          </div>
          <div className="grid grid-cols-2 gap-3 pl-4">
            <div className="bg-white border border-slate-150 rounded-lg p-2 flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase">Remaining Work</div>
                <div className="text-xs font-bold text-slate-700">{remainingHours} hours</div>
              </div>
            </div>
            <div className="bg-white border border-slate-150 rounded-lg p-2 flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase">Remaining Time</div>
                <div className="text-xs font-bold text-slate-700">{remainingDaysRounded} days</div>
              </div>
            </div>
            <div className="bg-white border border-slate-150 rounded-lg p-2 flex items-center space-x-2">
              <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase">Required Pace</div>
                <div className="text-xs font-bold text-slate-700">{requiredPace}h/day</div>
              </div>
            </div>
            <div className="bg-white border border-slate-150 rounded-lg p-2 flex items-center space-x-2">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase">Current Pace</div>
                <div className="text-xs font-bold text-slate-700">{currentPace}h/day</div>
              </div>
            </div>
          </div>
        </div>

        {/* Expected Impact */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight flex items-center">
            <AlertTriangle className="w-3 h-3 text-amber-500 mr-1" />
            Expected Impact:
          </div>
          <p className="text-xs text-slate-600 pl-4 font-medium leading-relaxed">
            {potentialDelayDays > 0 
              ? `At your current velocity of ${currentPace}h/day, the final deadline of ${new Date(goal.deadline).toLocaleDateString()} will be missed by approximately ${potentialDelayDays} days.` 
              : `At your current velocity of ${currentPace}h/day, you are on track to meet the deadline. Keeping a buffer is advised.`}
          </p>
        </div>
      </div>

      {/* Trigger Recovery Agent Advisor */}
      {(risk.score > 50 || goal.tasks.some((t) => t.status === 'MISSED')) && !showRecoveryPlan && (
        <div className="pt-2">
          <button
            type="button"
            id="btn-invoke-recovery"
            onClick={onTriggerRecovery}
            disabled={loadingRecovery}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-all duration-200 transform active:scale-[0.98] shadow-sm disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-rose-900 focus-visible:ring-offset-2 min-h-[44px]"
          >
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            {loadingRecovery ? 'Generating Recovery Plan...' : 'Generate Recovery Plan'}
          </button>
        </div>
      )}
    </div>
  );
};
