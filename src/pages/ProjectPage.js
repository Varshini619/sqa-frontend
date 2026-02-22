import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import NavigationBar from '../components/NavigationBar';
import VersionComparison from '../components/VersionComparison';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { API_BASE_URL } from '../config';

const ProjectPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [newVersionNumber, setNewVersionNumber] = useState('');
  const [newVersionDesc, setNewVersionDesc] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjectData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const projectResponse = await axios.get(`${API_BASE_URL}/api/projects/${projectId}`);
      setProject(projectResponse.data);
      setVersions(projectResponse.data.versions || []);
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/versions`, {
        projectId: projectId,
        versionNumber: newVersionNumber,
        description: newVersionDesc
      });
      setShowVersionModal(false);
      setNewVersionNumber('');
      setNewVersionDesc('');
      fetchProjectData();
    } catch (error) {
      console.error('Error creating version:', error);
      alert('Failed to create version');
    }
  };

  const handleVersionClick = (versionId) => {
    navigate(`/version/${versionId}`);
  };

  const handleDeleteVersion = async (versionId, versionNumber, e) => {
    e.stopPropagation(); // Prevent navigation when clicking delete button
    if (!window.confirm(`Are you sure you want to delete version "${versionNumber}"? This will also delete all data associated with this version.`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/versions/${versionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      alert('Version deleted successfully!');
      fetchProjectData();
    } catch (error) {
      console.error('Error deleting version:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete version';
      alert(`Failed to delete version: ${errorMessage}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Project not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50">
      <NavigationBar 
        projectName={project.name} 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showSearch={true}
        onBack={() => navigate('/home')}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Versions Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-slate-800">Versions</h2>
            <button
              onClick={() => setShowVersionModal(true)}
              className="inline-flex items-center px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-all"
            >
              <FiPlus className="mr-2" size={16} />
              Add Version
            </button>
          </div>
          
          {versions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {versions.map((version) => {
                const isHighlighted = searchTerm.trim() && (
                  (version.versionNumber || '').toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
                  (version.description || '').toLowerCase().includes(searchTerm.toLowerCase().trim())
                );
                
                return (
                  <div
                    key={version.id}
                    onClick={() => handleVersionClick(version.id)}
                    className={`bg-white rounded-lg shadow-sm p-5 transition-all cursor-pointer border-2 group ${
                      isHighlighted
                        ? 'border-blue-900 bg-blue-50 shadow-lg shadow-blue-900/30 ring-2 ring-blue-900/20'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-lg hover:bg-gradient-to-br hover:from-blue-50 hover:via-indigo-50/30 hover:to-purple-50/20 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-semibold transition-colors ${
                        isHighlighted
                          ? 'text-blue-900 group-hover:text-blue-900'
                          : 'text-slate-900 group-hover:text-slate-700'
                      }`}>
                        {version.versionNumber}
                      </h3>
                      <button
                        onClick={(e) => handleDeleteVersion(version.id, version.versionNumber, e)}
                        className="text-slate-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-md transition-all border border-transparent hover:border-blue-200"
                        style={{ color: '#1e3a8a' }}
                        title="Delete version"
                        aria-label="Delete version"
                      >
                        <FiTrash2 size={18} className="font-bold" />
                      </button>
                    </div>
                      {version.description && (
                        <p className={`text-sm leading-relaxed ${
                          isHighlighted ? 'text-blue-800' : 'text-slate-600'
                        }`}>
                        {version.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-10 text-center border border-slate-200">
              <div className="max-w-md mx-auto">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiPlus className="text-2xl text-slate-400" />
                </div>
                <p className="text-slate-600 text-base mb-2">No versions yet</p>
                <p className="text-slate-500 text-sm mb-6">Create your first version to get started</p>
                <button
                  onClick={() => setShowVersionModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-all"
                >
                  <FiPlus className="mr-2" size={16} />
                  Create First Version
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Version Comparison */}
        {projectId && versions.length >= 2 && (
          <div className="mt-8">
            <VersionComparison 
              currentVersionId={versions[0]?.id || ''} 
              projectId={projectId} 
            />
          </div>
        )}
      </main>

      {/* New Version Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              Add Version to {project.name}
            </h3>
            <form onSubmit={handleCreateVersion}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version Number
                </label>
                <input
                  type="text"
                  required
                  value={newVersionNumber}
                  onChange={(e) => setNewVersionNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., v1, v2, v1.0"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newVersionDesc}
                  onChange={(e) => setNewVersionDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                  placeholder="Version description..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowVersionModal(false);
                    setNewVersionNumber('');
                    setNewVersionDesc('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectPage;

