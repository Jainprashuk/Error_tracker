import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Check } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Card, Button, Badge, Skeleton } from '../components/ui';
import type { Error as ErrorType, Project } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://bugtracker.jainprashuk.in';

export const ProjectPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [errors, setErrors] = useState<ErrorType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [id]);

  const loadProjectData = async () => {
    setIsLoading(true);
    try {
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;

      if (!token || !id) {
        return;
      }

      const { user } = JSON.parse(session || '{}');

      // Fetch all projects for the user to find the one with matching ID
      const projectsResponse = await fetch(`${API_BASE_URL}/projects/${user.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!projectsResponse.ok) {
        throw new Error(`Failed to load projects: ${projectsResponse.statusText}`);
      }

      const projectsData = await projectsResponse.json();
      const projects = Array.isArray(projectsData) ? projectsData : [];
      const projectData = projects.find((p: any) => p._id === id);

      if (!projectData) {
        throw new Error('Project not found');
      }

      // Fetch errors for this project
      const errorsResponse = await fetch(`${API_BASE_URL}/projects/${id}/errors`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!errorsResponse.ok) {
        throw new Error(`Failed to load errors: ${errorsResponse.statusText}`);
      }

      const errorsData = await errorsResponse.json();
      const projectErrors = Array.isArray(errorsData) ? errorsData : [];

      // Map the real project data
      const realProject: Project = {
        id: projectData._id,
        name: projectData.name,
        apiKey: projectData.api_key,
        createdAt: projectData.created_at,
        userId: projectData.user_id,
        errorCount: projectErrors.length,
        lastSeen: projectErrors.length > 0 
          ? (projectErrors[0].last_seen || projectErrors[0].lastSeen) 
          : null,
      };

      setProject(realProject);
      setErrors(projectErrors);
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyApiKey = () => {
    if (project) {
      navigator.clipboard.writeText(project.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const getErrorMessage = (error: any): string => {
    // Try to get error message from various possible locations
    if (error.message) return error.message;
    if (error.error?.message) return error.error.message;
    
    // Fallback: use fingerprint truncated
    const fp = error.fingerprint || 'Unknown Error';
    return fp.substring(0, 50) + (fp.length > 50 ? '...' : '');
  };

  const getErrorTypeBadgeVariant = (errorType: string | undefined): 'danger' | 'warning' | 'info' | 'success' => {
    switch (errorType) {
      case 'unhandled_exception':
        return 'danger';
      case 'api_error':
        return 'warning';
      case 'validation_error':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getErrorTypeLabel = (errorType: string | undefined): string => {
    if (!errorType) return 'Unknown';
    return errorType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Sidebar />
        <div className="flex-1 ml-64 p-8">
          <Skeleton className="h-12 w-1/3 mb-8" />
          <Skeleton className="h-40 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Sidebar />
        <div className="flex-1 ml-64 p-8">
          <Card className="text-center py-12">
            <p className="text-slate-400 mb-4">Project not found</p>
            <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Sidebar />

      <div className="flex-1 ml-64 overflow-auto w-full">
        <div className="p-8 w-full">
          {/* Header */}
          <div className="flex items-center gap-4 mb-12">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-all duration-200 text-slate-400 hover:text-white"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                {project.name}
              </h1>
              <p className="text-slate-400 mt-1">Error monitoring and debugging</p>
            </div>
          </div>

          {/* API Key Section */}
          <Card className="mb-8 group">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white">API Key</h2>
              <Badge variant="info">Copy to use</Badge>
            </div>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-slate-800/40 border border-slate-700/50 px-4 py-3 rounded-lg text-emerald-400 font-mono text-sm break-all">
                {project.apiKey}
              </code>
              <Button
                variant="secondary"
                onClick={copyApiKey}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                {copiedKey ? <Check size={18} /> : <Copy size={18} />}
                {copiedKey ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </Card>

          {/* Errors Table */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold text-white">Errors</h2>
              <span className="px-3 py-1 bg-slate-800/50 text-slate-300 text-sm rounded-full border border-slate-700/50">
                {errors.length}
              </span>
            </div>

            {errors.length === 0 ? (
              <Card className="text-center py-12">
                <p className="text-slate-400">No errors reported yet. Your project is error-free! 🎉</p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/50 bg-slate-800/30">
                        <th className="px-6 py-4 text-left text-slate-300 font-semibold text-sm">Message</th>
                        <th className="px-6 py-4 text-center text-slate-300 font-semibold text-sm">Occurrences</th>
                        <th className="px-6 py-4 text-center text-slate-300 font-semibold text-sm">Type</th>
                        <th className="px-6 py-4 text-right text-slate-300 font-semibold text-sm">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.map((error, idx) => (
                        <tr
                          key={error.fingerprint}
                          onClick={() => navigate(`/error/${error.fingerprint}`)}
                          className={`border-b border-slate-700/30 hover:bg-slate-800/40 cursor-pointer transition-all duration-200 ${
                            idx % 2 === 0 ? 'bg-slate-900/20' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="max-w-md">
                              <p className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                                {getErrorMessage(error)}
                              </p>
                              <p className="text-slate-500 text-xs font-mono mt-1 truncate">{error.fingerprint}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={error.occurrences > 10 ? 'danger' : error.occurrences > 5 ? 'warning' : 'info'}>
                              {error.occurrences}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={getErrorTypeBadgeVariant((error as any).error_type || error.errorType)}>
                              {getErrorTypeLabel((error as any).error_type || error.errorType)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-400 text-sm">
                            {formatDate((error as any).last_seen || error.lastSeen)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
