import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiPlus,
  FiX,
  FiExternalLink,
  FiDownload,
  FiEdit2,
  FiTrash2,
  FiFilter,
  FiMusic,
  FiLink,
  FiUpload
} from 'react-icons/fi';

const ProjectReferences = ({ versionId, user }) => {
  const [projectReferences, setProjectReferences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterPlatform, setFilterPlatform] = useState('all'); // 'all', 'audacity', 'audio_com'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    platform: 'audacity',
    file: null // For Audacity file upload
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  // Debug: Log versionId when component receives it
  useEffect(() => {
    console.log('ProjectReferences component mounted/updated with versionId:', versionId);
  }, [versionId]);

  // Fetch project references
  const fetchProjectReferences = async () => {
    try {
      setLoading(true);
      const url = filterPlatform === 'all' 
        ? `http://localhost:5000/api/project-references/version/${versionId}`
        : `http://localhost:5000/api/project-references/version/${versionId}?platform=${filterPlatform}`;
      
      const response = await axios.get(url);
      setProjectReferences(response.data);
    } catch (error) {
      console.error('Error fetching project references:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (versionId) {
      console.log('ProjectReferences: versionId received:', versionId);
      fetchProjectReferences();
    } else {
      console.warn('ProjectReferences: versionId is missing!');
    }
  }, [versionId, filterPlatform]);

  // Handle file upload for Audacity projects
  const handleFileUpload = async (fileOrFiles) => {
    try {
      setUploadingFile(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('You must be logged in to upload files.');
      }
      
      if (!fileOrFiles) {
        throw new Error('No file selected');
      }
      
      const uploadFormData = new FormData();
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      };
      
      // Check if it's an array (folder upload) or single file
      const isArray = Array.isArray(fileOrFiles);
      const isFileList = fileOrFiles instanceof FileList;
      
      console.log('Uploading:', {
        isArray,
        isFileList,
        fileCount: isArray ? fileOrFiles.length : isFileList ? fileOrFiles.length : 1,
        fileName: isArray ? fileOrFiles[0]?.name : isFileList ? fileOrFiles[0]?.name : fileOrFiles?.name
      });
      
      if (isArray || isFileList) {
        // Folder upload
        const filesToUpload = isArray ? fileOrFiles : Array.from(fileOrFiles);
        
        if (filesToUpload.length === 0) {
          throw new Error('No files selected for folder upload');
        }
        
        filesToUpload.forEach((file) => {
          uploadFormData.append('files', file);
        });
        uploadFormData.append('versionId', versionId);
        
        console.log('Uploading folder with', filesToUpload.length, 'files');
        const response = await axios.post(`http://localhost:5000/api/project-references/upload-folder`, uploadFormData, config);
        
        return response.data.folderPath || response.data.path;
      } else {
        // Single file upload
        if (!(fileOrFiles instanceof File)) {
          throw new Error('Invalid file object');
        }
        
        uploadFormData.append('file', fileOrFiles);
        uploadFormData.append('versionId', versionId);
        
        console.log('Uploading single file:', fileOrFiles.name, fileOrFiles.size, 'bytes');
        console.log('Upload URL:', 'http://localhost:5000/api/project-references/upload');
        console.log('FormData entries:');
        for (let pair of uploadFormData.entries()) {
          console.log('  ', pair[0], ':', pair[1] instanceof File ? `${pair[1].name} (${pair[1].size} bytes)` : pair[1]);
        }
        
        const response = await axios.post(`http://localhost:5000/api/project-references/upload`, uploadFormData, config);
        console.log('✅ Upload response:', response.status, response.data);
        
        return response.data.filePath || response.data.path;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to upload file. Please try again.';
      throw new Error(errorMsg);
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('You must be logged in to add project references. Please log in and try again.');
        return;
      }

      let finalLink = formData.link;

      // If Audacity platform and file is selected, upload it first
      if (formData.platform === 'audacity' && formData.file && !formData.link) {
        try {
          finalLink = await handleFileUpload(formData.file);
        } catch (uploadError) {
          alert(uploadError.message || 'Failed to upload file. Please try again.');
          return;
        }
      }

      // Validate that we have either a link or uploaded file
      if (formData.platform === 'audacity' && !finalLink && !formData.file) {
        alert('Please provide either a file upload or a link for Audacity projects.');
        return;
      }
      
      if (formData.platform === 'audio_com' && !finalLink) {
        alert('Please provide a link for Audio.com projects.');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const payload = editingId 
        ? { ...formData, link: finalLink || formData.link }
        : {
            title: formData.title,
            description: formData.description,
            link: finalLink || formData.link,
            platform: formData.platform,
            versionId
          };

      // Validate required fields
      if (!payload.versionId && !editingId) {
        console.error('ProjectReferences: versionId is missing in payload:', payload);
        console.error('ProjectReferences: versionId prop:', versionId);
        alert('Version ID is missing. Please refresh the page and try again.');
        return;
      }

      // Additional validation: check if versionId is a valid MongoDB ObjectId format
      if (!editingId && payload.versionId && !/^[0-9a-fA-F]{24}$/.test(payload.versionId)) {
        console.error('ProjectReferences: Invalid versionId format:', payload.versionId);
        alert('Invalid version ID format. Please refresh the page and try again.');
        return;
      }

      if (!payload.title || !payload.description || !payload.link || !payload.platform) {
        alert('Please fill in all required fields.');
        return;
      }

      console.log('Submitting project reference:', payload);
      console.log('VersionId being sent:', payload.versionId);
      console.log('VersionId type:', typeof payload.versionId);
      console.log('VersionId length:', payload.versionId?.length);

      console.log('Making API request:', editingId ? 'PUT' : 'POST');
      console.log('URL:', editingId 
        ? `http://localhost:5000/api/project-references/${editingId}`
        : 'http://localhost:5000/api/project-references');
      console.log('Payload:', { ...payload, description: payload.description?.substring(0, 50) + '...' });
      console.log('Config headers:', config.headers);

      if (editingId) {
        // Update existing
        const response = await axios.put(`http://localhost:5000/api/project-references/${editingId}`, payload, config);
        console.log('Update response:', response.status, response.data);
      } else {
        // Create new
        const response = await axios.post('http://localhost:5000/api/project-references', payload, config);
        console.log('Create response:', response.status, response.data);
      }

      // Reset form
      setFormData({ title: '', description: '', link: '', platform: 'audacity', file: null });
      setShowAddForm(false);
      setEditingId(null);
      fetchProjectReferences();
    } catch (error) {
      console.error('Error saving project reference:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      
      let errorMessage = 'Failed to save project reference';
      
      if (error.response) {
        // Server responded with error
        const serverError = error.response.data?.error || error.response.data?.message;
        const errorDetails = error.response.data?.details;
        
        if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.response.status === 404) {
          errorMessage = serverError || 'Resource not found. Please refresh the page.';
        } else if (error.response.status === 400) {
          // Show the actual validation error from backend
          errorMessage = serverError || 'Invalid data provided. Please check your inputs.';
          if (errorDetails) {
            errorMessage += `\n\nDetails: ${errorDetails}`;
          }
        } else if (error.response.status === 500) {
          // Show server error details if available
          errorMessage = serverError || 'Server error occurred. Please try again.';
          if (errorDetails) {
            errorMessage += `\n\nDetails: ${errorDetails}`;
          }
        } else {
          errorMessage = serverError || errorMessage;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Unable to connect to server. Please check if the backend server is running on port 5000.';
      } else {
        // Error setting up request
        errorMessage = error.message || errorMessage;
      }
      
      console.error('Full error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      alert(errorMessage);
    }
  };

  // Handle edit
  const handleEdit = (ref) => {
    setFormData({
      title: ref.title,
      description: ref.description,
      link: ref.link,
      platform: ref.platform
    });
    setEditingId(ref._id);
    setShowAddForm(true);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project reference?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/project-references/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchProjectReferences();
    } catch (error) {
      console.error('Error deleting project reference:', error);
      alert(error.response?.data?.error || 'Failed to delete project reference');
    }
  };

  // Handle open project
  const handleOpenProject = (ref) => {
    if (ref.platform === 'audacity') {
      // Try to open in Audacity (file:// protocol) or download
      if (ref.link.startsWith('http')) {
        // If it's a URL, open in new tab
        window.open(ref.link, '_blank');
      } else {
        // If it's a file path, try to download or open
        const link = ref.link.startsWith('/') 
          ? `${window.location.origin}${ref.link}`
          : ref.link;
        window.open(link, '_blank');
      }
    } else if (ref.platform === 'audio_com') {
      // Open Audio.com link in new tab
      window.open(ref.link, '_blank');
    }
  };

  // Handle download
  const handleDownload = async (ref) => {
    try {
      // Only allow download for Audacity projects (not Audio.com URLs)
      if (ref.platform !== 'audacity') {
        // For Audio.com, just open the link
        if (ref.link.startsWith('http')) {
          window.open(ref.link, '_blank');
        }
        return;
      }

      // For Audacity projects, download the file
      if (ref.link.startsWith('http')) {
        // If it's already a full URL, download it directly
        try {
          const response = await axios.get(ref.link, {
            responseType: 'blob',
            timeout: 30000
          });
          const blob = new Blob([response.data]);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          // Extract filename from URL or use title
          const urlPath = new URL(ref.link).pathname;
          const fileName = urlPath.split('/').pop() || ref.title || 'audacity-project';
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch (error) {
          console.error('Error downloading from URL:', error);
          // Fallback: open in new tab
          window.open(ref.link, '_blank');
        }
      } else {
        // For file paths, construct the correct server URL
        // Remove leading slash if present, then prepend with uploads base URL
        const filePath = ref.link.startsWith('/') ? ref.link.substring(1) : ref.link;
        const downloadUrl = `http://localhost:5000/uploads/${filePath}`;
        
        console.log('Downloading Audacity project:', {
          originalLink: ref.link,
          filePath: filePath,
          downloadUrl: downloadUrl,
          title: ref.title
        });

        try {
          const response = await axios.get(downloadUrl, {
            responseType: 'blob',
            timeout: 60000 // 60 seconds for large files/folders
          });

          const blob = new Blob([response.data]);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          
          // Determine filename: extract from path or use title
          const pathParts = filePath.split('/');
          let fileName = pathParts[pathParts.length - 1] || ref.title || 'audacity-project';
          
          // If fileName doesn't have an extension, try to get it from Content-Disposition header
          const contentDisposition = response.headers['content-disposition'];
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
              fileName = filenameMatch[1].replace(/['"]/g, '');
            }
          }
          
          // If still no extension and it's an Audacity project, add appropriate extension
          let finalFileName = fileName;
          if (!fileName.includes('.')) {
            // Check content type to determine if it's a zip (folder) or single file
            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('zip') || contentType.includes('application/zip') || contentType.includes('application/x-zip')) {
              finalFileName = `${fileName}.zip`;
            } else if (contentType.includes('application/octet-stream')) {
              // For binary files, preserve original filename or use .aup
              finalFileName = ref.title ? `${ref.title}.aup` : `${fileName}.aup`;
            } else {
              // Default to .aup for Audacity projects
              finalFileName = `${fileName}.aup`;
            }
          }
          
          // Clean filename: remove any invalid characters
          finalFileName = finalFileName.replace(/[<>:"/\\|?*]/g, '_');
          
          a.download = finalFileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          console.log('✅ File downloaded successfully:', finalFileName);
        } catch (error) {
          console.error('Error downloading file:', error);
          console.error('Error details:', {
            message: error.message,
            response: error.response?.status,
            responseData: error.response?.data
          });
          
          if (error.response?.status === 404) {
            alert(`File not found: ${filePath}\n\nThe file may have been moved or deleted.`);
          } else if (error.response?.status === 403) {
            alert('Access denied. You may not have permission to download this file.');
          } else {
            alert(`Failed to download project: ${error.message || 'Unknown error'}\n\nPlease try again or contact support.`);
          }
        }
      }
    } catch (error) {
      console.error('Error downloading project:', error);
      alert(`Failed to download project: ${error.message || 'Unknown error'}`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Project References</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage Audacity and Audio.com project links for this version
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-600" />
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="all">All Projects</option>
              <option value="audacity">Audacity Only</option>
              <option value="audio_com">Audio.com Only</option>
            </select>
          </div>
          
          {/* Add Button - Always visible in header */}
          <button
            onClick={() => {
              // Check if user is logged in
              const token = localStorage.getItem('token');
              if (!token) {
                alert('Please log in to add project references.');
                return;
              }
              setShowAddForm(true);
              setEditingId(null);
              setFormData({ title: '', description: '', link: '', platform: 'audacity' });
            }}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
            title="Add Audacity or Audio.com Project"
          >
            <FiPlus className="mr-2" size={18} />
            Add Project
          </button>
        </div>
      </div>

      {/* Floating Add Button - Always visible */}
      <button
        onClick={() => {
          // Check if user is logged in
          const token = localStorage.getItem('token');
          if (!token) {
            alert('Please log in to add project references.');
            return;
          }
          setShowAddForm(true);
          setEditingId(null);
          setFormData({ title: '', description: '', link: '', platform: 'audacity' });
        }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center z-50"
        title="Add Audacity or Audio.com Project"
      >
        <FiPlus size={24} />
      </button>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingId ? 'Edit Project Reference' : 'Add New Project (Audacity / Audio.com)'}
            </h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setFormData({ title: '', description: '', link: '', platform: 'audacity', file: null });
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Noise Test - Traffic 55dB"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                required
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Brief description about the test/audio/noise scenario (2-3 lines)"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform *
              </label>
              <select
                required
                value={formData.platform}
                onChange={(e) => {
                  // Reset file when switching platforms
                  setFormData({ ...formData, platform: e.target.value, file: null });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="audacity">Audacity Project</option>
                <option value="audio_com">Audio.com Project</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.platform === 'audacity' ? 'Project File/Folder *' : 'Project Link *'}
              </label>
              
              {formData.platform === 'audacity' ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <label htmlFor="audacity-file-input" className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        id="audacity-file-input"
                        accept="*/*"
                        onChange={(e) => {
                          const input = e.target;
                          const file = input.files?.[0];
                          console.log('File input onChange triggered:', {
                            files: input.files,
                            fileCount: input.files?.length || 0,
                            firstFile: file ? { 
                              name: file.name, 
                              size: file.size, 
                              type: file.type,
                              lastModified: file.lastModified
                            } : null
                          });
                          
                          if (file) {
                            console.log('✅ File selected successfully:', file.name, file.size, 'bytes');
                            setFormData(prev => ({ ...prev, file: file, link: '' }));
                          } else {
                            console.log('❌ No file selected');
                            setFormData(prev => ({ ...prev, file: null }));
                          }
                        }}
                        className="hidden"
                      />
                      <div 
                        className="px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-colors text-center cursor-pointer bg-gray-50 hover:bg-gray-100"
                      >
                        <FiUpload className="mx-auto mb-1 text-gray-400" size={20} />
                        <span className="text-sm text-gray-600 block">
                          {formData.file && !Array.isArray(formData.file) 
                            ? formData.file.name 
                            : 'Click to upload Audacity file'}
                        </span>
                        {formData.file && !Array.isArray(formData.file) && (
                          <span className="text-xs text-gray-500 block mt-1">
                            {formData.file.size > 1024 * 1024 
                              ? `${(formData.file.size / (1024 * 1024)).toFixed(2)} MB`
                              : `${(formData.file.size / 1024).toFixed(2)} KB`}
                          </span>
                        )}
                      </div>
                    </label>
                    <label htmlFor="audacity-folder-input" className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        id="audacity-folder-input"
                        webkitdirectory=""
                        directory=""
                        multiple
                        onChange={(e) => {
                          const input = e.target;
                          const files = input.files;
                          console.log('Folder input onChange triggered:', {
                            files: files,
                            fileCount: files?.length || 0
                          });
                          
                          if (files && files.length > 0) {
                            console.log('✅ Folder selected successfully:', files.length, 'files');
                            // Convert FileList to Array for easier handling
                            const filesArray = Array.from(files);
                            setFormData(prev => ({ ...prev, file: filesArray, link: '' }));
                          } else {
                            console.log('❌ No files selected');
                            setFormData(prev => ({ ...prev, file: null }));
                          }
                        }}
                        className="hidden"
                      />
                      <div 
                        className="px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-colors text-center cursor-pointer bg-gray-50 hover:bg-gray-100"
                      >
                        <FiUpload className="mx-auto mb-1 text-gray-400" size={20} />
                        <span className="text-sm text-gray-600 block">
                          {formData.file && Array.isArray(formData.file) 
                            ? `${formData.file.length} files selected` 
                            : 'Click to upload folder'}
                        </span>
                        {formData.file && Array.isArray(formData.file) && formData.file.length > 0 && (
                          <span className="text-xs text-gray-500 block mt-1">
                            {formData.file[0].name} {formData.file.length > 1 ? `+ ${formData.file.length - 1} more` : ''}
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                  {(formData.file || formData.link) && (
                    <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 p-2 rounded">
                      {formData.file 
                        ? (Array.isArray(formData.file) 
                          ? `✅ Folder with ${formData.file.length} files selected` 
                          : `✅ File selected: ${formData.file.name} (${formData.file.size > 1024 * 1024 ? `${(formData.file.size / (1024 * 1024)).toFixed(2)} MB` : `${(formData.file.size / 1024).toFixed(2)} KB`})`)
                        : formData.link 
                          ? `✅ URL: ${formData.link.substring(0, 50)}${formData.link.length > 50 ? '...' : ''}`
                          : ''}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Or enter a URL:
                  </div>
                  <input
                    type="text"
                    value={formData.link}
                    onChange={(e) => {
                      if (e.target.value) {
                        setFormData(prev => ({ ...prev, link: e.target.value, file: null }));
                      } else {
                        setFormData(prev => ({ ...prev, link: '' }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="File path or URL to Audacity project (optional if uploading file)"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Audio.com project URL"
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  setFormData({ title: '', description: '', link: '', platform: 'audacity' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingFile}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingFile ? 'Uploading...' : editingId ? 'Update' : 'Add'} Project Reference
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Project References List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading project references...</p>
        </div>
      ) : projectReferences.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
          <FiLink className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600 mb-4">No project references found</p>
          {user && (
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingId(null);
                setFormData({ title: '', description: '', link: '', platform: 'audacity' });
              }}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
            >
              <FiPlus className="mr-2" size={20} />
              Add Your First Project Reference
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectReferences.map((ref) => (
            <div
              key={ref._id}
              className="bg-white rounded-lg shadow-md p-5 border border-gray-200 hover:shadow-lg transition-shadow"
            >
              {/* Platform Icon */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {ref.platform === 'audacity' ? (
                    <FiMusic className="text-purple-600" size={24} />
                  ) : (
                    <FiLink className="text-blue-600" size={24} />
                  )}
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700 uppercase">
                    {ref.platform === 'audacity' ? 'Audacity' : 'Audio.com'}
                  </span>
                </div>
                
                {/* Edit/Delete Actions - Only show for owner */}
                {user && ref.uploadedBy?._id === user.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(ref)}
                      className="text-gray-500 hover:text-indigo-600 transition-colors"
                      title="Edit"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(ref._id)}
                      className="text-gray-500 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                {ref.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {ref.description}
              </p>

              {/* Uploader Info and Date */}
              <div className="mb-4">
                {ref.uploadedBy && (
                  <p className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">User ({ref.uploadedBy.name || ref.uploadedBy.email || 'Unknown'})</span> uploaded this project
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {formatDate(ref.createdAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-200">
                {ref.platform === 'audacity' ? (
                  // Audacity: Only Download button
                  <button
                    onClick={() => handleDownload(ref)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                    title="Download Audacity Project"
                  >
                    <FiDownload className="mr-2" size={16} />
                    Download Project
                  </button>
                ) : (
                  // Audio.com: Only Open Project button
                  <button
                    onClick={() => handleOpenProject(ref)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <FiExternalLink className="mr-2" size={16} />
                    Open Project
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectReferences;

