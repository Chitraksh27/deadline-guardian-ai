import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import {
  Goal,
  GoalDetailed,
  DashboardMetrics,
  Task,
  ScheduleBlock,
  AgentLog,
  RecoveryPlan,
  Workspace,
} from "./types.ts";
import { AgentStatusSidebar } from "./components/AgentStatusSidebar.tsx";
import {
  RefreshCw,
  Bell,
  ChevronDown,
  Loader2,
  ChevronRight,
  Target,
} from "lucide-react";

const DashboardView = lazy(() =>
  import("./components/DashboardView.tsx").then((module) => ({
    default: module.DashboardView,
  })),
);
const GoalDetailsView = lazy(() =>
  import("./components/GoalDetailsView.tsx").then((module) => ({
    default: module.GoalDetailsView,
  })),
);
const CreateGoalView = lazy(() =>
  import("./components/CreateGoalView.tsx").then((module) => ({
    default: module.CreateGoalView,
  })),
);
const ActivityView = lazy(() =>
  import("./components/ActivityView.tsx").then((module) => ({
    default: module.ActivityView,
  })),
);
const SettingsView = lazy(() =>
  import("./components/SettingsView.tsx").then((module) => ({
    default: module.SettingsView,
  })),
);

import { LoginView } from "./components/LoginView.tsx";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem("guardian_auth_token");
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [currentView, setView] = useState<
    "dashboard" | "goals" | "create" | "audit" | "settings" | "preferences"
  >("dashboard");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<GoalDetailed | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeGoals: 0,
    tasksToday: 0,
    completedTasks: 0,
    highRiskGoals: 0,
  });
  const [todayTasks, setTodayTasks] = useState<
    Array<{ task: Task; block: ScheduleBlock }>
  >([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );

  // User state wired to the real auth backend
  const [currentUser, setCurrentUser] = useState<any>({
    name: "",
    initials: "",
    workspaceName: "",
  });

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Dynamic reference date from client current date
  const referenceDate = new Date().toISOString().split("T")[0];

  // Retrieve token
  const getAuthHeader = () => {
    const token = localStorage.getItem("guardian_auth_token") || "";
    return { Authorization: `Bearer ${token}` };
  };

  const fetchDashboardData = async (workspaceId: string | null = selectedWorkspaceId) => {
    setLoading(true);
    try {
      const headers = getAuthHeader();
      const workspaceQuery = workspaceId ? `&workspaceId=${workspaceId}` : '';

      const [mRes, gRes, lRes, wRes, uRes] = await Promise.all([
        fetch(`/api/dashboard?referenceDate=${referenceDate}${workspaceQuery}`, { headers }),
        fetch("/api/goals", { headers }),
        fetch("/api/agents/logs", { headers }),
        fetch("/api/workspaces", { headers }),
        fetch("/api/me", { headers }),
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (gRes.ok) setGoals(await gRes.json());
      if (lRes.ok) setLogs(await lRes.json());
      if (wRes.ok) setWorkspaces(await wRes.json());

      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData.success && uData.user) {
          const userName =
            uData.user.name ||
            uData.user.email?.split("@")[0] ||
            "Unknown User";
          const initials = userName
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

          setCurrentUser((prev: any) => ({
            ...uData.user,
            initials: initials,
            workspaceName: prev.workspaceName
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedGoalDetail = async (goalId: string) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`/api/goals/${goalId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSelectedGoal(data);
      }
    } catch (err) {
      console.error("Error fetching goal details:", err);
    }
  };

  // Build the list of today's focused tasks dynamically
  useEffect(() => {
    if (selectedGoalId) {
      fetchSelectedGoalDetail(selectedGoalId);
    }
  }, [selectedGoalId]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update user workspace name based on selected workspace
  useEffect(() => {
    if (selectedWorkspaceId && workspaces.length > 0) {
      const ws = workspaces.find((w) => w.id === selectedWorkspaceId);
      if (ws) {
        setCurrentUser((prev) => ({ ...prev, workspaceName: ws.name }));
      }
    } else {
      setCurrentUser((prev) => ({ ...prev, workspaceName: "Personal Space" }));
    }
  }, [selectedWorkspaceId, workspaces]);

  // Fetch focus tasks scheduled for today via a single optimized backend query
  useEffect(() => {
    let active = true;
    const fetchTodayFocus = async () => {
      try {
        const headers = getAuthHeader();
        const res = await fetch(
          `/api/dashboard/today-focus?referenceDate=${referenceDate}`,
          { headers },
        );
        if (res.ok && active) {
          const data = await res.json();
          if (data.success && data.tasks) {
            setTodayTasks(data.tasks);
          }
        }
      } catch (err) {
        console.error("Error fetching today focus:", err);
      }
    };
    if (goals.length > 0) {
      fetchTodayFocus();
    } else {
      setTodayTasks([]);
    }
    return () => {
      active = false;
    };
  }, [goals, referenceDate]);

  // Actions
  const handleIntakeGoal = async (rawText: string) => {
    try {
      const headers = getAuthHeader();
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ goal: rawText, referenceDate }),
      });
      if (res.ok) {
        const result = await res.json();
        await fetchDashboardData();
        if (result.success && result.data.goalId) {
          setSelectedGoalId(result.data.goalId);
          setView("goals");
        }
        return result;
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setActionLoading(true);
    try {
      const headers = getAuthHeader();
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ referenceDate }),
      });
      if (res.ok) {
        await fetchDashboardData();
        if (selectedGoalId) {
          await fetchSelectedGoalDetail(selectedGoalId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMissTask = async (taskId: string) => {
    setActionLoading(true);
    try {
      const headers = getAuthHeader();
      const res = await fetch(`/api/tasks/${taskId}/missed`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ referenceDate }),
      });
      if (res.ok) {
        await fetchDashboardData();
        if (selectedGoalId) {
          await fetchSelectedGoalDetail(selectedGoalId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    setActionLoading(true);
    try {
      const headers = getAuthHeader();
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        await fetchDashboardData();
        setSelectedGoalId(null);
        setView("dashboard");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegeneratePlan = async () => {
    if (!selectedGoalId) return;
    try {
      const headers = getAuthHeader();
      const res = await fetch(`/api/goals/${selectedGoalId}/plan`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ referenceDate }),
      });
      if (res.ok) {
        await fetchSelectedGoalDetail(selectedGoalId);
        await fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegenerateSchedule = async () => {
    if (!selectedGoalId) return;
    try {
      const headers = getAuthHeader();
      const res = await fetch(`/api/goals/${selectedGoalId}/schedule`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ referenceDate }),
      });
      if (res.ok) {
        await fetchSelectedGoalDetail(selectedGoalId);
        await fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateRecovery = async (score: number) => {
    if (!selectedGoalId) throw new Error("No selected goal");
    const headers = getAuthHeader();
    const res = await fetch(`/api/goals/${selectedGoalId}/recovery`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ currentRiskScore: score, referenceDate }),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error("Failed to generate recovery plan");
  };

  const handleWorkspaceSwitch = (workspaceId: string | null) => {
    setSelectedWorkspaceId(workspaceId);
    setSelectedGoalId(null);
    setView("dashboard");
    fetchDashboardData(workspaceId);
  };

  const filteredGoals = useMemo(() => {
    return selectedWorkspaceId
      ? goals.filter((g) => g.workspaceId === selectedWorkspaceId)
      : goals.filter((g) => !g.workspaceId);
  }, [goals, selectedWorkspaceId]);

  const filteredTodayTasks = useMemo(() => {
    return todayTasks.filter((t) =>
      filteredGoals.some((g) => g.id === t.task.goalId),
    );
  }, [todayTasks, filteredGoals]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => 
      !log.goalId || filteredGoals.some((g) => g.id === log.goalId)
    );
  }, [logs, filteredGoals]);

  const filteredMetrics = useMemo(() => {
    return {
      activeGoals: filteredGoals.filter((g) => g.status === "ACTIVE").length,
      tasksToday: filteredTodayTasks.length,
      completedTasks: metrics.completedTasks,
      highRiskGoals: filteredGoals.filter((g) => g.risk && g.risk.score > 50)
        .length,
    };
  }, [filteredGoals, filteredTodayTasks, metrics.completedTasks]);

  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-900 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Signing out securely...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginView
        onLogin={(token) => {
          localStorage.setItem("guardian_auth_token", token);
          setIsAuthenticated(true);
          // Re-fetch data on login
          fetchDashboardData();
        }}
      />
    );
  }

  return (
    <div className="w-[1024px] h-[768px] bg-[#F8F9FA] flex flex-col font-sans text-slate-900 overflow-hidden select-none mx-auto border border-slate-300 shadow-2xl rounded-2xl scale-95 origin-top mt-4">
      {/* 1. Header Area */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 shadow-sm rounded-t-2xl">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-black text-sm">
            DG
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 flex items-center">
            Deadline Guardian{" "}
            <span className="text-slate-300 font-light mx-2">/</span>{" "}
            <span className="text-slate-500 font-medium text-sm">
              {selectedGoalId && currentView === "goals"
                ? "Goal Details"
                : "Dashboard"}
            </span>
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          {/* Workspace Switcher */}
          <div className="relative">
            <select
              value={selectedWorkspaceId || ""}
              onChange={(e) =>
                handleWorkspaceSwitch(e.target.value ? e.target.value : null)
              }
              aria-label="Switch workspace"
              className="appearance-none flex items-center w-full bg-transparent pl-3 pr-8 py-1.5 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors text-xs font-semibold text-slate-700 outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-900 min-h-[44px] sm:min-h-[auto]"
            >
              <option value="">Personal Space</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
          </div>

          {/* User Avatar */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
              }}
              title={currentUser.name}
              aria-label="User profile menu"
              aria-expanded={showProfileMenu}
              className="flex items-center justify-center space-x-2 pl-2 pr-1.5 py-1 hover:bg-slate-50 rounded-full border border-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 min-h-[44px] sm:min-h-[auto]"
            >
              <div
                className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                aria-hidden="true"
              >
                {currentUser.initials}
              </div>
              <ChevronDown
                className="w-3.5 h-3.5 text-slate-400"
                aria-hidden="true"
              />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {currentUser.workspaceName}
                  </div>
                </div>
                <div className="py-1">
                  <button 
                    onClick={() => {
                      setView('profile');
                      setSelectedGoalId(null);
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 min-h-[44px] sm:min-h-[auto]"
                  >
                    Profile Settings
                  </button>
                  <button 
                    onClick={() => {
                      setView('preferences');
                      setSelectedGoalId(null);
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 min-h-[44px] sm:min-h-[auto]"
                  >
                    Preferences
                  </button>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <button 
                    onClick={() => {
                      setIsLoggingOut(true);
                      setShowProfileMenu(false);
                      setTimeout(() => {
                        localStorage.removeItem("guardian_auth_token");
                        sessionStorage.clear();
                        window.location.href = '/';
                      }, 800);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors focus-visible:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-900 min-h-[44px] sm:min-h-[auto]"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Body Container with Sidebar and Content */}
      <main className="flex-1 flex overflow-hidden bg-[#F8F9FA]">
        <AgentStatusSidebar
          currentView={selectedGoalId ? "goals" : currentView}
          setView={(v) => {
            setSelectedGoalId(null);
            setView(v);
          }}
          userName={currentUser?.name || currentUser?.initials || 'User'}
          userEmail={currentUser?.email || 'user@example.com'}
          workspaces={workspaces}
          selectedWorkspaceId={selectedWorkspaceId}
          onWorkspaceSwitch={handleWorkspaceSwitch}
        />

        <section className="flex-1 p-8 flex flex-col overflow-hidden">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
              </div>
            }
          >
            {selectedGoalId && selectedGoal ? (
              <GoalDetailsView
                goal={selectedGoal}
                onBack={() => {
                  setSelectedGoalId(null);
                  setView("dashboard");
                }}
                onCompleteTask={handleCompleteTask}
                onMissTask={handleMissTask}
                onRegeneratePlan={handleRegeneratePlan}
                onRegenerateSchedule={handleRegenerateSchedule}
                onGenerateRecovery={handleGenerateRecovery}
                onDeleteGoal={handleDeleteGoal}
              />
            ) : currentView === "dashboard" ? (
              <DashboardView
                metrics={filteredMetrics}
                goals={filteredGoals}
                todayTasks={filteredTodayTasks}
                currentUser={currentUser}
                loading={loading}
                onSelectGoal={(id) => setSelectedGoalId(id)}
                onCompleteTask={handleCompleteTask}
                onMissTask={handleMissTask}
                onQuickIntake={handleIntakeGoal}
              />
            ) : currentView === "goals" ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-semibold tracking-tight uppercase text-slate-400">
                    All Goals
                  </h3>
                  <button
                    onClick={() => setView("create")}
                    className="px-3.5 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 min-h-[44px] sm:min-h-[auto]"
                  >
                    New Goal
                  </button>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {filteredGoals.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 text-xs font-medium">
                      No active goals found in this workspace. Create a new goal
                      to get started!
                    </div>
                  ) : (
                    filteredGoals.map((g) => {
                      const riskColor =
                        g.risk?.level === "HIGH"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : g.risk?.level === "MEDIUM"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-green-50 text-green-700 border-green-200";

                      return (
                        <button
                          key={g.id}
                          onClick={() => setSelectedGoalId(g.id)}
                          className="w-full text-left p-4 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-all flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:bg-slate-50 min-h-[44px]"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-3">
                              <h4 className="text-sm font-bold text-slate-800">
                                {g.title}
                              </h4>
                              <span
                                className={`px-2 py-0.5 text-[9px] font-mono border rounded ${riskColor}`}
                              >
                                {g.risk?.level || "LOW"} RISK
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">
                              Deadline:{" "}
                              {new Date(g.deadline).toLocaleDateString()} •
                              Complexity: {g.complexity}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 transition-colors" />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : currentView === "create" ? (
              <CreateGoalView
                onSubmit={handleIntakeGoal}
                onGoalCreated={(id) => setSelectedGoalId(id)}
              />
            ) : currentView === "activity" ? (
              <ActivityView logs={filteredLogs} loading={loading} />
            ) : (
              <SettingsView 
                user={currentUser} 
                workspaces={workspaces} 
                initialTab={
                  currentView === 'preferences' ? 'preferences' : 
                  currentView === 'workspaces' ? 'workspaces' : 
                  currentView === 'settings' ? 'profile' :
                  'profile'
                }
                onUserUpdate={(updatedFields) => setCurrentUser((prev: any) => ({ ...prev, ...updatedFields }))}
              />
            )}
          </Suspense>
        </section>
      </main>

      {/* 3. Footer Area */}
      <footer className="h-10 bg-slate-100 border-t border-slate-200 flex items-center justify-center text-[9px] uppercase tracking-widest text-slate-400 font-bold shrink-0 rounded-b-2xl">
        <div>Deadline Guardian v1.0.0</div>
      </footer>
    </div>
  );
}
