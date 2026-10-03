"use client";
import React, { useState } from 'react';
import { useForm as useRHForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getUser } from '@/lib/auth';
import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from '@react-oauth/google';

export default function Login() {
  const { register, handleSubmit } = useRHForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const { setUser } = useAuth();

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });
      setToken(res.data.token);
      setUser(getUser());
      router.push('/waiting-room');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setErrorMsg('Google did not return a sign-in credential.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await api.post('/auth/google', { credential: response.credential });
      setToken(result.data.token);
      setUser(getUser());
      router.push('/waiting-room');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Welcome Back</h2>
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-4 text-sm">
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input 
              {...register('email', { required: true })}
              type="email" 
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input 
              {...register('password', { required: true })}
              type="password" 
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 text-white"
            />
          </div>
          <button 
            disabled={loading}
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner /> : 'Log In'}
          </button>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs text-gray-500">
          <span className="h-px flex-1 bg-gray-800" />
          OR CONTINUE WITH
          <span className="h-px flex-1 bg-gray-800" />
        </div>
        {googleClientId ? (
          <div className="flex justify-center">
            <GoogleOAuthProvider clientId={googleClientId}>
              <GoogleLogin onSuccess={onGoogleSuccess} onError={() => setErrorMsg('Google sign-in failed')} />
            </GoogleOAuthProvider>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">Google sign-in needs a client ID in the environment configuration.</p>
        )}
        <p className="mt-6 text-center text-sm text-gray-400">
          Don't have an account? <Link href="/auth/register" className="text-indigo-400 hover:text-indigo-300">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
