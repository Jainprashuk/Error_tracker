import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { useAuthStore } from "../store/auth";
import {
  Terminal,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Github,
  Globe
} from "lucide-react";
import { SEO } from "../components/SEO";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isSignedIn, isLoaded } = useUser();

  // Automatic redirect if fully synced
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      navigate("/dashboard");
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Initializing Bug Tracker...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] relative overflow-hidden flex items-center justify-center p-6">
      <SEO
        title="Sign In"
        description="Sign in to your BugTracker account to monitor errors, manage projects, and improve your app stability."
      />
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

      <div className="w-full max-w-[1000px] grid lg:grid-cols-2 gap-12 items-center relative z-10">

        {/* Left Side: Brand & Value Prop */}
        <div className="hidden lg:flex flex-col space-y-8 animate-fade-in">
          <div className="flex items-center space-y-1">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 mr-4">
              <Zap className="text-white fill-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">BugTracker <span className="text-blue-500"></span></h2>
          </div>

          <h1 className="text-5xl font-extrabold text-white leading-tight">
            Monitor your <br />
            <span className="gradient-text">stack in real-time.</span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-md">
            The next-generation error tracking platform for developers who value speed, safety, and deep insights.
          </p>

          <div className="space-y-4">
            {[
              { icon: <Terminal size={18} />, text: "Native SDK for Finding Bugs" },
              { icon: <ShieldCheck size={18} />, text: "Secure data encryption" },
            ].map((item, i) => (
              <div key={i} className="flex items-center space-x-3 text-slate-300 animate-slide-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="p-2 bg-slate-800/50 rounded-lg text-blue-400">
                  {item.icon}
                </div>
                <span className="font-medium text-sm">{item.text}</span>
              </div>
            ))}
          </div>


        </div>

        {/* Right Side: Auth Card */}
        <div className="flex justify-center">
          <div className="w-full max-w-md glass glow-blue rounded-3xl p-8 lg:p-10 animate-fade-in-up shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="lg:hidden w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto mb-6">
                <Zap className="text-white fill-white" size={28} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-slate-400">Identify, triage, and fix bugs faster.</p>
            </div>

            {/* Feature Checkmarks (Compact) */}
            <div className="flex justify-center gap-4 mb-8">
              {['Secure', 'Fast', 'Insights'].map((label) => (
                <div key={label} className="flex items-center space-x-1 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <CheckCircle2 size={12} className="text-blue-400" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400">{label}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4 relative z-10">
              {/* Signed Out View */}
              <SignedOut>
                <div className="space-y-4">
                  <SignInButton mode="modal">
                    <button className="group w-full px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
                      Sign in to your account
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </SignInButton>

                  <SignUpButton mode="modal">
                    <button className="w-full px-6 py-3.5 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/40 text-slate-200 rounded-xl font-semibold transition-all duration-300">
                      Create new account
                    </button>
                  </SignUpButton>
                </div>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#1e293b]/0 px-2 text-slate-500">Trusted by Open Source</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center space-x-2 p-2.5 border border-slate-800 rounded-xl hover:bg-slate-800/50 transition">
                    <Github size={18} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-400">Github</span>
                  </button>
                  <button className="flex items-center justify-center space-x-2 p-2.5 border border-slate-800 rounded-xl hover:bg-slate-800/50 transition">
                    <Globe size={18} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-400">Google</span>
                  </button>
                </div>
              </SignedOut>

              {/* Signed In View */}
              <SignedIn>
                <div className="flex flex-col items-center space-y-6 pt-2">
                  <div className="p-1 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg">
                    <div className="bg-slate-900 rounded-full p-0.5">
                      <UserButton
                        appearance={{
                          elements: {
                            userButtonAvatarBox: "w-16 h-16",
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-slate-300 font-medium mb-1">Session Active</p>
                    <p className="text-xs text-slate-500">Authenticated via Clerk</p>
                  </div>

                  <button
                    onClick={() => navigate("/dashboard")}
                    className="group w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20"
                  >
                    Enter Dashboard
                    <Zap size={18} className="group-hover:scale-125 transition-transform" />
                  </button>
                </div>
              </SignedIn>
            </div>

            {/* Bottom Accent */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
          </div>
        </div>

      </div>

      {/* Background Blobs Overlay */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
    </div>
  );
};