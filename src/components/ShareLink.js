import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiShare2, FiCopy, FiCheck, FiX, FiExternalLink } from 'react-icons/fi';
import { API_BASE_URL } from '../config';

const ShareLink = ({ versionId, type }) => {
  const [shareLink, setShareLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState('');

  // Fetch existing share link
  useEffect(() => {
    if (versionId && type) {
      fetchShareLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId, type]);

  const fetchShareLink = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      if (!versionId || !type) {
        console.warn('Missing versionId or type for fetching share link');
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/share-links/${versionId}/${type}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.data && response.data.shareLink) {
        setShareLink(response.data.shareLink);
      }
    } catch (error) {
      // Don't show error for 404 (no share link exists yet)
      if (error.response && error.response.status !== 404) {
        console.error('Error fetching share link:', error);
      }
    }
  };

  const generateShareLink = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please log in to generate share links');
        setLoading(false);
        return;
      }

      // Validate inputs
      if (!versionId) {
        alert('Version ID is missing. Please refresh the page and try again.');
        setLoading(false);
        return;
      }

      if (!type || !['subjective', 'objective'].includes(type)) {
        alert('Invalid page type. Please refresh the page and try again.');
        setLoading(false);
        return;
      }

      // Validate expiration days if provided
      let expiresInDaysValue = null;
      if (expiresInDays && expiresInDays.trim() !== '') {
        const days = parseInt(expiresInDays);
        if (isNaN(days) || days < 1) {
          alert('Expiration days must be a positive number');
          setLoading(false);
          return;
        }
        expiresInDaysValue = days;
      }

      console.log('Generating share link:', { versionId, type, expiresInDays: expiresInDaysValue });

      const response = await axios.post(
        `${API_BASE_URL}/api/share-links/generate`,
        {
          versionId,
          type,
          expiresInDays: expiresInDaysValue
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      if (response.data && response.data.shareLink) {
        setShareLink(response.data.shareLink);
        setShowForm(false);
        setExpiresInDays('');
        console.log('Share link generated successfully');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      
      let errorMessage = 'Failed to generate share link';
      
      if (error.response) {
        // Server responded with error
        const serverError = error.response.data?.error || 'Unknown server error';
        const details = error.response.data?.details || '';
        errorMessage = details ? `${serverError}: ${details}` : serverError;
        
        if (error.response.status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to generate share links.';
        } else if (error.response.status === 404) {
          errorMessage = 'Version not found. Please refresh the page.';
        } else if (error.response.status === 400) {
          // Keep the detailed error message from server
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Unable to connect to server. Please check if the backend server is running on port 5000.';
      } else {
        // Error setting up request
        errorMessage = error.message || errorMessage;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deactivateShareLink = async () => {
    if (!window.confirm('Are you sure you want to deactivate this share link?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_BASE_URL}/api/share-links/${shareLink.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShareLink(null);
    } catch (error) {
      console.error('Error deactivating share link:', error);
      alert(error.response?.data?.error || 'Failed to deactivate share link');
    }
  };

  const copyToClipboard = () => {
    if (shareLink?.publicUrl) {
      navigator.clipboard.writeText(shareLink.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getPublicUrl = () => {
    if (shareLink?.publicUrl) {
      return shareLink.publicUrl;
    }
    // Fallback to construct URL
    if (shareLink?.token) {
      return `${window.location.origin}/public/sqa/${shareLink.token}`;
    }
    return '';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiShare2 className="text-indigo-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">
            Public Share Link ({type === 'subjective' ? 'Subjective' : 'Objective'})
          </h3>
        </div>

        {shareLink ? (
          <button
            onClick={deactivateShareLink}
            className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
          >
            <FiX size={16} />
            Deactivate
          </button>
        ) : (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <FiShare2 size={16} />
            Generate Link
          </button>
        )}
      </div>

      {showForm && !shareLink && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiration (optional)
            </label>
            <input
              type="number"
              min="1"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              placeholder="Days until expiration (leave empty for no expiration)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateShareLink}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Link'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setExpiresInDays('');
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {shareLink && (
        <div className="mt-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="text"
              readOnly
              value={getPublicUrl()}
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
              title="Copy link"
            >
              {copied ? (
                <>
                  <FiCheck size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <FiCopy size={16} />
                  Copy
                </>
              )}
            </button>
            <a
              href={getPublicUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
              title="Open in new tab"
            >
              <FiExternalLink size={16} />
              Open
            </a>
          </div>

          <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
            <span>
              Created: {new Date(shareLink.createdAt).toLocaleDateString()}
            </span>
            {shareLink.expiresAt && (
              <span>
                Expires: {new Date(shareLink.expiresAt).toLocaleDateString()}
              </span>
            )}
            <span>
              Accesses: {shareLink.accessCount || 0}
            </span>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Share this link with your customers. They will be able to view the {type} SQA reports in read-only mode.
          </p>
        </div>
      )}
    </div>
  );
};

export default ShareLink;

