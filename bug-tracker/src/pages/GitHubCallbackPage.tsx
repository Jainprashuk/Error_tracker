import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Skeleton } from '../components/ui';
import toast from 'react-hot-toast';

export const GitHubCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      const msg = 'No authorization code received from GitHub';
      setError(msg);
      toast.error(msg);
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    const handleCallback = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'https://bugtracker.jainprashuk.in'}/auth/github/callback`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, state }),
          }
        );

        if (!response.ok) {
          throw new Error(`GitHub OAuth callback failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.user_id) {
          const user = {
            id: data.user_id,
            name: data.name,
            email: data.email,
          };

          // Store session
          localStorage.setItem('session', JSON.stringify({
            user,
            token: data.user_id,
          }));

          // Update auth store
          setUser(user);

          toast.success("Successfully authenticated with GitHub");
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('GitHub callback error:', err);
        const msg = 'Authentication failed. Please try again.';
        setError(msg);
        toast.error(msg);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <p className="text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <p className="text-white mb-4">Completing authentication...</p>
        <Skeleton className="h-12 w-32 mx-auto" />
      </div>
    </div>
  );
};
