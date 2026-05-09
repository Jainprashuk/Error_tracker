import React, { useState } from 'react';
import { X, Building2, Plus, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

interface CreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateOrgModal: React.FC<CreateOrgModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setOrganizations, setCurrentOrgId, organizations } = useAuthStore();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/orgs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to create organization');
      }

      const newOrg = await response.json();
      
      // Update store
      setOrganizations([...organizations, newOrg]);
      setCurrentOrgId(newOrg._id);
      
      toast.success(`Organization "${name}" created!`);
      setName('');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none mb-1">New Organization</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Workspace Setup</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 ml-1">Organization Name</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Building2 size={16} className="text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corp, Engineering Team"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 px-1 leading-relaxed">
              This will be the shared workspace for your projects and team members.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl border border-slate-800 text-slate-400 font-bold text-xs hover:bg-slate-800 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-[1.5] py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} className="group-hover:scale-110 transition-transform" />
              )}
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
