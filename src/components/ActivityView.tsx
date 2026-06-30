import React, { useState } from "react";
import { AgentLog } from "../types.ts";
import {
  Cpu,
  Terminal,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Search,
  Info,
  Loader2,
} from "lucide-react";

interface ActivityViewProps {
  logs: AgentLog[];
  loading: boolean;
}

export const ActivityView: React.FC<ActivityViewProps> = React.memo(
  ({ logs, loading }) => {
    const [activeTab, setActiveTab] = useState<'recent' | 'decisions' | 'notifications' | 'diagnostics'>('diagnostics');
    const [selectedLog, setSelectedLog] = useState<AgentLog | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAgent, setSelectedAgent] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const filteredLogs = logs.filter((log) => {
      const matchesSearch =
        log.inputPayload.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.outputPayload.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.agentName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAgent =
        selectedAgent === "ALL" || log.agentName === selectedAgent;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "SUCCESS" && log.success) ||
        (statusFilter === "FAILURE" && !log.success);

      return matchesSearch && matchesAgent && matchesStatus;
    });

    const getAgentLabel = (name: string) => {
      switch (name) {
        case "GOAL_AGENT":
          return {
            label: "Goal Analysis",
            bg: "bg-green-50 text-green-700 border-green-100",
          };
        case "PLANNING_AGENT":
          return {
            label: "Step Planning",
            bg: "bg-blue-50 text-blue-700 border-blue-100",
          };
        case "SCHEDULING_AGENT":
          return {
            label: "Time Allocation",
            bg: "bg-purple-50 text-purple-700 border-purple-100",
          };
        case "RISK_ENGINE":
          return {
            label: "Deadline Risk",
            bg: "bg-amber-50 text-amber-700 border-amber-100",
          };
        case "RECOVERY_AGENT":
          return {
            label: "Recovery Plan",
            bg: "bg-rose-50 text-rose-700 border-rose-100",
          };
        default:
          return {
            label: name,
            bg: "bg-slate-50 text-slate-700 border-slate-100",
          };
      }
    };

    return (
      <div className="flex flex-col h-full space-y-6 pb-8">
        <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Left side: Logs Table */}
          <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Diagnostics
                </span>
                <h3 className="text-sm font-semibold tracking-tight uppercase text-slate-800 mt-0.5">
                  Execution Logs
                </h3>
              </div>
              {loading && (
                <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
              )}
            </div>

          {/* Search and Filters Bar */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search logs..."
                aria-label="Search logs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 font-medium text-slate-800"
              />
            </div>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              aria-label="Filter by Service"
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 font-medium text-slate-800 cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              <option value="GOAL_AGENT">Goal Analysis</option>
              <option value="PLANNING_AGENT">Step Planning</option>
              <option value="SCHEDULING_AGENT">Time Allocation</option>
              <option value="RISK_ENGINE">Deadline Risk</option>
              <option value="RECOVERY_AGENT">Recovery Plan</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 font-medium text-slate-800 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <div className="text-center py-24 text-slate-400 text-xs font-medium">
                No activity available. Create a new goal or update tasks to
                get started.
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-24 text-slate-400 text-xs font-medium">
                No logs match your current search and filter settings.
              </div>
            ) : (
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                      <th className="p-3">Action</th>
                      <th className="p-3">Result</th>
                      <th className="p-3 text-right">Duration</th>
                      <th className="p-3 text-right">Timestamp</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                    {filteredLogs.map((log) => {
                      const agentMeta = getAgentLabel(log.agentName);
                      const isSelected = selectedLog?.id === log.id;

                      return (
                        <tr
                          key={log.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedLog(log)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedLog(log);
                            }
                          }}
                          aria-selected={isSelected}
                          className={`hover:bg-slate-50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 ${
                            isSelected ? "bg-slate-50" : ""
                          }`}
                        >
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-tight ${agentMeta.bg}`}
                            >
                              {agentMeta.label}
                            </span>
                          </td>
                          <td className="p-3">
                            {log.success ? (
                              <span className="flex items-center text-green-600 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-500 fill-current text-white" />
                                SUCCESS
                              </span>
                            ) : (
                              <span className="flex items-center text-red-600 text-[11px]">
                                <XCircle className="w-3.5 h-3.5 mr-1 text-red-500" />
                                FAILURE
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-400 text-[11px]">
                            {log.executionTimeMs}ms
                          </td>
                          <td className="p-3 text-right text-slate-400 text-[10px]">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="p-3 text-right">
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 inline" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Payloads Inspector Card */}
        <div className="col-span-1">
          {selectedLog ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 flex flex-col h-full overflow-hidden max-h-[550px]">
              <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                <Terminal className="w-4 h-4 text-slate-800" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Log Details
                </h4>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto text-xs pr-1">
                {/* Info Card */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-1 text-[11px] font-medium text-slate-500">
                  <div>
                    LOG ID:{" "}
                    <span className="text-slate-800 font-mono">
                      {selectedLog.id}
                    </span>
                  </div>
                  <div>
                    ACTION:{" "}
                    <span className="text-slate-800">
                      {getAgentLabel(selectedLog.agentName).label}
                    </span>
                  </div>
                  <div>
                    DURATION:{" "}
                    <span className="text-slate-800">
                      {selectedLog.executionTimeMs} ms
                    </span>
                  </div>
                </div>

                {/* Input Payload */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Request
                  </span>
                  <pre className="bg-slate-950 text-slate-200 p-3.5 rounded-lg font-mono text-[10px] leading-relaxed overflow-x-auto shadow-inner border border-slate-900 max-h-40 overflow-y-auto">
                    {JSON.stringify(
                      JSON.parse(selectedLog.inputPayload),
                      null,
                      2,
                    )}
                  </pre>
                </div>

                {/* Output Payload */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Response
                  </span>
                  <pre className="bg-slate-950 text-green-400 p-3.5 rounded-lg font-mono text-[10px] leading-relaxed overflow-x-auto shadow-inner border border-slate-900 max-h-56 overflow-y-auto">
                    {JSON.stringify(
                      JSON.parse(selectedLog.outputPayload),
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-100/50 border border-slate-200 border-dashed rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center text-slate-400 h-64">
              <Info className="w-8 h-8 mb-2.5 text-slate-300" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                No Log Selected
              </h4>
              <p className="text-[11px] mt-1 text-slate-400 font-medium">
                Select a log entry to view its details.
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    );
  },
);
