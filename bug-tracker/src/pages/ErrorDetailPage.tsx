import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Check } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Card, Button, Badge, Skeleton } from '../components/ui';
import type { ErrorDetail } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://bugtracker.jainprashuk.in';

export const ErrorDetailPage: React.FC = () => {
  const { fingerprint } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<ErrorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    loadErrorDetail();
  }, [fingerprint]);

  const loadErrorDetail = async () => {
    setIsLoading(true);
    try {
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;

      if (!token || !fingerprint) {
        return;
      }

      // Fetch error detail from API
      const response = await fetch(`${API_BASE_URL}/errors/${fingerprint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load error: ${response.statusText}`);
      }

      const errorData = await response.json();
      
      // Map the API response to our ErrorDetail type
      const mappedError: ErrorDetail = {
        fingerprint: errorData.fingerprint,
        message: errorData.payload?.error?.message || 'Unknown error',
        stack: errorData.payload?.error?.stack || '',
        occurrences: errorData.occurrences || 0,
        firstSeen: errorData.first_seen || new Date().toISOString(),
        lastSeen: errorData.last_seen || new Date().toISOString(),
        errorType: errorData.error_type || undefined,
        location: errorData.location || undefined,
        projectId: errorData.project_id || '',
        request: errorData.payload?.request || undefined,
        response: errorData.payload?.response || undefined,
        payload: errorData.payload || {},
      };
      
      setError(mappedError);
    } catch (error) {
      console.error('Failed to load error detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyJson = () => {
    if (error) {
      navigator.clipboard.writeText(JSON.stringify(error, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return { date: 'N/A', time: 'N/A' };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { date: 'N/A', time: 'N/A' };
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
    } catch {
      return { date: 'N/A', time: 'N/A' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Sidebar />
        <div className="flex-1 ml-64 p-8 w-full">
          <Skeleton className="h-12 w-1/3 mb-8" />
          <Skeleton className="h-96 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!error) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Sidebar />
        <div className="flex-1 ml-64 p-8 w-full">
          <Card className="text-center py-12">
            <p className="text-slate-400 mb-4">Error not found</p>
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
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-all duration-200 text-slate-400 hover:text-white"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white break-all">{error.message}</h1>
              <p className="text-slate-400 font-mono text-xs mt-2">{error.fingerprint}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card>
              <p className="text-slate-400 text-sm font-medium mb-2">Occurrences</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">
                {error.occurrences}
              </p>
            </Card>
            <Card>
              <p className="text-slate-400 text-sm font-medium mb-2">First Seen</p>
              <p className="text-lg font-semibold text-white">
                {formatDate(error.firstSeen).date}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {formatDate(error.firstSeen).time}
              </p>
            </Card>
            <Card>
              <p className="text-slate-400 text-sm font-medium mb-2">Last Seen</p>
              <p className="text-lg font-semibold text-white">
                {formatDate(error.lastSeen).date}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {formatDate(error.lastSeen).time}
              </p>
            </Card>
          </div>

          {/* Error Location */}
          {error.location && (
            <Card className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Error Location</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-slate-400 text-sm font-medium mb-2">File</p>
                  <p className="text-white font-mono text-sm break-all bg-slate-950/50 border border-slate-700/50 rounded-lg p-3">
                    {error.location.file}
                  </p>
                </div>
                {(error.location.line !== undefined || error.location.column !== undefined) && (
                  <div className="grid grid-cols-2 gap-4">
                    {error.location.line !== undefined && (
                      <div>
                        <p className="text-slate-400 text-sm font-medium mb-2">Line</p>
                        <p className="text-lg font-bold text-blue-400">
                          {error.location.line}
                        </p>
                      </div>
                    )}
                    {error.location.column !== undefined && (
                      <div>
                        <p className="text-slate-400 text-sm font-medium mb-2">Column</p>
                        <p className="text-lg font-bold text-blue-400">
                          {error.location.column}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Stack Trace */}
          <Card className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Stack Trace</h2>
            {error.stack ? (
              <pre className="bg-slate-950/50 border border-slate-700/50 rounded-xl p-6 text-red-400 font-mono text-sm overflow-x-auto leading-relaxed">
                {error.stack}
              </pre>
            ) : (
              <div className="bg-slate-950/50 border border-slate-700/50 rounded-xl p-6 text-slate-400">
                <p className="text-sm">No stack trace available for this error</p>
              </div>
            )}
          </Card>

          {/* Request & Response */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {error.request && (
              <Card>
                <h3 className="text-lg font-bold text-white mb-5 pb-4 border-b border-slate-700/50">Request</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">URL</p>
                    <p className="text-blue-400 break-all font-mono text-sm bg-slate-950/30 rounded-lg p-3 border border-slate-700/30">
                      {error.request.url}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Method</p>
                    <Badge variant="info">{error.request.method}</Badge>
                  </div>
                  {error.request.payload && (
                    <div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Payload</p>
                      <pre className="bg-slate-950/50 border border-slate-700/50 rounded-lg p-3 text-slate-300 font-mono text-xs overflow-x-auto leading-relaxed">
                        {JSON.stringify(error.request.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {error.response && (
              <Card>
                <h3 className="text-lg font-bold text-white mb-5 pb-4 border-b border-slate-700/50">Response</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Status Code</p>
                    <Badge variant={error.response.status >= 400 ? 'danger' : 'success'}>
                      {error.response.status}
                    </Badge>
                  </div>
                  {error.response.data && (
                    <div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Response Data</p>
                      <pre className="bg-slate-950/50 border border-slate-700/50 rounded-lg p-3 text-slate-300 font-mono text-xs overflow-x-auto leading-relaxed">
                        {JSON.stringify(error.response.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Client Info */}
          {error.client && (
            <Card className="mb-8">
              <h3 className="text-lg font-bold text-white mb-5 pb-4 border-b border-slate-700/50">Client Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Page URL</p>
                  <p className="text-blue-400 break-all font-mono text-sm bg-slate-950/30 rounded-lg p-3 border border-slate-700/30">
                    {error.client.url}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">User Agent</p>
                  <p className="text-slate-300 break-all font-mono text-xs bg-slate-950/30 rounded-lg p-3 border border-slate-700/30">
                    {error.client.browser}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Full JSON */}
          <Card>
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-700/50">
              <h3 className="text-lg font-bold text-white">Full Payload</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={copyJson}
                className="flex items-center gap-2"
              >
                {copiedJson ? <Check size={16} /> : <Copy size={16} />}
                {copiedJson ? 'Copied' : 'Copy JSON'}
              </Button>
            </div>
            <pre className="bg-slate-950/50 border border-slate-700/50 rounded-xl p-6 text-slate-300 font-mono text-xs overflow-x-auto leading-relaxed max-h-96">
              {JSON.stringify(error, null, 2)}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  );
};
