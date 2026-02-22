import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api/auth';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setResetLink('');
    setLoading(true);

    try {
      const response = await forgotPassword(email);

      setSuccess(response.data.message);
      
      if (response.data.resetLink) {
        setResetLink(response.data.resetLink);
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.message || error.response.data?.error || 'Failed to process request. Please try again.';
        setError(errorMessage);
      } else if (error.request) {
        setError('Cannot connect to server. Please make sure the backend server is running on port 5000.');
      } else {
        setError(`An error occurred: ${error.message || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
              {resetLink && (
                <div className="mt-3">
                  <p className="text-sm font-semibold mb-2">Reset Link:</p>
                  <a 
                    href={resetLink} 
                    className="text-sm text-indigo-600 hover:text-indigo-500 break-all"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/reset-password?token=${resetLink.split('token=')[1]}`);
                    }}
                  >
                    {resetLink}
                  </a>
                  <p className="text-xs text-gray-600 mt-2">
                    Click the link above or copy it to reset your password.
                  </p>
                </div>
              )}
            </div>
          )}
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
