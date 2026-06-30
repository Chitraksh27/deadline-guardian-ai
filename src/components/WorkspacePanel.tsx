import React, { useState, useEffect } from 'react';
import { GoalDetailed, Workspace, WorkspaceMember } from '../types.ts';
import { Users, Plus } from 'lucide-react';

interface WorkspacePanelProps {
  goal: GoalDetailed;
  onGoalMoved?: (newWorkspaceId: string | null) => void;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({ goal, onGoalMoved }) => {
  const [userWorkspaces, setUserWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(goal.workspaceId);
  const [workspaceMembersList, setWorkspaceMembersList] = useState<WorkspaceMember[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'COLLABORATOR' | 'OWNER'>('COLLABORATOR');
  
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [movingWorkspace, setMovingWorkspace] = useState(false);
  const [invitingMember, setInvitingMember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load workspaces on mount
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Sync state if goal workspaceId changes from outside
  useEffect(() => {
    setCurrentWorkspaceId(goal.workspaceId);
  }, [goal.workspaceId]);

  // Load workspace members when currentWorkspaceId changes
  useEffect(() => {
    if (currentWorkspaceId) {
      fetchWorkspaceMembers(currentWorkspaceId);
    } else {
      setWorkspaceMembersList([]);
    }
  }, [currentWorkspaceId]);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        setUserWorkspaces(data);
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    }
  };

  const fetchWorkspaceMembers = async (wsId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${wsId}/members`);
      if (res.ok) {
        const data = await res.json();
        setWorkspaceMembersList(data);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setCreatingWorkspace(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchWorkspaces();
        setNewWorkspaceName('');
        setShowCreateWorkspace(false);
        // Automatically move this goal to the new workspace!
        await handleMoveGoal(data.workspaceId);
      }
    } catch (err) {
      console.error('Error creating workspace:', err);
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const handleMoveGoal = async (wsId: string | null) => {
    setMovingWorkspace(true);
    try {
      const res = await fetch(`/api/goals/${goal.id}/workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId }),
      });
      if (res.ok) {
        setCurrentWorkspaceId(wsId);
        goal.workspaceId = wsId; // optimistic update
        if (onGoalMoved) {
          onGoalMoved(wsId);
        }
      }
    } catch (err) {
      console.error('Error moving goal to workspace:', err);
    } finally {
      setMovingWorkspace(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentWorkspaceId) return;
    setInvitingMember(true);
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        await fetchWorkspaceMembers(currentWorkspaceId);
        setInviteEmail('');
        setError(null);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to add collaborator');
      }
    } catch (err) {
      console.error('Error inviting member:', err);
      setError('An unexpected error occurred.');
    } finally {
      setInvitingMember(false);
    }
  };

  return (
    <div id="workspace-collaboration-widget" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold tracking-tight uppercase text-slate-800">
            Workspace
          </h3>
        </div>
        <span className={`px-2 py-0.5 text-[9px] font-bold rounded font-mono ${currentWorkspaceId ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
          {currentWorkspaceId ? 'Shared Workspace' : 'Personal Space'}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Workspace Selector */}
      <div className="space-y-2">
        <label htmlFor="workspace-select" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Assign to Workspace
        </label>
        <div className="flex space-x-2">
          <select
            id="workspace-select"
            value={currentWorkspaceId || ''}
            onChange={(e) => handleMoveGoal(e.target.value || null)}
            disabled={movingWorkspace}
            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors"
          >
            <option value="">Personal Space</option>
            {userWorkspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            id="btn-toggle-create-workspace"
            onClick={() => setShowCreateWorkspace(!showCreateWorkspace)}
            aria-label="Create new workspace"
            aria-expanded={showCreateWorkspace}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-xs font-semibold focus-visible:ring-2 focus-visible:ring-slate-900 min-h-[44px] sm:min-h-[auto]"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Create Workspace Form */}
      {showCreateWorkspace && (
        <form onSubmit={handleCreateWorkspace} className="p-3 bg-slate-50/50 border border-slate-150 rounded-lg space-y-2.5 animate-fade-in">
          <h4 className="text-xs font-bold text-slate-700">Create Workspace</h4>
          <div className="flex space-x-2">
            <input
              type="text"
              id="new-workspace-name-input"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="e.g. Acme Corp"
              aria-label="Workspace Name"
              className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              required
            />
            <button
              type="submit"
              id="btn-submit-create-workspace"
              disabled={creatingWorkspace}
              className="px-3 py-1 bg-black text-white hover:bg-slate-800 rounded font-semibold text-xs transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-[auto]"
            >
              {creatingWorkspace ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {/* Members Section (Only shown when associated with workspace) */}
      {currentWorkspaceId && (
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Workspace Members ({workspaceMembersList.length})
            </span>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {workspaceMembersList.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 bg-slate-50/40 border border-slate-100 rounded-lg text-xs font-medium">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]" aria-hidden="true">
                      {m.userName ? m.userName.substring(0, 2).toUpperCase() : 'CO'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{m.userName || 'Collaborator'}</div>
                      <div className="text-[9px] text-slate-400 font-mono">{m.userEmail}</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase rounded font-mono bg-slate-100 border border-slate-200 text-slate-500">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Invite Collaborator Form */}
          <form onSubmit={handleInviteMember} className="space-y-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Add Collaborator to Workspace
            </span>
            <div className="flex space-x-2">
              <input
                type="email"
                id="invite-email-input"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter teammate's email"
                aria-label="Teammate's email"
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors"
                required
              />
              <select
                id="invite-role-select"
                value={inviteRole}
                onChange={(e: any) => setInviteRole(e.target.value)}
                aria-label="Select role"
                className="px-1.5 py-1.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-slate-900 min-w-[70px]"
              >
                <option value="COLLABORATOR">Collaborator</option>
                <option value="OWNER">Owner</option>
              </select>
              <button
                type="submit"
                id="btn-submit-invite"
                disabled={invitingMember}
                className="px-3 py-1.5 bg-slate-800 text-white hover:bg-black rounded font-semibold text-xs transition-colors shrink-0 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-[auto]"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
