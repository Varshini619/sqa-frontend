import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import NavigationBar from '../components/NavigationBar';
import ProjectComparison from '../components/ProjectComparison';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { API_BASE_URL } from '../config';

// Hero Headline Component with Word-by-Word Animation
const HeroHeadline = ({ text }) => {
  const words = text.split(' ');
  const [visibleWords, setVisibleWords] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    words.forEach((_, index) => {
      setTimeout(() => {
        setVisibleWords(index + 1);
      }, 100 * index);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <h1 
      className="mb-6 leading-tight" 
      style={{ 
        fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
        fontWeight: 700,
        letterSpacing: '-0.5px',
        color: '#0F172A', 
        fontFamily: 'Inter, system-ui, sans-serif',
        margin: '0 auto',
        lineHeight: '1.2'
      }}
    >
      {words.map((word, index) => (
        <span
          key={index}
          style={{
            display: 'inline-block',
            opacity: index < visibleWords ? 1 : 0,
            transform: index < visibleWords ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
            marginRight: '0.25em'
          }}
        >
          {word}
        </span>
      ))}
    </h1>
  );
};

const Home = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newVersionNumber, setNewVersionNumber] = useState('');
  const [newVersionDesc, setNewVersionDesc] = useState('');
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/projects`, {
        name: newProjectName,
        description: newProjectDesc
      });
      setShowNewProjectModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  const handleAddVersion = (project, e) => {
    if (e) e.stopPropagation();
    setSelectedProject(project);
    setShowVersionModal(true);
  };

  const handleCreateVersion = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/versions`, {
        projectId: selectedProject._id,
        versionNumber: newVersionNumber,
        description: newVersionDesc
      });
      setShowVersionModal(false);
      setNewVersionNumber('');
      setNewVersionDesc('');
      setSelectedProject(null);
      fetchProjects();
    } catch (error) {
      console.error('Error creating version:', error);
      alert('Failed to create version');
    }
  };

  const handleDeleteProject = async (projectId, projectName, e) => {
    e.stopPropagation(); // Prevent navigation when clicking delete button
    if (!window.confirm(`Are you sure you want to delete "${projectName}"? This will also delete all versions associated with this project.`)) {
      return;
    }

    try {
      console.log('Attempting to delete project:', { projectId, projectName });
      const url = `${API_BASE_URL}/api/projects/${projectId}`;
      console.log('Delete URL:', url);
      
      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Delete response:', response.data);
      alert('Project deleted successfully!');
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete project';
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: errorMessage,
        url: error.config?.url
      });
      alert(`Failed to delete project: ${errorMessage}`);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #eef2ff)' }}>
      {/* Header */}
      <NavigationBar 
        projectName={null}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showSearch={true}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section style={{ paddingTop: '100px', paddingBottom: '80px' }}>
          <div className="text-center mx-auto" style={{ maxWidth: '900px' }}>
            <HeroHeadline text="AI-Powered Audio Intelligence Platform for Edge Devices" />
            <h2 
              className="mb-6" 
              style={{ 
                fontSize: 'clamp(1.125rem, 1.8vw, 1.375rem)',
                fontWeight: 500,
                color: '#64748B', 
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: '1.5',
                marginTop: '24px'
              }}
            >
              Miniaturizing AI to Power Intelligent Hearables and Wearables.
            </h2>
            <p 
              className="mx-auto leading-relaxed" 
              style={{ 
                fontSize: '1.125rem',
                fontWeight: 400,
                color: '#64748B', 
                fontFamily: 'Inter, system-ui, sans-serif',
                maxWidth: '700px',
                lineHeight: '1.6',
                marginBottom: '32px'
              }}
            >
              A centralized platform to analyze, compare and optimize IPHIPI's AI audio models with precision and speed.
            </p>
          </div>
        </section>

        {/* Project Comparison Section */}
        {projects.length >= 2 && (
          <section data-project-comparison style={{ paddingTop: '60px', paddingBottom: '40px' }}>
            <ProjectComparison />
          </section>
        )}

        {/* Dashboard Section - Projects Grid */}
        <section style={{ paddingTop: '80px', paddingBottom: '80px' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            // Check if this project matches the search term
            const isHighlighted = searchTerm.trim() && (
              (project.name || '').toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
              (project.description || '').toLowerCase().includes(searchTerm.toLowerCase().trim())
            );

            return (
              <div
                key={project._id}
                className={`bg-white transition-all duration-300 cursor-pointer border overflow-hidden group ${
                  isHighlighted
                    ? 'border-indigo-500 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-200 transform scale-[1.02]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                style={{ 
                  boxShadow: isHighlighted ? '0 8px 30px rgba(79, 70, 229, 0.15)' : '0 8px 30px rgba(0,0,0,0.06)',
                  transform: isHighlighted ? 'scale(1.02)' : 'translateY(0)',
                  borderRadius: '14px'
                }}
                onMouseEnter={(e) => {
                  if (!isHighlighted) {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isHighlighted) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)';
                  }
                }}
                onClick={() => {
                  navigate(`/project/${project._id}`);
                }}
              >
                <div style={{ padding: '24px' }}>
                  <div className="flex items-start justify-between mb-4">
                    <h3 className={`text-xl font-bold transition-colors flex-1 ${
                      isHighlighted
                        ? 'text-indigo-900'
                        : 'text-slate-900 group-hover:text-indigo-600'
                    }`}
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {project.versions && project.versions.length > 0 && (
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                          style={{ 
                            color: '#4F46E5',
                            backgroundColor: '#EEF2FF'
                          }}>
                          {project.versions.length} {project.versions.length === 1 ? 'version' : 'versions'}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteProject(project._id, project.name, e)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
                        title="Delete project"
                        aria-label="Delete project"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {project.description && (
                    <p className={`text-sm leading-relaxed ${
                      isHighlighted ? 'text-indigo-700' : 'text-slate-600'
                    }`}
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {project.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add New Project Card */}
          <div
            onClick={() => setShowNewProjectModal(true)}
            className="bg-white transition-all duration-300 cursor-pointer border-2 border-dashed flex flex-col items-center justify-center min-h-[200px] group"
            style={{ 
              borderColor: '#CBD5E1',
              boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
              borderRadius: '14px',
              padding: '24px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4F46E5';
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)';
            }}
          >
            <div className="rounded-full p-4 mb-4 transition-colors" style={{ backgroundColor: '#EEF2FF' }}>
              <FiPlus className="text-3xl" style={{ color: '#4F46E5' }} />
            </div>
            <span className="font-semibold transition-colors text-base" style={{ color: '#64748B', fontFamily: 'Inter, system-ui, sans-serif' }}>
              Add New Project
            </span>
          </div>
        </div>
        </section>
      </main>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 className="text-2xl font-bold mb-6" style={{ color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Solovoice"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                  placeholder="Project description..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setNewProjectName('');
                    setNewProjectDesc('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Version Modal */}
      {showVersionModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 className="text-2xl font-bold mb-6" style={{ color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>
              Add Version to {selectedProject.name}
            </h3>
            <form onSubmit={handleCreateVersion}>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Version Number
                </label>
                <input
                  type="text"
                  required
                  value={newVersionNumber}
                  onChange={(e) => setNewVersionNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: '#E2E8F0',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: '#0F172A'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4F46E5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="e.g., v1, v2, v1.0"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={newVersionDesc}
                  onChange={(e) => setNewVersionDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 resize-none"
                  style={{ 
                    borderColor: '#E2E8F0',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: '#0F172A'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4F46E5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
                  rows="3"
                  placeholder="Version description..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowVersionModal(false);
                    setNewVersionNumber('');
                    setNewVersionDesc('');
                    setSelectedProject(null);
                  }}
                  className="px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200"
                  style={{ 
                    color: '#64748B',
                    fontFamily: 'Inter, system-ui, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#0F172A';
                    e.target.style.backgroundColor = '#F1F5F9';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#64748B';
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 text-sm font-semibold text-white rounded-xl transition-all duration-200 hover:shadow-lg"
                  style={{ 
                    backgroundColor: '#4F46E5',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#4338CA';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#4F46E5';
                    e.target.style.transform = 'translateY(0)';
                  }}
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

export default Home;

