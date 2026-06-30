import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, Bell, Shield, CheckCircle2, Loader2, Upload, AlertCircle, X, Check, Briefcase, Activity, Plug, HelpCircle } from 'lucide-react';
import { Workspace } from '../types';

interface SettingsViewProps {
  user: any;
  workspaces: Workspace[];
  initialTab?: 'profile' | 'preferences' | 'workspaces' | 'integrations' | 'notifications' | 'security' | 'diagnostics' | 'help';
  onUserUpdate?: (user: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, workspaces, initialTab = 'profile', onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  
  // Profile state
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [locale, setLocale] = useState(user.locale || 'en-US');
  const [timezone, setTimezone] = useState(user.timezone || 'UTC');
  const [image, setImage] = useState(user.image || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preferences state
  const [theme, setTheme] = useState(user.theme || 'SYSTEM');
  const [compactMode, setCompactMode] = useState(user.compactMode || false);
  const [showCompletedGoals, setShowCompletedGoals] = useState(user.showCompletedGoals || true);
  const [aiExplanationDetail, setAiExplanationDetail] = useState(user.aiExplanationDetail || 'NORMAL');
  const [aiAutoGenerateRecoveryPlans, setAiAutoGenerateRecoveryPlans] = useState(user.aiAutoGenerateRecoveryPlans ?? true);
  
  // Notification state
  const [notificationEmail, setNotificationEmail] = useState(user.notificationEmail ?? true);
  const [notificationBrowser, setNotificationBrowser] = useState(user.notificationBrowser ?? true);
  const [notificationDailySummary, setNotificationDailySummary] = useState(user.notificationDailySummary ?? true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorToast, setErrorToast] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  
  const [renamingWorkspaceId, setRenamingWorkspaceId] = useState<string | null>(null);
  const [renameWorkspaceName, setRenameWorkspaceName] = useState('');
  const [invitingWorkspaceId, setInvitingWorkspaceId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
  const [leavingWorkspaceId, setLeavingWorkspaceId] = useState<string | null>(null);



  // Update local state if user prop changes
  useEffect(() => {
    setName(user.name || '');
    setEmail(user.email || '');
    setLocale(user.locale || 'en-US');
    setTimezone(user.timezone || 'UTC');
    setImage(user.image || null);
    setTheme(user.theme || 'SYSTEM');
    setCompactMode(user.compactMode || false);
    setShowCompletedGoals(user.showCompletedGoals ?? true);
    setAiExplanationDetail(user.aiExplanationDetail || 'NORMAL');
    setAiAutoGenerateRecoveryPlans(user.aiAutoGenerateRecoveryPlans ?? true);
    setNotificationEmail(user.notificationEmail ?? true);
    setNotificationBrowser(user.notificationBrowser ?? true);
    setNotificationDailySummary(user.notificationDailySummary ?? true);
  }, [user]);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(''), 4000);
  };

  const getAuthHeader = () => {
    const token = localStorage.getItem("guardian_auth_token") || "";
    return { Authorization: `Bearer ${token}` };
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ name, email, locale, timezone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('Profile updated successfully');
        if (onUserUpdate) onUserUpdate(data.user);
      } else {
        showError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      showError('Network error while saving profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ 
          theme, 
          compactMode, 
          showCompletedGoals, 
          aiExplanationDetail, 
          aiAutoGenerateRecoveryPlans,
          notificationEmail,
          notificationBrowser,
          notificationDailySummary
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('Preferences saved successfully');
        if (onUserUpdate) onUserUpdate(data.user);
      } else {
        showError(data.error || 'Failed to save preferences');
      }
    } catch (err) {
      showError('Network error while saving preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Str = event.target?.result as string;
      setImage(base64Str);
      try {
        const res = await fetch('/api/me/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify({ image: base64Str }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showSuccess('Avatar updated');
          if (onUserUpdate) onUserUpdate({ image: base64Str });
        } else {
          showError(data.error || 'Failed to upload avatar');
        }
      } catch (err) {
        showError('Network error during upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarDelete = async () => {
    setImage(null);
    try {
      const res = await fetch('/api/me/avatar', {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('Avatar removed');
        if (onUserUpdate) onUserUpdate({ image: null });
      } else {
        showError(data.error || 'Failed to remove avatar');
      }
    } catch (err) {
      showError('Network error while removing avatar');
    }
  };

  const submitInviteMember = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inviteEmail.trim() || !invitingWorkspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${invitingWorkspaceId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ email: inviteEmail.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('Member invited successfully');
        setInviteEmail('');
        setInvitingWorkspaceId(null);
      } else {
        showError(data.error || 'Failed to invite member');
      }
    } catch (err) {
      showError('Network error while inviting member');
    } finally {
      setLoading(false);
    }
  };

  const submitRenameWorkspace = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renameWorkspaceName.trim() || !renamingWorkspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${renamingWorkspaceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ name: renameWorkspaceName.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('Workspace renamed successfully');
        setRenamingWorkspaceId(null);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showError(data.error || 'Failed to rename workspace');
      }
    } catch (err) {
      showError('Network error while renaming workspace');
    } finally {
      setLoading(false);
    }
  };

  const submitDeleteWorkspace = async (workspaceId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('Workspace deleted successfully');
        setDeletingWorkspaceId(null);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showError(data.error || 'Failed to delete workspace');
      }
    } catch (err) {
      showError('Network error while deleting workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ name: newWorkspaceName.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('Workspace created successfully');
        setNewWorkspaceName('');
        setIsCreatingWorkspace(false);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showError(data.error || 'Failed to create workspace');
      }
    } catch (err) {
      showError('Network error while creating workspace');
    } finally {
      setLoading(false);
    }
  };

  const submitLeaveWorkspace = async (workspaceId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${user.id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('Left workspace successfully');
        setLeavingWorkspaceId(null);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showError(data.error || 'Failed to leave workspace');
      }
    } catch (err) {
      showError('Network error while leaving workspace');
    } finally {
      setLoading(false);
    }
  };

  const hasProfileChanges = name !== user.name || email !== user.email || locale !== (user.locale || 'en-US') || timezone !== (user.timezone || 'UTC');
  const hasPrefChanges = theme !== (user.theme || 'SYSTEM') || compactMode !== (user.compactMode || false) || showCompletedGoals !== (user.showCompletedGoals ?? true) || aiExplanationDetail !== (user.aiExplanationDetail || 'NORMAL') || aiAutoGenerateRecoveryPlans !== (user.aiAutoGenerateRecoveryPlans ?? true) || notificationEmail !== (user.notificationEmail ?? true) || notificationBrowser !== (user.notificationBrowser ?? true) || notificationDailySummary !== (user.notificationDailySummary ?? true);

  return (
    <div className="flex-1 bg-[#F8F9FA] h-full overflow-y-auto relative">
      {/* Toast notifications */}
      {successToast && (
        <div className="fixed top-20 right-8 bg-green-50 text-green-800 border border-green-200 px-4 py-3 rounded-lg shadow-sm flex items-center space-x-2 z-50 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-20 right-8 bg-rose-50 text-rose-800 border border-rose-200 px-4 py-3 rounded-lg shadow-sm flex items-center space-x-2 z-50 animate-fade-in">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{errorToast}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="mb-8">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Settings</span>
          <h2 className="text-2xl font-light tracking-tight text-slate-900 mt-0.5">Account & Preferences</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 shrink-0 space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              <div className="flex items-center space-x-2.5">
                <User className="w-4 h-4" />
                <span>Profile Settings</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'preferences' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              <div className="flex items-center space-x-2.5">
                <Settings className="w-4 h-4" />
                <span>Preferences</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('workspaces')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'workspaces' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              <div className="flex items-center space-x-2.5">
                <Briefcase className="w-4 h-4" />
                <span>Workspaces</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'diagnostics' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              <div className="flex items-center space-x-2.5">
                <Activity className="w-4 h-4" />
                <span>AI Preferences</span>
              </div>
            </button>
          </div>

          <div className="flex-1 space-y-6 pb-12">
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-base font-semibold text-slate-800">Profile Information</h3>
                  <p className="text-xs text-slate-500 mt-1">Update your account details and public profile.</p>
                </div>
                <div className="p-6 space-y-8">
                  {/* Avatar Upload */}
                  <div className="flex items-center space-x-6">
                    <div className="relative group">
                      {image ? (
                        <div className="w-20 h-20 rounded-full border border-slate-200 overflow-hidden shadow-sm">
                          <img src={image} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300">
                          <span className="text-2xl font-semibold text-slate-600">{user.initials || 'U'}</span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleAvatarUpload} 
                        accept="image/png, image/jpeg, image/webp" 
                        className="hidden" 
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-slate-900"
                        >
                          Change Avatar
                        </button>
                        {image && (
                          <button 
                            type="button" 
                            onClick={handleAvatarDelete}
                            className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-900"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">JPG, PNG or WEBP. Max 5MB.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Full Name</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition-colors" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Email Address</label>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition-colors" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Locale</label>
                      <select 
                        value={locale} 
                        onChange={e => setLocale(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition-colors appearance-none"
                      >
                        <option value="en-US">English (US)</option>
                        <option value="en-UK">English (UK)</option>
                        <option value="es-ES">Spanish</option>
                        <option value="fr-FR">French</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Time Zone</label>
                      <select 
                        value={timezone} 
                        onChange={e => setTimezone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition-colors appearance-none"
                      >
                        <option value="UTC">UTC (Universal Coordinated Time)</option>
                        <option value="America/New_York">Eastern Time (US & Canada)</option>
                        <option value="America/Chicago">Central Time (US & Canada)</option>
                        <option value="America/Denver">Mountain Time (US & Canada)</option>
                        <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                        <option value="Europe/London">London</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button 
                      type="submit" 
                      disabled={!hasProfileChanges || loading}
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center ${!hasProfileChanges || loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Save Profile Changes
                    </button>
                  </div>
                </div>
              </form>
            )}

            {activeTab === 'preferences' && (
              <form onSubmit={handleSavePreferences} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-base font-semibold text-slate-800">Application Preferences</h3>
                  <p className="text-xs text-slate-500 mt-1">Manage appearance, AI behavior, and notifications.</p>
                </div>
                <div className="p-6 space-y-8">
                  
                  {/* Appearance */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-800 flex items-center">Appearance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Theme</label>
                        <select 
                          value={theme}
                          onChange={e => setTheme(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition-colors appearance-none"
                        >
                          <option value="SYSTEM">System Default</option>
                          <option value="LIGHT">Light</option>
                          <option value="DARK">Dark</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Layout Density</label>
                        <select 
                          value={compactMode ? 'COMPACT' : 'COMFORTABLE'}
                          onChange={e => setCompactMode(e.target.value === 'COMPACT')}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition-colors appearance-none"
                        >
                          <option value="COMFORTABLE">Comfortable</option>
                          <option value="COMPACT">Compact</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button 
                      type="submit" 
                      disabled={!hasPrefChanges || loading}
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center ${!hasPrefChanges || loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Save Preferences
                    </button>
                  </div>
                </div>
              </form>
            )}
            
            {activeTab === 'workspaces' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Workspaces</h3>
                    <p className="text-xs text-slate-500 mt-1">Manage your workspaces and team members.</p>
                  </div>
                  <button 
                    onClick={() => setIsCreatingWorkspace(!isCreatingWorkspace)}
                    className="px-3.5 py-1.5 bg-black text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    {isCreatingWorkspace ? 'Cancel' : 'Create Workspace'}
                  </button>
                </div>
                {isCreatingWorkspace && (
                  <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <form onSubmit={handleCreateWorkspace} className="flex gap-3">
                      <input
                        type="text"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        placeholder="New workspace name"
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                        autoFocus
                      />
                      <button 
                        type="submit"
                        disabled={loading || !newWorkspaceName.trim()}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center"
                      >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save
                      </button>
                    </form>
                  </div>
                )}
                <div className="p-0">
                  <div className="divide-y divide-slate-100">
                    <div className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">Personal Space</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Your default private workspace.</p>
                        </div>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded">Default</span>
                      </div>
                    </div>
                    {workspaces.map(ws => {
                      const isOwner = ws.ownerId === user.id;
                      return (
                      <div key={ws.id} className="p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">{ws.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{isOwner ? 'Owner' : 'Member'} • Workspace ID: {ws.id}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isOwner && (
                              <>
                                <button 
                                  onClick={() => {
                                    setInvitingWorkspaceId(invitingWorkspaceId === ws.id ? null : ws.id);
                                    setInviteEmail('');
                                  }}
                                  disabled={loading}
                                  className="px-3 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                  Invite
                                </button>
                                <button 
                                  onClick={() => {
                                    setRenamingWorkspaceId(renamingWorkspaceId === ws.id ? null : ws.id);
                                    setRenameWorkspaceName(ws.name);
                                  }}
                                  disabled={loading}
                                  className="px-3 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                  Rename
                                </button>
                              </>
                            )}
                            {isOwner ? (
                              <button 
                                onClick={() => setDeletingWorkspaceId(deletingWorkspaceId === ws.id ? null : ws.id)}
                                disabled={loading}
                                className="px-3 py-1.5 border border-rose-200 bg-white text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-50 transition-colors disabled:opacity-50"
                              >
                                Delete
                              </button>
                            ) : (
                              <button 
                                onClick={() => setLeavingWorkspaceId(leavingWorkspaceId === ws.id ? null : ws.id)}
                                disabled={loading}
                                className="px-3 py-1.5 border border-rose-200 bg-white text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-50 transition-colors disabled:opacity-50"
                              >
                                Leave
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Forms */}
                        {invitingWorkspaceId === ws.id && (
                          <form onSubmit={submitInviteMember} className="mt-3 mb-4 flex gap-2">
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={e => setInviteEmail(e.target.value)}
                              placeholder="Email address"
                              required
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm outline-none focus:border-slate-400"
                            />
                            <button type="submit" disabled={loading} className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-bold disabled:opacity-50">
                              Send Invite
                            </button>
                          </form>
                        )}
                        
                        {renamingWorkspaceId === ws.id && (
                          <form onSubmit={submitRenameWorkspace} className="mt-3 mb-4 flex gap-2">
                            <input
                              type="text"
                              value={renameWorkspaceName}
                              onChange={e => setRenameWorkspaceName(e.target.value)}
                              placeholder="New workspace name"
                              required
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm outline-none focus:border-slate-400"
                            />
                            <button type="submit" disabled={loading} className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-bold disabled:opacity-50">
                              Save Name
                            </button>
                          </form>
                        )}

                        {deletingWorkspaceId === ws.id && (
                          <div className="mt-3 mb-4 p-3 bg-rose-50 border border-rose-100 rounded text-sm text-rose-800 flex items-center justify-between">
                            <span>Permanently delete this workspace? This cannot be undone.</span>
                            <div className="flex gap-2">
                              <button onClick={() => setDeletingWorkspaceId(null)} className="px-3 py-1.5 bg-white text-slate-600 rounded text-xs border border-slate-200">Cancel</button>
                              <button onClick={() => submitDeleteWorkspace(ws.id)} disabled={loading} className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-bold disabled:opacity-50">Delete</button>
                            </div>
                          </div>
                        )}

                        {leavingWorkspaceId === ws.id && (
                          <div className="mt-3 mb-4 p-3 bg-rose-50 border border-rose-100 rounded text-sm text-rose-800 flex items-center justify-between">
                            <span>Are you sure you want to leave this workspace?</span>
                            <div className="flex gap-2">
                              <button onClick={() => setLeavingWorkspaceId(null)} className="px-3 py-1.5 bg-white text-slate-600 rounded text-xs border border-slate-200">Cancel</button>
                              <button onClick={() => submitLeaveWorkspace(ws.id)} disabled={loading} className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-bold disabled:opacity-50">Leave</button>
                            </div>
                          </div>
                        )}

                        <div className="flex -space-x-2 overflow-hidden mt-2">
                           <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">{user.initials}</div>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              </div>
            )}



            {activeTab === 'diagnostics' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-base font-semibold text-slate-800">AI Intelligence Settings</h3>
                  <p className="text-xs text-slate-500 mt-1">Configure how the AI agent operates.</p>
                </div>
                <div className="p-6 space-y-8">
                  <form onSubmit={handleSavePreferences} className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="text-sm font-medium text-slate-700">Auto-generate recovery plans</div>
                        <div className="text-xs text-slate-500 mt-0.5">Automatically devise solutions for at-risk goals.</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={aiAutoGenerateRecoveryPlans} onChange={e => setAiAutoGenerateRecoveryPlans(e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                      </label>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Explanation Detail Level</label>
                      <select 
                        value={aiExplanationDetail}
                        onChange={e => setAiExplanationDetail(e.target.value)}
                        className="w-full md:w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition-colors appearance-none"
                      >
                        <option value="CONCISE">Concise - Just the actions</option>
                        <option value="NORMAL">Normal - Balanced context</option>
                        <option value="VERBOSE">Verbose - Detailed reasoning</option>
                      </select>
                    </div>

                    <div className="pt-6 flex justify-end">
                      <button 
                        type="submit" 
                        disabled={!hasPrefChanges || loading}
                        className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center ${!hasPrefChanges || loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                      >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Save AI Settings
                      </button>
                    </div>
                  </form>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
