import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import NavigationBar from '../components/NavigationBar';
import { getVersion } from '../api/versions';
import { getProject } from '../api/projects';

const VersionPage = () => {
  const { versionId } = useParams();
  const navigate = useNavigate();
  const [version, setVersion] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVersionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId]);

  const fetchVersionData = async () => {
    try {
      const versionResponse = await getVersion(versionId);
      setVersion(versionResponse.data);
      
      if (versionResponse.data.projectId) {
        const projectResponse = await getProject(
          versionResponse.data.projectId._id || versionResponse.data.projectId
        );
        setProject(projectResponse.data);
      }
    } catch (error) {
      console.error('Error fetching version data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const projectName = version?.projectId?.name || project?.name || 'Project';
  const versionNumber = version?.versionNumber || '';
  const projectId =
    (version?.projectId && version.projectId._id) ||
    (version?.projectId && typeof version.projectId === 'string' && version.projectId) ||
    project?._id ||
    null;

  const projectNameWithVersion = versionNumber 
    ? `${projectName} ${versionNumber}`
    : projectName;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50">
      <NavigationBar 
        projectName={projectNameWithVersion} 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showSearch={true}
        onBack={() => {
          if (projectId) {
            navigate(`/project/${projectId}`);
          } else {
            navigate('/home');
          }
        }}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Version Description (if available) */}
        {version?.description && (
          <div className="mb-6">
            <p className="text-base text-slate-600">{version.description}</p>
          </div>
        )}

        {/* SQA and Development Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Subjective SQA Card */}
          <Link
            to={`/version/${versionId}/sqa?type=subjective`}
            className="bg-white rounded-lg shadow-sm p-8 transition-all cursor-pointer text-center border border-slate-200 hover:shadow-lg hover:bg-gradient-to-br hover:from-purple-50 hover:via-purple-50/30 hover:to-purple-50/20 hover:border-purple-300 group"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-5 group-hover:bg-purple-200 transition-colors">
              <span className="text-2xl font-bold text-purple-700">SUB</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Subjective</h3>
            <p className="text-slate-600 text-sm">Subjective SQA Reports</p>
          </Link>

          {/* Objective SQA Card */}
          <Link
            to={`/version/${versionId}/sqa?type=objective`}
            className="bg-white rounded-lg shadow-sm p-8 transition-all cursor-pointer text-center border border-slate-200 hover:shadow-lg hover:bg-gradient-to-br hover:from-indigo-50 hover:via-indigo-50/30 hover:to-indigo-50/20 hover:border-indigo-300 group"
          >
            <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-5 group-hover:bg-indigo-200 transition-colors">
              <span className="text-2xl font-bold text-indigo-700">OBJ</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Objective</h3>
            <p className="text-slate-600 text-sm">Objective SQA Reports</p>
          </Link>

          {/* Development Button */}
          <Link
            to={`/version/${versionId}/development`}
            className="bg-white rounded-lg shadow-sm p-8 transition-all cursor-pointer text-center border border-slate-200 hover:shadow-lg hover:bg-gradient-to-br hover:from-blue-50 hover:via-indigo-50/30 hover:to-purple-50/20 hover:border-blue-300 group"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-5 group-hover:bg-slate-200 transition-colors">
              <span className="text-2xl font-bold text-slate-700">DEV</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Development</h3>
            <p className="text-slate-600 text-sm">Technical notes and progress</p>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default VersionPage;
