import { Target, ArrowRight, Loader2 } from "lucide-react";
import React, { useState } from "react";

export function LoginView({ onLogin }: { onLogin: (token: string) => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
      // We send username as 'email' and 'name' to the backend to satisfy the existing schema
      const payload = isRegistering ? { email: username, password, name: username } : { email: username, password };
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Authentication failed");
      }
      
      onLogin(data.token);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 pb-6 border-b border-slate-100">
          <div className="flex items-center space-x-2.5 mb-8">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Deadline Guardian
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
            {isRegistering ? "Create an account" : "Welcome back"}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {isRegistering ? "Sign up to start orchestrating projects." : "Sign in to your orchestration dashboard."}
          </p>
        </div>

        <div className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
                placeholder="johndoe"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center space-x-2 bg-slate-900 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isRegistering ? "Create Account" : "Sign In"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              {isRegistering 
                ? "Already have an account? Sign in" 
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-xs font-medium text-slate-400 max-w-sm text-center leading-relaxed">
        By continuing, you agree to our Terms of Service and Privacy Policy. Secure access managed by Guardian Auth.
      </p>
    </div>
  );
}
