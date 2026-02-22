import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationBar from '../components/NavigationBar';
import { FiUpload, FiDownload, FiTrash2, FiSave } from 'react-icons/fi';
import { getVersion } from '../api/versions';
import { getProject } from '../api/projects';
import { API_BASE_URL } from '../api/axiosClient';
import {
  getDevelopment,
  updateDevelopment,
  uploadFiles,
  uploadFolders,
  deleteFile,
  deleteFolder,
} from '../api/development';

const DevelopmentPage = () => {
  const { versionId } = useParams();
  const navigate = useNavigate();

  const [development, setDevelopment] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFiles, setShowFiles] = useState(false);

  useEffect(() => {
    fetchDevelopmentData();
    fetchProjectInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId]);

  const fetchProjectInfo = async () => {
    try {
      const versionResponse = await getVersion(versionId);
      if (versionResponse.data.projectId) {
        const projectResponse = await getProject(
          versionResponse.data.projectId._id || versionResponse.data.projectId
        );
        setProjectName(projectResponse.data.name);
      }
    } catch (error) {
      console.error('Error fetching project info:', error);
    }
  };

  const fetchDevelopmentData = async () => {
    try {
      const response = await getDevelopment(versionId);
      setDevelopment(response.data);
      setNotes(response.data.notes || '');
    } catch (error) {
      console.error('Error fetching development data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateDevelopment(versionId, { notes });
      alert('Saved successfully!');
      fetchDevelopmentData();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save');
    }
  };

  const handleFileUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('versionId', versionId);

      await uploadFiles(versionId, formData);
      fetchDevelopmentData();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const handleFolderUpload = async (files) => {
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('versionId', versionId);
      formData.append('folderName', `Folder_${Date.now()}`);

      await uploadFolders(versionId, formData);
      fetchDevelopmentData();
    } catch (error) {
      console.error('Error uploading folder:', error);
      alert('Failed to upload folder');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await deleteFile(versionId, fileId);
      fetchDevelopmentData();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('Are you sure you want to delete this folder?')) return;

    try {
      await deleteFolder(versionId, folderId);
      fetchDevelopmentData();
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Failed to delete folder');
    }
  };

  const handleDownload = (filePath, fileName) => {
    window.open(`${API_BASE_URL}/uploads/${filePath}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation Bar */}
      <NavigationBar 
        projectName={projectName ? `${projectName} - Development` : 'Development'} 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showSearch={false}
        onBack={() => navigate(`/version/${versionId}`)}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notes Section */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-80 px-4 py-3 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 resize-none text-sm text-slate-700"
              placeholder="Add your development notes here..."
            />
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
          >
            <FiSave className="mr-2" size={16} />
            Save Changes
          </button>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Files</h3>
          <div className="flex space-x-4">
            <label className="block">
              <input
                type="file"
                onChange={(e) => {
                  Array.from(e.target.files).forEach(file => handleFileUpload(file));
                }}
                className="hidden"
                id="file-upload"
                multiple
              />
              <span className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700">
                <FiUpload className="mr-2" />
                Upload Files
              </span>
            </label>
            <label className="block">
              <input
                type="file"
                directory=""
                webkitdirectory=""
                onChange={(e) => handleFolderUpload(e.target.files)}
                className="hidden"
                id="folder-upload"
              />
              <span className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700">
                <FiUpload className="mr-2" />
                Upload Folders
              </span>
            </label>
          </div>
        </div>

        {/* Files and Folders Section */}
        {development && ((development.files && development.files.length > 0) || (development.folders && development.folders.length > 0)) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Uploaded Files & Folders</h3>
              <button
                onClick={() => setShowFiles(!showFiles)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {showFiles ? 'Hide Files' : 'Show Files'}
              </button>
            </div>
            
            {!showFiles ? (
              <p className="text-gray-400 text-sm">
                {development.files && development.files.length > 0 && `${development.files.length} file(s) uploaded. `}
                {development.folders && development.folders.length > 0 && `${development.folders.length} folder(s) uploaded. `}
                Click 'Show Files' to view all files.
              </p>
            ) : (
              <div className="space-y-6">
                {/* Files List */}
                {development.files && development.files.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Uploaded Files ({development.files.length})</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {development.files.map((file) => (
                            <tr key={file._id}>
                              <td className="px-4 py-3 text-sm text-gray-900">{file.fileName}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {(file.fileSize / 1024).toFixed(2)} KB
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleDownload(file.filePath, file.fileName)}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    <FiDownload />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFile(file._id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Folders List */}
                {development.folders && development.folders.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Uploaded Folders ({development.folders.length})</h4>
                    <div className="space-y-4">
                      {development.folders.map((folder) => (
                        <div key={folder._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-gray-900">{folder.folderName}</h4>
                            <button
                              onClick={() => handleDeleteFolder(folder._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {folder.files && folder.files.map((file, index) => (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="text-gray-700">{file.fileName}</span>
                                <button
                                  onClick={() => handleDownload(file.filePath, file.fileName)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  <FiDownload />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DevelopmentPage;
