import React from 'react';
import { RecoveryPlan } from '../types.ts';
import { Shield, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface RecoveryPanelProps {
  recoveryPlan: RecoveryPlan | null;
  onApplyRecovery: () => void;
  onDismissRecovery: () => void;
  loadingApply: boolean;
}

export const RecoveryPanel: React.FC<RecoveryPanelProps> = ({
  recoveryPlan,
  onApplyRecovery,
  onDismissRecovery,
  loadingApply,
}) => {
  if (!recoveryPlan) return null;

  return (
    <div id="recovery-panel-widget" className="bg-rose-50/60 border border-rose-200 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-rose-200 pb-2.5">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-rose-600 animate-pulse" />
          <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">
            Recovery Recommendations
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-100 text-rose-700 rounded font-semibold border border-rose-200">
          Forecast: {recoveryPlan.riskBefore}% → {recoveryPlan.riskAfter}% Risk
        </span>
      </div>

      {/* AI Recommendation Explainability Breakdown */}
      <div className="bg-white/80 border border-rose-100 rounded-lg p-3 space-y-2.5">
        <div className="flex items-center space-x-1.5 text-rose-800">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Strategy Summary</span>
        </div>
        
        <div className="space-y-3 text-xs font-medium">
          {recoveryPlan.recommendations.map((rec, idx) => (
            <div key={idx} className="flex items-start space-x-2">
              <span className="text-rose-400 mt-0.5">•</span>
              <p className="text-rose-900 font-normal leading-relaxed text-[11px] flex-1">
                {rec}
              </p>
            </div>
          ))}

          <div>
            <span className="text-rose-700 font-bold block text-[10px] uppercase mt-4">Expected Impact:</span>
            <p className="text-rose-900 font-semibold leading-relaxed text-[11px]">
              Applying this plan will drop overall failure risk by {(recoveryPlan.riskBefore - recoveryPlan.riskAfter).toFixed(0)}% and reschedule your task sequences to prevent overlapping bottlenecks.
            </p>
          </div>
        </div>
      </div>

      {/* Concrete Recommendations List */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Recommended Adjustments:</span>
        <ul className="space-y-2 text-xs text-rose-900 font-semibold pl-1">
          {recoveryPlan.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start bg-rose-100/40 p-2 rounded-lg border border-rose-100">
              <span className="text-rose-600 mr-2 shrink-0 font-extrabold">•</span>
              <span className="text-rose-950 font-medium leading-normal">{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex space-x-3 pt-1">
        <button
          id="btn-apply-recovery"
          onClick={onApplyRecovery}
          disabled={loadingApply}
          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-rose-900 focus-visible:ring-offset-2 min-h-[44px]"
        >
          {loadingApply ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Rescheduling...</span>
            </>
          ) : (
            <span>Apply & Reschedule Plan</span>
          )}
        </button>
        <button
          id="btn-dismiss-recovery"
          onClick={onDismissRecovery}
          className="px-3.5 py-2 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-xs transition-colors focus-visible:ring-2 focus-visible:ring-rose-900 min-h-[44px]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
