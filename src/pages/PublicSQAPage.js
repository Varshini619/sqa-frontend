import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PublicLayout from '../components/PublicLayout';
import ExcelMetricVisualization from '../components/ExcelMetricVisualization';
import { FiDownload, FiFile, FiAlertCircle } from 'react-icons/fi';
import { API_BASE_URL } from '../config';

const PublicSQAPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchPublicData();
  }, [token]);

  const fetchPublicData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching public data for token:', token?.substring(0, 10) + '...');
      
      const response = await axios.get(
        `${API_BASE_URL}/api/share-links/public/${token}`,
        {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Public data received:', {
        hasVersion: !!response.data?.version,
        reportsCount: response.data?.reports?.length || 0,
        sqaResultsCount: response.data?.sqaResults?.length || 0
      });
      
      if (response.data) {
        setData(response.data);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error fetching public data:', err);
      console.error('Error response:', err.response);
      console.error('Error status:', err.response?.status);
      console.error('Error data:', err.response?.data);
      
      if (err.response?.status === 404) {
        const errorDetails = err.response.data?.details || '';
        setError(`Share link not found or inactive. ${errorDetails}`);
      } else if (err.response?.status === 410) {
        setError('This share link has expired');
      } else if (err.response?.status === 500) {
        const errorDetails = err.response.data?.details || '';
        setError(`Server error: ${errorDetails || 'Failed to load data. Please try again later.'}`);
      } else if (err.request) {
        setError('Unable to connect to server. Please check your internet connection.');
      } else {
        setError(`Failed to load data: ${err.message || 'Please check the link and try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filePath, fileName) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/uploads/${filePath}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-xl text-gray-600">Loading...</div>
        </div>
      </PublicLayout>
    );
  }

  if (error) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <FiAlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Please contact the person who shared this link with you.
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!data) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-600">No data available</div>
        </div>
      </PublicLayout>
    );
  }

  const { version, type, reports, sqaResults, projectReferences, shareInfo } = data;

  return (
    <PublicLayout>
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {type === 'subjective' ? 'Subjective' : 'Objective'} SQA Reports
                </h1>
                <p className="text-gray-600">
                  Project: <span className="font-semibold">{version.projectName}</span> | 
                  Version: <span className="font-semibold">{version.versionNumber}</span>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This is a read-only view. Shared on {new Date(shareInfo.createdAt).toLocaleDateString()}
                  {shareInfo.expiresAt && ` | Expires on ${new Date(shareInfo.expiresAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {type === 'subjective' ? 'Subjective' : 'Objective'} SQA Reports
            </h2>
            
            {reports && reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report, index) => (
                  <div
                    key={report.id || report._id || index}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FiFile className="text-indigo-600" size={20} />
                        <div>
                          <p className="font-medium text-gray-800">{report.fileName}</p>
                          <p className="text-sm text-gray-500">
                            Uploaded: {new Date(report.uploadedAt || report.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(report.filePath, report.fileName)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                        <FiDownload size={16} />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No reports available</p>
            )}
          </div>
        </div>

        {/* Objective Visualizations - Charts for Performance Testing */}
        {type === 'objective' && reports && reports.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Performance Charts & Visualizations
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                View interactive charts and metrics to analyze performance across different noise types and dB levels.
              </p>
              <ExcelMetricVisualization 
                reports={reports.map(r => ({
                  ...r,
                  _id: r.id || r._id, // Ensure _id exists for component compatibility
                  filePath: r.filePath
                }))}
                versionId={version.id}
                isPublicView={true} // Flag to disable upload/edit features
              />
            </div>
          </div>
        )}

        {/* SQA Results Section (Subjective only) */}
        {type === 'subjective' && sqaResults && sqaResults.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">SQA Results</h2>
              <div className="space-y-4">
                {sqaResults.map((result, index) => (
                  <div
                    key={result.id || result._id || index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-gray-800 mb-2">{result.name}</h3>
                    {result.metrics && (
                      <p className="text-sm text-gray-600 mb-3">Metrics: {result.metrics}</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      {result.inputFiles && result.inputFiles.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-700 text-sm mb-1">Input Files:</p>
                          <div className="space-y-1">
                            {result.inputFiles.map((file, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleDownload(file.filePath, file.fileName)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                              >
                                <FiDownload size={12} />
                                {file.fileName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {result.outputFiles && result.outputFiles.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-700 text-sm mb-1">Output Files:</p>
                          <div className="space-y-1">
                            {result.outputFiles.map((file, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleDownload(file.filePath, file.fileName)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                              >
                                <FiDownload size={12} />
                                {file.fileName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {result.finalExcel && result.finalExcel.fileName && (
                        <div>
                          <p className="font-medium text-gray-700 text-sm mb-1">Final Excel:</p>
                          <button
                            onClick={() => handleDownload(result.finalExcel.filePath, result.finalExcel.fileName)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <FiDownload size={12} />
                            {result.finalExcel.fileName}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                      Uploaded: {new Date(result.uploadedAt || result.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Project References Section (Subjective only) */}
        {type === 'subjective' && projectReferences && projectReferences.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Project References</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectReferences.map((ref, index) => (
                  <div
                    key={ref.id || ref._id || index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-gray-800 mb-2">{ref.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{ref.description}</p>
                    <div className="text-xs text-gray-500 mb-3">
                      <p>{new Date(ref.uploadedAt || ref.createdAt).toLocaleDateString()}</p>
                    </div>
                    <a
                      href={ref.link.startsWith('http') ? ref.link : `${API_BASE_URL}/uploads/${ref.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                    >
                      Open Project
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
    </PublicLayout>
  );
};

export default PublicSQAPage;

