import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Card, Button, Skeleton, StatCard, EmptyState } from '../components/ui';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { useAuthStore } from '../store/auth';
import type { Project } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://bugtracker.jainprashuk.in';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allErrors, setAllErrors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Load projects on mount
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get session token from localStorage
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;

      if (!token) {
        console.warn('No auth token available');
        return;
      }

      // Call real API endpoint
      const response = await fetch(`${API_BASE_URL}/projects/${user.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load projects: ${response.statusText}`);
      }

      const projectsData = await response.json();
      
      // Map backend response to frontend Project type
      const mappedProjects = Array.isArray(projectsData)
        ? projectsData.map((p: any) => ({
            id: p._id || p.id,
            name: p.name,
            apiKey: p.api_key || p.apiKey,
            userId: p.user_id || p.userId,
            createdAt: p.created_at || p.createdAt,
            errorCount: p.errorCount || 0, // Will be updated when fetching errors
            lastSeen: p.lastSeen || null,
          }))
        : [];
      
      setProjects(mappedProjects);

      // Fetch error counts for each project
      if (token) {
        let totalErrorsLast24Hours = 0;
        const now = new Date();
        const last24HoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const projectsWithErrorCounts = await Promise.all(
          mappedProjects.map(async (project) => {
            try {
              const errorsResponse = await fetch(
                `${API_BASE_URL}/projects/${project.id}/errors`,
                {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (errorsResponse.ok) {
                const errorsData = await errorsResponse.json();
                const errors = Array.isArray(errorsData) ? errorsData : [];
                const errorCount = errors.length;
                
                // Count errors from last 24 hours
                errors.forEach((error: any) => {
                  const lastSeen = new Date(error.last_seen || error.lastSeen);
                  if (lastSeen >= last24HoursAgo) {
                    totalErrorsLast24Hours++;
                  }
                });
                
                return { ...project, errorCount };
              }
            } catch (error) {
              console.error(`Failed to load error count for project ${project.id}:`, error);
            }

            return project;
          })
        );

        setProjects(projectsWithErrorCounts);
        setAllErrors([{ count24h: totalErrorsLast24Hours }]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      // Fallback to empty array on error
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (name: string) => {
    if (!user) return;

    setIsCreating(true);
    try {
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Call real API endpoint
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create project: ${response.statusText}`);
      }

      const result = await response.json();

      // Reload projects
      await loadProjects();
      setIsModalOpen(false);

      return {
        apiKey: result.api_key,
        projectId: result.project_id,
      };
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const totalErrors = projects.reduce((sum, p) => sum + p.errorCount, 0);
  const last24HoursCount = allErrors.length > 0 ? allErrors[0].count24h : 0;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 overflow-auto w-full">
        <div className="p-8 w-full">
          {/* Header */}
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
                Dashboard
              </h1>
              <p className="text-slate-400">Monitor errors from your applications</p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus size={20} />
              New Project
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <StatCard
              label="Total Errors"
              value={totalErrors}
              icon={<AlertCircle size={24} className="text-red-500" />}
            />
            <StatCard
              label="Projects"
              value={projects.length}
              icon={<TrendingUp size={24} className="text-blue-500" />}
            />
            <StatCard
              label="Last 24 Hours"
              value={last24HoursCount}
              icon={<Clock size={24} className="text-emerald-500" />}
            />
          </div>

          {/* Projects Section */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold text-white">Your Projects</h2>
              {projects.length > 0 && (
                <span className="px-3 py-1 bg-slate-800/50 text-slate-300 text-sm rounded-full border border-slate-700/50">
                  {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-56" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <EmptyState
                icon={<Plus size={48} />}
                title="No projects yet"
                description="Create your first project to start monitoring errors"
                action={{
                  label: 'Create Project',
                  onClick: () => setIsModalOpen(true),
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="group cursor-pointer hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1"
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-slate-400 text-sm mt-1">
                        Created {new Date(project.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Total Errors</span>
                        <div className="flex items-center gap-2">
                          <AlertCircle size={16} className="text-red-500" />
                          <span className="font-bold text-white text-lg">{project.errorCount}</span>
                        </div>
                      </div>
                      {project.lastSeen && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Last Seen</span>
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-emerald-500" />
                            <span className="text-sm text-slate-300">
                              {new Date(project.lastSeen).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(project.apiKey);
                        // Optional: Show toast notification here
                      }}
                      className="w-full px-4 py-3 bg-slate-800/50 hover:bg-slate-700/70 border border-slate-700/50 hover:border-slate-600/70 rounded-lg text-sm text-slate-300 font-mono text-xs truncate transition-all duration-200 hover:shadow-md group-hover:text-blue-300"
                      title={`Click to copy API key: ${project.apiKey}`}
                    >
                      {project.apiKey}
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
        isLoading={isCreating}
      />
    </div>
  );
};
