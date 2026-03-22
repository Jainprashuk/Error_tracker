import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useAuthStore } from '../store/auth';
import {
  ChevronRight,
  AlertCircle,
  Zap,
  Code,
  BarChart3,
  GitBranch,
  Github,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isSignedIn, isLoaded } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-redirect if already fully authenticated
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      navigate('/dashboard');
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap size={24} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                BugTracker
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                Pricing
              </button>
              <a
                href="/login"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Docs
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-medium transition-all duration-200 active:scale-95"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? (
                <X size={24} />
              ) : (
                <Menu size={24} />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <button
                onClick={() => scrollToSection('features')}
                className="block w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="block w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="block w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => navigate('/docs')}
                className="block w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded transition-colors"
              >
                Docs
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent leading-tight">
                Know when your app breaks.
              </h1>
              <p className="text-xl text-slate-400 leading-relaxed">
                BugTracker automatically captures JavaScript errors, API failures and console issues from your frontend applications and shows them in a powerful developer dashboard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 hover:shadow-lg hover:shadow-blue-500/50"
              >
                Get Started <ChevronRight size={20} />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 border border-slate-700 hover:border-blue-500 rounded-lg font-semibold transition-all duration-200 hover:bg-slate-800/50"
              >
                View Dashboard Demo
              </button>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="hidden md:block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-20 blur-2xl"></div>
              <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                <div className="space-y-4">
                  {/* Mock Dashboard */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-4 bg-slate-700 rounded w-1/3"></div>
                      <div className="h-4 bg-slate-700 rounded w-1/4"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-12 bg-gradient-to-r from-red-500/20 to-red-500/10 border border-red-500/30 rounded-lg"></div>
                      <div className="h-12 bg-gradient-to-r from-orange-500/20 to-orange-500/10 border border-orange-500/30 rounded-lg"></div>
                      <div className="h-12 bg-gradient-to-r from-blue-500/20 to-blue-500/10 border border-blue-500/30 rounded-lg"></div>
                    </div>
                  </div>
                  <div className="text-center text-slate-400 text-sm">
                    Real-time error dashboard
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Production bugs shouldn't be a mystery.
            </h2>
            <p className="text-xl text-slate-400">
              When users encounter errors in production, developers often have no idea what went wrong or where it happened.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <AlertCircle size={32} />,
                title: 'Production bugs are hard to reproduce',
                description: 'Users report errors but you can\'t replicate them locally'
              },
              {
                icon: <Code size={32} />,
                title: 'No visibility into frontend errors',
                description: 'Browser errors silently fail without proper monitoring'
              },
              {
                icon: <BarChart3 size={32} />,
                title: 'Debugging takes too long',
                description: 'Hunting through logs to find the source of the problem'
              }
            ].map((problem, idx) => (
              <div
                key={idx}
                className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/60 transition-all duration-300"
              >
                <div className="text-red-500 mb-4">{problem.icon}</div>
                <h3 className="text-lg font-bold mb-2">{problem.title}</h3>
                <p className="text-slate-400">{problem.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powerful Error Tracking Features
            </h2>
            <p className="text-xl text-slate-400">
              Everything you need to monitor and debug your application errors
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap size={28} />,
                title: 'Automatic Error Tracking',
                description: 'Automatically capture JavaScript crashes and unhandled exceptions'
              },
              {
                icon: <Code size={28} />,
                title: 'API Failure Detection',
                description: 'Track failing API calls including request and response data'
              },
              {
                icon: <BarChart3 size={28} />,
                title: 'Stack Trace Analysis',
                description: 'Instantly see the file, line and stack trace where the error occurred'
              },
              {
                icon: <GitBranch size={28} />,
                title: 'Error Grouping',
                description: 'Duplicate errors are grouped together using smart fingerprinting'
              },
              {
                icon: <AlertCircle size={28} />,
                title: 'Developer Dashboard',
                description: 'View all errors across your projects in a clean dashboard'
              },
              {
                icon: <ChevronRight size={28} />,
                title: 'Simple SDK',
                description: 'Install the SDK and start tracking errors in seconds'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 hover:bg-slate-800/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="text-blue-400 mb-4 group-hover:text-blue-300 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-400">
              Simple and straightforward error tracking workflow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-2">
            {[
              { step: 1, title: 'Your Application', icon: '📱' },
              { step: 2, title: 'BugTracker SDK', icon: '📦' },
              { step: 3, title: 'Error Collector API', icon: '☁️' },
              { step: 4, title: 'Developer Dashboard', icon: '📊' }
            ].map((item, idx) => (
              <div key={idx}>
                <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-6 text-center relative">
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <div className="text-3xl font-bold text-blue-400 mb-2">{item.step}</div>
                  <p className="text-slate-300 font-medium">{item.title}</p>
                </div>
                {idx < 3 && (
                  <div className="hidden md:flex justify-center mt-4 mb-4">
                    <ChevronRight className="text-slate-600 rotate-90" size={24} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Get Started in Seconds
            </h2>
            <p className="text-xl text-slate-400">
              Simple setup with our lightweight SDK
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 overflow-x-auto">
            <pre className="text-slate-300 font-mono text-sm leading-relaxed">
              <code>{`// Install the SDK
npm install bug-tracker-sdk

// Initialize in your application
import { initBugTracker } from "bug-tracker-sdk"
import axios from "axios"

initBugTracker({
  apiKey: "YOUR_API_KEY",
  axios
})

// That's it! Your errors are now tracked.`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powerful Dashboard
            </h2>
            <p className="text-xl text-slate-400">
              See all your application errors in one place
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-10 blur-3xl"></div>
            <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-xl">
              <div className="space-y-6">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">Your Errors</h3>
                    <p className="text-slate-400">Real-time error monitoring</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1 bg-slate-700/50 rounded-lg text-sm text-slate-300">
                      Last 24h
                    </div>
                  </div>
                </div>

                {/* Error List */}
                <div className="space-y-3">
                  {[
                    { type: 'TypeError', severity: 'critical', count: 24 },
                    { type: 'API Error', severity: 'warning', count: 8 },
                    { type: 'Network Error', severity: 'warning', count: 5 }
                  ].map((error, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-4 flex items-center justify-between hover:bg-slate-900/70 transition-colors cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${error.severity === 'critical'
                              ? 'bg-red-500'
                              : 'bg-orange-500'
                              }`}
                          ></div>
                          <div>
                            <p className="font-semibold text-white">{error.type}</p>
                            <p className="text-sm text-slate-400">
                              Occurred {error.count} times
                            </p>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-500" size={20} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Start monitoring your application errors today.
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Get instant visibility into your frontend errors and API failures
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-semibold transition-all duration-200 active:scale-95 hover:shadow-lg hover:shadow-blue-500/50"
            >
              Start Free
            </button>
            <a
              href="#"
              className="px-8 py-3 border border-slate-700 hover:border-blue-500 rounded-lg font-semibold transition-all duration-200 hover:bg-slate-800/50 flex items-center justify-center gap-2"
            >
              View Docs <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-12 px-4 sm:px-6 lg:px-8 bg-slate-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <a href="/login" className="hover:text-white transition-colors">
                    Docs
                  </a>
                </li>
                <li>
                  <a href="/login" className="hover:text-white transition-colors">
                    API Reference
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Community</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Discord
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800/50 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <span className="font-bold">BugTracker</span>
            </div>
            <p className="text-slate-400 text-sm">
              © 2026 BugTracker. All rights reserved.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Github size={20} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
