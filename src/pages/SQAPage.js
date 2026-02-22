import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import NavigationBar from '../components/NavigationBar';
import QuadrantView from '../components/QuadrantView';
import ExcelMetricVisualization from '../components/ExcelMetricVisualization';
import ProjectReferences from '../components/ProjectReferences';
import ShareLink from '../components/ShareLink';
import { API_BASE_URL } from '../config';
import {
  FiUpload,
  FiDownload,
  FiTrash2,
  FiFilter,
  FiX,
  FiEdit2
} from 'react-icons/fi';

const SQAPage = () => {
  const { versionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useContext(AuthContext);

  // State for project and version info
  const [projectName, setProjectName] = useState('');
  const [versionNumber, setVersionNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // State for reports
  const [subjectiveReports, setSubjectiveReports] = useState([]);
  const [objectiveReports, setObjectiveReports] = useState([]);
  
  // State for SQA Results
  const [sqaResults, setSqaResults] = useState([]);
  const [showSqaResultForm, setShowSqaResultForm] = useState(false);
  const [sqaResultForm, setSqaResultForm] = useState({
    name: '',
    metrics: '',
    inputFiles: null,
    outputFiles: null,
    finalExcel: null
  });
  const [uploading, setUploading] = useState(false);
  const [editingResultId, setEditingResultId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    metrics: '',
    inputFiles: null,
    outputFiles: null,
    finalExcel: null
  });
  
  // State for filters - separate for subjective and objective
  const [filtersByType, setFiltersByType] = useState({
    subjective: {
      metric: '',
      operation: '',
      value: '',
      resultName: '',
      fileName: ''
    },
    objective: {
      metric: '',
      operation: '',
      value: '',
      resultName: '',
      fileName: ''
    }
  });
  const [filteredResultsByType, setFilteredResultsByType] = useState({
    subjective: null,
    objective: null
  });
  const [showFilters, setShowFilters] = useState(false);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [showAddMetricInput, setShowAddMetricInput] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');
  const [highlightedFile, setHighlightedFile] = useState(null);
  const scrollListenerRef = useRef(null);
  const filterButtonRef = useRef(null);
  const [filterPanelTop, setFilterPanelTop] = useState(80);
  
  // Get current type from URL
  const currentType = searchParams.get('type') || 'all';
  
  // Get current filters and filtered results based on type
  const filters = currentType === 'subjective' ? filtersByType.subjective : 
                  currentType === 'objective' ? filtersByType.objective : 
                  { metric: '', operation: '', value: '', resultName: '', fileName: '' };
  const filteredResults = currentType === 'subjective' ? filteredResultsByType.subjective :
                          currentType === 'objective' ? filteredResultsByType.objective :
                          null;
  
  // Helper function to update filters for current type
  const updateFilters = useCallback((newFilters) => {
    const type = searchParams.get('type') || 'all';
    if (type === 'subjective') {
      setFiltersByType(prev => ({ ...prev, subjective: { ...prev.subjective, ...newFilters } }));
    } else if (type === 'objective') {
      setFiltersByType(prev => ({ ...prev, objective: { ...prev.objective, ...newFilters } }));
    }
  }, [searchParams]);
  
  // Helper function to update filtered results for current type
  const updateFilteredResults = useCallback((results) => {
    const type = searchParams.get('type') || 'all';
    if (type === 'subjective') {
      setFilteredResultsByType(prev => ({ ...prev, subjective: results }));
    } else if (type === 'objective') {
      setFilteredResultsByType(prev => ({ ...prev, objective: results }));
    }
  }, [searchParams]);
  
  // State for showing file/folder details
  const [showSubjectiveDetails, setShowSubjectiveDetails] = useState(false);
  const [showObjectiveDetails, setShowObjectiveDetails] = useState(false);

  const fetchProjectInfo = useCallback(async () => {
    try {
      const versionResponse = await axios.get(`${API_BASE_URL}/api/versions/${versionId}`);
      if (versionResponse.data) {
        // Set version number
        if (versionResponse.data.versionNumber) {
          setVersionNumber(versionResponse.data.versionNumber);
        }
        // Fetch project name
        if (versionResponse.data.projectId) {
          const projectResponse = await axios.get(
            `${API_BASE_URL}/api/projects/${versionResponse.data.projectId._id || versionResponse.data.projectId}`
          );
          setProjectName(projectResponse.data.name);
        }
      }
    } catch (error) {
      console.error('Error fetching project info:', error);
    }
  }, [versionId]);

  const fetchReports = useCallback(async (type) => {
    try {
      if (type === 'objective') {
        // Use separate Objective API - only interacts with objective_results collection
        console.log('[FRONTEND] Fetching objective results from /api/objective');
        const response = await axios.get(`${API_BASE_URL}/api/objective/${versionId}`);
        console.log('[FRONTEND] Objective results received:', response.data.length);
        
        // Transform Objective Results to match the reports format for display
        const transformedResults = response.data.map(result => ({
          _id: result._id,
          fileName: result.finalExcel?.fileName || result.name,
          fileSize: result.finalExcel?.fileSize || 0,
          filePath: result.finalExcel?.filePath || '',
          name: result.name,
          isResult: true // Flag to identify as Objective Result
        }));
        setObjectiveReports(transformedResults);
      } else if (type === 'subjective') {
        // For subjective, fetch ONLY SQA Reports (not SQA Results)
        // This endpoint returns SQAReport documents with type='subjective'
        console.log('[FRONTEND] Fetching subjective reports from /api/sqa/reports');
        const response = await axios.get(
          `${API_BASE_URL}/api/sqa/reports/${versionId}?type=subjective`
        );
        console.log('[FRONTEND] Subjective reports received:', response.data.length);
        
        // Additional filter to ensure we only get subjective reports
        const subjectiveReports = response.data.filter(report => 
          report.type === 'subjective'
        );
        // Set ONLY subjective reports - this should not affect objective
        setSubjectiveReports(subjectiveReports);
      }
    } catch (error) {
      console.error(`Error fetching ${type} reports:`, error);
      // On error, set empty array to prevent showing wrong data
      if (type === 'objective') {
        setObjectiveReports([]);
      } else if (type === 'subjective') {
        setSubjectiveReports([]);
      }
    }
  }, [versionId]);

  const fetchSqaResults = useCallback(async () => {
    try {
      const type = searchParams.get('type');
      // Fetch SQA Results for subjective and all pages
      // Don't fetch for objective page (objective uses "Upload Result" form instead)
      if (type === 'objective') {
        setSqaResults([]);
        return;
      }
      // Use separate Subjective API - only interacts with subjective_results collection
      console.log('[FRONTEND] Fetching subjective results from /api/subjective for versionId:', versionId);
      const response = await axios.get(`${API_BASE_URL}/api/subjective/${versionId}`);
      console.log('[FRONTEND] Subjective results received:', response.data);
      console.log('[FRONTEND] Number of results:', response.data.length);
      
      // Ensure we set the results even if empty array
      setSqaResults(response.data || []);
      
      if (response.data && response.data.length > 0) {
        console.log('[FRONTEND] Results data:', response.data.map(r => ({ id: r._id, name: r.name })));
      }
    } catch (error) {
      console.error('[FRONTEND] Error fetching SQA Results:', error);
      console.error('[FRONTEND] Error details:', error.response?.data);
      setSqaResults([]);
    }
  }, [versionId, searchParams]);

  // Default permanent metrics that should always be available
  const DEFAULT_METRICS = [
    'Noise Suppression',
    'Voice Quality',
    'Speech Chops',
    'Speech Comprehensibility'
  ];

  // Metrics to exclude from subjective SQA page dropdown
  const SUBJECTIVE_EXCLUDED_METRICS = [
    'BG Speech',
    'Comment Tags',
    'File Description Tags',
    'Primary Speaker',
    'rms noisy',
    'rms processed',
    'Noise Type',
    'dB/SNR Level',
    'SNR Level',
    'dB Level',
    'File Names',
    'Filename',
    'File Name',
    'Name',
    'File',
    'Files',
    'Comments',
    'Comment',
    'Audio',
    'Input',
    'Output',
    'Speech Comprehensiiblty', // Typo version
    'speech chops' // Lowercase version
  ];

  // Function to filter metrics for subjective page
  const filterMetricsForSubjective = useCallback((metrics) => {
    if (!Array.isArray(metrics)) return [];
    
    const seen = new Set();
    const filtered = [];
    
    for (const metric of metrics) {
      if (!metric || typeof metric !== 'string') continue;
      
      const normalized = metric.trim();
      if (!normalized) continue;
      
      const lowerMetric = normalized.toLowerCase();
      
      // Check if already seen (case-insensitive)
      if (seen.has(lowerMetric)) continue;
      
      // Check if excluded (case-insensitive)
      const isExcluded = SUBJECTIVE_EXCLUDED_METRICS.some(excluded => 
        lowerMetric === excluded.toLowerCase() || 
        lowerMetric.includes(excluded.toLowerCase())
      );
      
      if (isExcluded) continue;
      
      // Check for common unwanted patterns
      if (lowerMetric.includes('tag') || 
          lowerMetric.includes('description') ||
          lowerMetric.includes('comment') ||
          lowerMetric === 'bg speech' ||
          lowerMetric === 'primary speaker' ||
          lowerMetric.startsWith('rms ')) {
        continue;
      }
      
      seen.add(lowerMetric);
      filtered.push(normalized);
    }
    
    return filtered.sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper functions to manage custom metrics in localStorage
  const getCustomMetricsKey = useCallback(() => {
    return `customMetrics_${versionId}`;
  }, [versionId]);

  const getGlobalCustomMetricsKey = useCallback(() => {
    return 'customMetrics_global';
  }, []);

  // Load version-specific custom metrics
  const loadCustomMetrics = useCallback(() => {
    try {
      const key = getCustomMetricsKey();
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading custom metrics:', error);
      return [];
    }
  }, [getCustomMetricsKey]);

  // Load global custom metrics (across all versions)
  const loadGlobalCustomMetrics = useCallback(() => {
    try {
      const key = getGlobalCustomMetricsKey();
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading global custom metrics:', error);
      return [];
    }
  }, [getGlobalCustomMetricsKey]);

  // Save version-specific custom metrics
  const saveCustomMetrics = useCallback((metrics) => {
    try {
      const key = getCustomMetricsKey();
      localStorage.setItem(key, JSON.stringify(metrics));
    } catch (error) {
      console.error('Error saving custom metrics:', error);
    }
  }, [getCustomMetricsKey]);

  // Save global custom metrics
  const saveGlobalCustomMetrics = useCallback((metrics) => {
    try {
      const key = getGlobalCustomMetricsKey();
      localStorage.setItem(key, JSON.stringify(metrics));
    } catch (error) {
      console.error('Error saving global custom metrics:', error);
    }
  }, [getGlobalCustomMetricsKey]);

  // Initialize default metrics in localStorage if not already present
  const initializeDefaultMetrics = useCallback(() => {
    try {
      const key = getGlobalCustomMetricsKey();
      const stored = localStorage.getItem(key);
      if (!stored) {
        // First time - save default metrics
        saveGlobalCustomMetrics(DEFAULT_METRICS);
      } else {
        // Check if default metrics are missing and add them
        const existing = JSON.parse(stored);
        const missingDefaults = DEFAULT_METRICS.filter(m => !existing.includes(m));
        if (missingDefaults.length > 0) {
          const updated = [...existing, ...missingDefaults].sort();
          saveGlobalCustomMetrics(updated);
        }
      }
    } catch (error) {
      console.error('Error initializing default metrics:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getGlobalCustomMetricsKey, saveGlobalCustomMetrics]);

  const addCustomMetric = useCallback((metric) => {
    const trimmedMetric = metric.trim();
    
    // Add to global custom metrics so it's available across all versions
    const globalCustomMetrics = loadGlobalCustomMetrics();
    if (!globalCustomMetrics.includes(trimmedMetric)) {
      const updatedGlobal = [...globalCustomMetrics, trimmedMetric].sort();
      saveGlobalCustomMetrics(updatedGlobal);
    }
    
    // Also add to version-specific metrics for backward compatibility
    const versionCustomMetrics = loadCustomMetrics();
    if (!versionCustomMetrics.includes(trimmedMetric)) {
      const updatedVersion = [...versionCustomMetrics, trimmedMetric].sort();
      saveCustomMetrics(updatedVersion);
    }
    
    return trimmedMetric;
  }, [loadCustomMetrics, saveCustomMetrics, loadGlobalCustomMetrics, saveGlobalCustomMetrics]);

  const fetchAvailableMetrics = useCallback(async () => {
    if (!versionId) return;
    setLoadingMetrics(true);
    try {
      // Initialize default metrics first
      initializeDefaultMetrics();
      
      const response = await axios.get(`${API_BASE_URL}/api/sqa-results/version-metrics/${versionId}`);
      const backendMetrics = response.data.metrics || [];
      
      // Load custom metrics from localStorage (version-specific and global)
      const versionCustomMetrics = loadCustomMetrics();
      const globalCustomMetrics = loadGlobalCustomMetrics();
      
      // Combine all metrics: default + backend + global custom + version-specific custom
      // Remove duplicates
      const allMetrics = [...new Set([
        ...DEFAULT_METRICS,
        ...backendMetrics,
        ...globalCustomMetrics,
        ...versionCustomMetrics
      ])];
      
      // Filter metrics based on page type (subjective vs objective)
      const type = searchParams.get('type');
      let filteredMetrics = allMetrics;
      
      // Apply filtering only for subjective page
      if (type === 'subjective' || !type || type === 'all') {
        filteredMetrics = filterMetricsForSubjective(allMetrics);
      }
      
      setAvailableMetrics(filteredMetrics.sort());
    } catch (error) {
      console.error('Error fetching available metrics:', error);
      // Even if backend fails, load default and custom metrics
      initializeDefaultMetrics();
      const versionCustomMetrics = loadCustomMetrics();
      const globalCustomMetrics = loadGlobalCustomMetrics();
      const allMetrics = [...new Set([
        ...DEFAULT_METRICS,
        ...globalCustomMetrics,
        ...versionCustomMetrics
      ])];
      
      // Filter metrics based on page type
      const type = searchParams.get('type');
      let filteredMetrics = allMetrics;
      
      // Apply filtering only for subjective page
      if (type === 'subjective' || !type || type === 'all') {
        filteredMetrics = filterMetricsForSubjective(allMetrics);
      }
      
      setAvailableMetrics(filteredMetrics.sort());
    } finally {
      setLoadingMetrics(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId, loadCustomMetrics, loadGlobalCustomMetrics, initializeDefaultMetrics, filterMetricsForSubjective, searchParams]);

  // Function to refresh metrics after adding a custom one
  const refreshMetrics = useCallback(async () => {
    if (!versionId) return;
    setLoadingMetrics(true);
    try {
      initializeDefaultMetrics();
      const response = await axios.get(`${API_BASE_URL}/api/sqa-results/version-metrics/${versionId}`);
      const backendMetrics = response.data.metrics || [];
      const versionCustomMetrics = loadCustomMetrics();
      const globalCustomMetrics = loadGlobalCustomMetrics();
      const allMetrics = [...new Set([
        ...DEFAULT_METRICS,
        ...backendMetrics,
        ...globalCustomMetrics,
        ...versionCustomMetrics
      ])];
      
      // Filter metrics based on page type (subjective vs objective)
      const type = searchParams.get('type');
      let filteredMetrics = allMetrics;
      
      // Apply filtering only for subjective page
      if (type === 'subjective' || !type || type === 'all') {
        // Filter backend metrics, but preserve custom metrics (they're user-added)
        const backendFiltered = filterMetricsForSubjective(backendMetrics);
        const defaultFiltered = filterMetricsForSubjective(DEFAULT_METRICS);
        // Custom metrics should always be included (user explicitly added them)
        filteredMetrics = [...new Set([
          ...defaultFiltered,
          ...backendFiltered,
          ...globalCustomMetrics,
          ...versionCustomMetrics
        ])];
      }
      
      setAvailableMetrics(filteredMetrics.sort());
    } catch (error) {
      console.error('Error refreshing metrics:', error);
      initializeDefaultMetrics();
      const versionCustomMetrics = loadCustomMetrics();
      const globalCustomMetrics = loadGlobalCustomMetrics();
      const allMetrics = [...new Set([
        ...DEFAULT_METRICS,
        ...globalCustomMetrics,
        ...versionCustomMetrics
      ])];
      
      // Filter metrics based on page type
      const type = searchParams.get('type');
      let filteredMetrics = allMetrics;
      
      // Apply filtering only for subjective page
      if (type === 'subjective' || !type || type === 'all') {
        // Preserve custom metrics even in error case
        const defaultFiltered = filterMetricsForSubjective(DEFAULT_METRICS);
        filteredMetrics = [...new Set([
          ...defaultFiltered,
          ...globalCustomMetrics,
          ...versionCustomMetrics
        ])];
      }
      
      setAvailableMetrics(filteredMetrics.sort());
    } finally {
      setLoadingMetrics(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId, loadCustomMetrics, loadGlobalCustomMetrics, initializeDefaultMetrics, filterMetricsForSubjective, searchParams]);

  // Handle adding a new metric
  const handleAddMetric = useCallback(async () => {
    if (!newMetricName.trim()) return;
    
    const trimmedMetric = newMetricName.trim();
    
    // Save to localStorage
    addCustomMetric(trimmedMetric);
    
    // Immediately add to availableMetrics state so it shows up right away
    setAvailableMetrics(prevMetrics => {
      const lowerTrimmed = trimmedMetric.toLowerCase();
      // Check if already exists (case-insensitive)
      const alreadyExists = prevMetrics.some(m => m.toLowerCase() === lowerTrimmed);
      if (alreadyExists) {
        return prevMetrics;
      }
      // Add the new metric and sort
      return [...prevMetrics, trimmedMetric].sort();
    });
    
    // Update filters with the new metric
    updateFilters({ metric: trimmedMetric });
    
    // Refresh available metrics to ensure consistency (runs in background)
    refreshMetrics().catch(err => {
      console.error('Error refreshing metrics:', err);
    });
    
    // Reset the input state
    setShowAddMetricInput(false);
    setNewMetricName('');
  }, [newMetricName, addCustomMetric, updateFilters, refreshMetrics]);

  const fetchData = useCallback(async () => {
    const type = searchParams.get('type');
    const promises = [];
    
    // Fetch SQA Results for subjective and all pages (not for objective)
    if (type !== 'objective') {
      promises.push(fetchSqaResults());
    }
    
    // Only fetch the relevant reports based on type parameter
    if (type === 'subjective') {
      // Clear objective reports to ensure independence
      setObjectiveReports([]);
      // Only fetch subjective reports (SQA Reports with type='subjective')
      promises.push(fetchReports('subjective'));
    } else if (type === 'objective') {
      // Clear subjective reports to ensure independence
      setSubjectiveReports([]);
      // Only fetch objective reports (SQA Results with Excel files)
      promises.push(fetchReports('objective'));
    } else {
      // If no type specified, fetch both (default behavior)
      promises.push(fetchReports('subjective'), fetchReports('objective'));
    }
    
    await Promise.all(promises);
  }, [fetchReports, fetchSqaResults, searchParams]);

  // Clear state immediately when type changes
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'objective') {
      // Immediately clear subjective reports and SQA Results when on objective page
      setSubjectiveReports([]);
      setSqaResults([]);
    } else if (type === 'subjective') {
      // Immediately clear objective reports when on subjective page
      // Keep SQA Results for subjective page (user needs it for uploading)
      setObjectiveReports([]);
    }
  }, [searchParams]);

  useEffect(() => {
    // Initialize default metrics on component mount
    initializeDefaultMetrics();
    fetchData();
    fetchProjectInfo();
    fetchAvailableMetrics();
  }, [fetchData, fetchProjectInfo, fetchAvailableMetrics, initializeDefaultMetrics]);

  // Refresh metrics when page type changes (subjective vs objective)
  useEffect(() => {
    fetchAvailableMetrics();
  }, [searchParams, fetchAvailableMetrics]);

  // Handle query parameter to scroll to specific section
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'subjective' || type === 'objective') {
      // Wait for content to load, then scroll
      setTimeout(() => {
        const sectionId = type === 'subjective' ? 'subjective-reports-section' : 'objective-reports-section';
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Expand the section if it's collapsed
          if (type === 'subjective') {
            setShowSubjectiveDetails(true);
          } else {
            setShowObjectiveDetails(true);
          }
        }
      }, 500); // Small delay to ensure content is rendered
    }
  }, [searchParams, subjectiveReports, objectiveReports]);

  // Update filter panel position when filter button is rendered or showFilters changes
  useEffect(() => {
    const updateFilterPosition = () => {
      if (filterButtonRef.current && showFilters) {
        const rect = filterButtonRef.current.getBoundingClientRect();
        setFilterPanelTop(rect.bottom + window.scrollY + 8);
      }
    };

    updateFilterPosition();
    window.addEventListener('scroll', updateFilterPosition);
    window.addEventListener('resize', updateFilterPosition);

    return () => {
      window.removeEventListener('scroll', updateFilterPosition);
      window.removeEventListener('resize', updateFilterPosition);
    };
  }, [showFilters]);



  const handleFileUpload = async (type, file) => {
    try {
      // Only allow file upload for subjective type
      // Objective should use handleUploadObjectiveResult instead
      if (type !== 'subjective') {
        alert('Please use "Upload Result" button for objective reports');
        return;
      }

      // CRITICAL: Prevent Excel files from being uploaded through subjective route
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        alert('Excel files (.xlsx, .xls) cannot be uploaded as subjective SQA reports. Please use the "Upload Result" button in the Objective SQA Reports section to upload Excel files.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('versionId', versionId);
      formData.append('type', type);

      await axios.post(`${API_BASE_URL}/api/sqa/reports/upload/${versionId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Refresh ONLY subjective reports
      await fetchReports('subjective');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const handleUploadObjectiveResult = async (resultName, excelFile) => {
    try {
      // Normalize the result name: trim and normalize spaces
      const normalizedName = resultName.trim().replace(/\s+/g, ' ');
      console.log('[FRONTEND] Uploading objective result:', normalizedName);
      const formData = new FormData();
      formData.append('versionId', versionId);
      formData.append('name', normalizedName);
      formData.append('metrics', '');
      formData.append('finalExcel', excelFile);

      // Use separate Objective API - only interacts with objective_results collection
      await axios.post(`${API_BASE_URL}/api/objective/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('[FRONTEND] Objective result uploaded successfully');
      
      // Refresh only objective reports (not all SQA Results)
      await fetchReports('objective');
      alert('Result uploaded successfully!');
    } catch (error) {
      console.error('[FRONTEND] Error uploading objective result:', error);
      throw error;
    }
  };

  // Memoized handlers for form inputs to prevent typing lag
  const handleNameChange = useCallback((e) => {
    const value = e.target.value;
    setSqaResultForm(prev => ({ ...prev, name: value }));
  }, []);

  const handleMetricsChange = useCallback((e) => {
    const value = e.target.value;
    setSqaResultForm(prev => ({ ...prev, metrics: value }));
  }, []);

  // Memoized handlers for edit form inputs
  const handleEditNameChange = useCallback((e) => {
    const value = e.target.value;
    setEditForm(prev => ({ ...prev, name: value }));
  }, []);

  const handleEditMetricsChange = useCallback((e) => {
    const value = e.target.value;
    setEditForm(prev => ({ ...prev, metrics: value }));
  }, []);

  const handleSqaResultSubmit = async (e) => {
    e.preventDefault();
    
    // Normalize the result name: trim and normalize spaces
    const normalizedName = sqaResultForm.name.trim().replace(/\s+/g, ' ');
    
    if (!normalizedName) {
      alert('Please enter a name for the SQA Result');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('versionId', versionId);
      formData.append('name', normalizedName);
      formData.append('metrics', sqaResultForm.metrics || '');

      // Append input files
      if (sqaResultForm.inputFiles) {
        Array.from(sqaResultForm.inputFiles).forEach(file => {
          formData.append('inputFiles', file);
        });
      }

      // Append output files
      if (sqaResultForm.outputFiles) {
        Array.from(sqaResultForm.outputFiles).forEach(file => {
          formData.append('outputFiles', file);
        });
      }

      // Append final Excel file (optional for subjective)
      if (sqaResultForm.finalExcel) {
        formData.append('finalExcel', sqaResultForm.finalExcel);
      }

      // Use separate Subjective API - only interacts with subjective_results collection
      console.log('[FRONTEND] Uploading subjective result:', normalizedName);
      const response = await axios.post(`${API_BASE_URL}/api/subjective/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('[FRONTEND] Subjective result uploaded successfully:', response.data);

      // Reset form
      setSqaResultForm({
        name: '',
        metrics: '',
        inputFiles: null,
        outputFiles: null,
        finalExcel: null
      });
      setShowSqaResultForm(false);
      
      // Refresh the SQA Results list immediately
      await fetchSqaResults();
      console.log('[FRONTEND] Refreshed SQA Results after upload');
      
      alert('SQA Result uploaded successfully!');
    } catch (error) {
      console.error('Error uploading SQA Result:', error);
      alert('Failed to upload SQA Result: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleEditSqaResult = (result) => {
    setEditingResultId(result._id);
    setEditForm({
      name: result.name || '',
      metrics: result.metrics || '',
      inputFiles: null,
      outputFiles: null,
      finalExcel: null
    });
  };

  const handleCancelEdit = () => {
    setEditingResultId(null);
    setEditForm({
      name: '',
      metrics: '',
      inputFiles: null,
      outputFiles: null,
      finalExcel: null
    });
  };

  const handleUpdateSqaResult = async (e) => {
    e.preventDefault();
    
    // Normalize the result name: trim and normalize spaces
    const normalizedEditName = editForm.name.trim().replace(/\s+/g, ' ');
    
    if (!normalizedEditName) {
      alert('Please enter a name for the SQA Result');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', normalizedEditName);
      formData.append('metrics', editForm.metrics || '');

      // Append new input files (if any)
      if (editForm.inputFiles) {
        Array.from(editForm.inputFiles).forEach(file => {
          formData.append('inputFiles', file);
        });
      }

      // Append new output files (if any)
      if (editForm.outputFiles) {
        Array.from(editForm.outputFiles).forEach(file => {
          formData.append('outputFiles', file);
        });
      }

      // Append new final Excel file (if any)
      if (editForm.finalExcel) {
        formData.append('finalExcel', editForm.finalExcel);
      }

      // Use separate Subjective API - only updates subjective_results collection
      console.log('[FRONTEND] Updating subjective result:', editingResultId);
      await axios.put(`${API_BASE_URL}/api/subjective/${editingResultId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('[FRONTEND] Subjective result updated successfully');
      
      // Reset form
      handleCancelEdit();
      fetchSqaResults();
      alert('SQA Result updated successfully!');
    } catch (error) {
      console.error('Error updating SQA Result:', error);
      alert('Failed to update SQA Result: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSqaResult = async (resultId) => {
    if (!window.confirm('Are you sure you want to delete this SQA Result?')) return;

    try {
      // Use separate Subjective API - only deletes from subjective_results collection
      console.log('[FRONTEND] Deleting subjective result:', resultId);
      await axios.delete(`${API_BASE_URL}/api/subjective/${resultId}`);
      console.log('[FRONTEND] Subjective result deleted successfully');
      fetchSqaResults();
    } catch (error) {
      console.error('[FRONTEND] Error deleting SQA Result:', error);
      alert('Failed to delete SQA Result');
    }
  };

  const handleDeleteReport = async (reportId, type) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;

    try {
      if (type === 'objective') {
        // Use separate Objective API - only deletes from objective_results collection
        console.log('[FRONTEND] Deleting objective result:', reportId);
        await axios.delete(`${API_BASE_URL}/api/objective/${reportId}`);
        console.log('[FRONTEND] Objective result deleted successfully');
        // Refresh ONLY objective reports
        await fetchReports('objective');
      } else if (type === 'subjective') {
        // Delete SQA Report (subjective reports are stored as SQA Reports)
        console.log('[FRONTEND] Deleting subjective report:', reportId);
        await axios.delete(`${API_BASE_URL}/api/sqa/reports/${reportId}`);
        console.log('[FRONTEND] Subjective report deleted successfully');
        // Refresh ONLY subjective reports
        await fetchReports('subjective');
      }
    } catch (error) {
      console.error('[FRONTEND] Error deleting report:', error);
      alert('Failed to delete report');
    }
  };


  const handleDownload = (filePath, fileName) => {
    // File path is already relative from uploads directory
    window.open(`${API_BASE_URL}/uploads/${filePath}`, '_blank');
  };

  const handleApplyFilters = async () => {
    // At least one filter must be provided
    if (!filters.metric && !filters.resultName && !filters.fileName && (!filters.operation || !filters.value)) {
      alert('Please provide at least one filter (metric with operation/value, result name, or file name)');
      return;
    }

    // If operation or value is provided, both are required along with metric
    if ((filters.operation || filters.value) && !filters.metric) {
      alert('Please provide metric name when filtering by operation and value');
      return;
    }

    // If metric is provided, operation and value are required
    if (filters.metric && (!filters.operation || !filters.value)) {
      alert('Please provide operation and value when filtering by metric');
      return;
    }

    setLoadingFilter(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/sqa/${versionId}/filter`, {
        metric: filters.metric || undefined,
        operation: filters.operation || undefined,
        value: filters.value || undefined,
        resultName: filters.resultName && filters.resultName !== 'All' ? filters.resultName : undefined,
        fileName: filters.fileName || undefined
      });
      updateFilteredResults(response.data);
      setShowFilters(false);
    } catch (error) {
      console.error('Error applying filters:', error);
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data?.details;
      
      let fullMessage = `Failed to apply filters: ${errorMessage}`;
      if (errorDetails) {
        fullMessage += `\n\nDetails: ${errorDetails}`;
      }
      
      // Check if response has summary info
      if (error.response?.data?.summary) {
        const summary = error.response.data.summary;
        if (summary.skippedExcelNotFound > 0 || summary.skippedNoExcel > 0) {
          fullMessage += `\n\nNote: ${summary.skippedNoExcel} results have no Excel file, ${summary.skippedExcelNotFound} Excel files were not found.`;
        }
      }
      
      alert(fullMessage);
    } finally {
      setLoadingFilter(false);
    }
  };

  const handleClearFilters = () => {
    updateFilters({
      metric: '',
      operation: '',
      value: '',
      resultName: '',
      fileName: ''
    });
    updateFilteredResults(null);
    setHighlightedFile(null);
  };

  const handleQuadrantFileClick = (file) => {
    // Helper function to normalize file names for matching
    const normalizeFileName = (name) => {
      return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    };
    
    // Find the file in input or output files
    const allFiles = [
      ...(filteredResults?.results?.matchingInputFiles || []),
      ...(filteredResults?.results?.matchingOutputFiles || [])
    ];
    
    const normalizedClickFileName = normalizeFileName(file.fileName);
    const foundFiles = allFiles.filter(f => {
      const normalized = normalizeFileName(f.fileName);
      return normalized.includes(normalizedClickFileName) || 
             normalizedClickFileName.includes(normalized) ||
             normalized === normalizedClickFileName;
    });
    
    // Find matching input and output files separately
    const inputFiles = foundFiles.filter(f => {
      // Check if this file is in the input files list
      return filteredResults?.results?.matchingInputFiles?.some(
        inputFile => normalizeFileName(inputFile.fileName) === normalizeFileName(f.fileName)
      );
    });
    
    const outputFiles = foundFiles.filter(f => {
      // Check if this file is in the output files list
      return filteredResults?.results?.matchingOutputFiles?.some(
        outputFile => normalizeFileName(outputFile.fileName) === normalizeFileName(f.fileName)
      );
    });
    
    // Determine the best file name to use for highlighting
    // This should match both input and output files
    let highlightKey = file.fileName;
    
    if (foundFiles.length > 0) {
      // If we found both input and output files, extract a common base name
      if (inputFiles.length > 0 && outputFiles.length > 0) {
        highlightKey = inputFiles[0].fileName;
        
        console.log(`[Highlight] Found both input and output files. Using input file name for highlight: ${highlightKey}`);
      } else if (inputFiles.length > 0) {
        highlightKey = inputFiles[0].fileName;
      } else if (outputFiles.length > 0) {
        highlightKey = outputFiles[0].fileName;
      }
    }
    
    // Set highlighted file name - this will highlight both input and output files
    // The matching logic uses includes() so it should match files with common base names
    setHighlightedFile(highlightKey);
    
    if (foundFiles.length > 0) {
      // Find and preserve any currently playing audio BEFORE any operations
      const allAudioElements = document.querySelectorAll('audio');
      const playingAudios = [];
      allAudioElements.forEach(audio => {
        if (!audio.paused && !audio.ended && audio.readyState >= 2) {
          const currentTime = audio.currentTime;
          const src = audio.currentSrc;
          const playbackRate = audio.playbackRate;
          playingAudios.push({
            element: audio,
            currentTime: currentTime,
            src: src,
            playbackRate: playbackRate
          });
          console.log(`[Audio Preserve] Found playing audio: ${src}, time: ${currentTime}s`);
        }
      });
      
      // Find ALL matching file elements (both input and output)
      const allFileElements = document.querySelectorAll('[data-file-name]');
      const targetElements = [];
      const normalizedTarget = normalizeFileName(foundFiles[0].fileName);
      
      allFileElements.forEach(el => {
        const fileName = el.getAttribute('data-file-name');
        if (fileName) {
          const normalized = normalizeFileName(fileName);
          if (normalized === normalizedTarget || 
              normalized.includes(normalizedTarget) || 
              normalizedTarget.includes(normalized)) {
            targetElements.push(el);
          }
        }
      });
      
      // Scroll directly to the file-list-section (which is below quadrants)
      const fileListSection = document.getElementById('file-list-section');
      
      if (fileListSection && targetElements.length > 0) {
        // Find both input and output file elements
        const inputFile = targetElements.find(el => {
          let parent = el.parentElement;
          while (parent && parent !== fileListSection) {
            const h4 = parent.querySelector('h4');
            if (h4 && h4.textContent && h4.textContent.includes('Input Files')) {
              return true;
            }
            parent = parent.parentElement;
          }
          return false;
        });
        
        const outputFile = targetElements.find(el => {
          let parent = el.parentElement;
          while (parent && parent !== fileListSection) {
            const h4 = parent.querySelector('h4');
            if (h4 && h4.textContent && h4.textContent.includes('Output Files')) {
              return true;
            }
            parent = parent.parentElement;
          }
          return false;
        });
        
        // If both files exist, determine scroll target priority
        if (inputFile && outputFile) {
          const inputRect = inputFile.getBoundingClientRect();
          const outputRect = outputFile.getBoundingClientRect();
          const minTop = Math.min(inputRect.top, outputRect.top);
          const maxBottom = Math.max(inputRect.bottom, outputRect.bottom);
          const viewportHeight = window.innerHeight;
          
          if ((maxBottom - minTop) > viewportHeight - 200) {
            // Both files don't fit - input file takes priority (handled in setTimeout below)
          } else if (inputRect.top < outputRect.top) {
            // Both fit - scroll handled in setTimeout below
          }
        }
        
        // Wait a brief moment for React to re-render with sorted files, then scroll
        setTimeout(() => {
          // Re-query elements after React re-render (files should now be sorted to top)
          const allFileElementsAfterRender = document.querySelectorAll('[data-file-name]');
          const targetElementsAfterRender = [];
          const normalizedTarget = normalizeFileName(foundFiles[0].fileName);
          
          allFileElementsAfterRender.forEach(el => {
            const fileName = el.getAttribute('data-file-name');
            if (fileName) {
              const normalized = normalizeFileName(fileName);
              if (normalized === normalizedTarget || 
                  normalized.includes(normalizedTarget) || 
                  normalizedTarget.includes(normalized)) {
                targetElementsAfterRender.push(el);
              }
            }
          });
          
          // Use the re-rendered elements if found, otherwise use original
          const finalTargetElements = targetElementsAfterRender.length > 0 
            ? targetElementsAfterRender 
            : targetElements;
          
          const finalInputFile = finalTargetElements.find(el => {
            let parent = el.parentElement;
            while (parent && parent !== fileListSection) {
              const h4 = parent.querySelector('h4');
              if (h4 && h4.textContent && h4.textContent.includes('Input Files')) {
                return true;
              }
              parent = parent.parentElement;
            }
            return false;
          });
          
          const finalOutputFile = finalTargetElements.find(el => {
            let parent = el.parentElement;
            while (parent && parent !== fileListSection) {
              const h4 = parent.querySelector('h4');
              if (h4 && h4.textContent && h4.textContent.includes('Output Files')) {
                return true;
              }
              parent = parent.parentElement;
            }
            return false;
          });
          
          const finalTargetElement = finalInputFile || finalOutputFile || finalTargetElements[0];
          
          if (finalTargetElement) {
            // Scroll to show the file with proper offset from top
            const elementRect = finalTargetElement.getBoundingClientRect();
            const currentScrollY = window.scrollY;
            const targetScrollY = currentScrollY + elementRect.top - 100; // 100px from top for header
            
            window.scrollTo({
              top: Math.max(0, targetScrollY),
              behavior: 'smooth'
            });
            
            console.log(`[Scroll] Scrolled to show file: ${foundFiles[0].fileName}`);
            if (finalInputFile && finalOutputFile) {
              console.log(`[Scroll] Both input and output files are highlighted`);
            } else if (finalInputFile) {
              console.log(`[Scroll] Input file highlighted and scrolled to`);
            } else if (finalOutputFile) {
              console.log(`[Scroll] Output file highlighted and scrolled to`);
            }
          }
        }, 100); // Reduced delay for faster response
      } else if (targetElements.length > 0) {
        // Fallback: scroll directly to file if file-list-section not found
        const fileListSection = document.getElementById('file-list-section');
        let targetElement = targetElements[0];
        
        const inputFile = targetElements.find(el => {
          let parent = el.parentElement;
          while (parent && parent !== fileListSection) {
            const h4 = parent.querySelector('h4');
            if (h4 && h4.textContent && h4.textContent.includes('Input Files')) {
              return true;
            }
            parent = parent.parentElement;
          }
          return false;
        });
        
        if (inputFile) {
          targetElement = inputFile;
        }
        
        const elementRect = targetElement.getBoundingClientRect();
        const currentScrollY = window.scrollY;
        const targetScrollY = currentScrollY + elementRect.top - 100;
        
        window.scrollTo({
          top: Math.max(0, targetScrollY),
          behavior: 'smooth'
        });
      }
      
      // CRITICAL: Restore any playing audio that might have been interrupted
      // Only restore if audio was actually paused, don't interfere with playing audio
      const restoreAudio = () => {
        playingAudios.forEach(({ element, currentTime, src, playbackRate }) => {
          // Check if this is still the same audio element and source
          if (element.currentSrc === src && element.src) {
            // Only restore if it was paused unexpectedly
            if (element.paused && !element.ended && element.hasAttribute('data-playing')) {
              console.log(`[Audio Restore] Restoring audio: ${src}, resuming at ${currentTime}s`);
              element.currentTime = currentTime;
              element.playbackRate = playbackRate;
              element.play().catch(err => {
                console.error('[Audio Restore] Error resuming:', err);
              });
            }
          }
        });
      };
      
      // Restore after a short delay to catch any interruptions
      setTimeout(restoreAudio, 50);
      setTimeout(restoreAudio, 200);
      
      // Set up scroll listener to clear highlight when user scrolls away
      // BUT: Keep highlight if audio is playing
      // Clear any existing scroll listener first
      if (scrollListenerRef.current) {
        window.removeEventListener('scroll', scrollListenerRef.current);
      }
      
      // Create scroll handler to clear highlight when user scrolls away
      const handleScroll = () => {
        // Check if any audio is currently playing - if so, keep the highlight
        const anyAudioPlaying = Array.from(document.querySelectorAll('audio')).some(
          audio => !audio.paused && !audio.ended && audio.hasAttribute('data-playing')
        );
        
        // If audio is playing, don't clear the highlight
        if (anyAudioPlaying) {
          console.log('[Scroll Handler] Audio is playing, keeping highlight');
          return;
        }
        
        // Check if highlighted files are still in viewport
        const highlightedElements = document.querySelectorAll('[data-file-name]');
        let anyHighlightedVisible = false;
        
        highlightedElements.forEach(el => {
          const fileName = el.getAttribute('data-file-name');
          if (fileName && file.fileName) {
            const normalized = normalizeFileName(fileName);
            const normalizedHighlighted = normalizeFileName(file.fileName);
            if (normalized === normalizedHighlighted || 
                normalized.includes(normalizedHighlighted) || 
                normalizedHighlighted.includes(normalized)) {
              const rect = el.getBoundingClientRect();
              // Check if element is in viewport (with generous margin to prevent premature clearing)
              if (rect.top < window.innerHeight + 500 && rect.bottom > -500) {
                anyHighlightedVisible = true;
              }
            }
          }
        });
        
        // Only clear highlight if no highlighted files are visible AND no audio is playing
        if (!anyHighlightedVisible && !anyAudioPlaying) {
          console.log('[Scroll Handler] Clearing highlight - files not visible and no audio playing');
          setHighlightedFile(null);
          window.removeEventListener('scroll', debouncedScrollHandler);
          scrollListenerRef.current = null;
        }
      };
      
      // Add scroll listener with debounce
      let scrollTimeout;
      const debouncedScrollHandler = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleScroll, 800); // Wait 800ms after scroll stops (longer delay)
      };
      
      scrollListenerRef.current = debouncedScrollHandler;
      window.addEventListener('scroll', debouncedScrollHandler, { passive: true });
    } else if (file.downloadUrl) {
      // Fallback: trigger download
      window.open(`${API_BASE_URL}${file.downloadUrl}`, '_blank');
    }
  };

  const isAudioFile = (mimeType) => {
    return mimeType && mimeType.startsWith('audio/');
  };

  const ReportSection = ({ title, type, reports, onUpload, onDelete, showDetails, setShowDetails, onUploadResult }) => {
    const hasContent = reports.length > 0;
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [resultName, setResultName] = useState('');
    const [excelFile, setExcelFile] = useState(null);
    const [uploadingResult, setUploadingResult] = useState(false);

    const handleResultSubmit = async (e) => {
      e.preventDefault();
      
      if (!resultName.trim()) {
        alert('Please enter a result name');
        return;
      }
      
      if (!excelFile) {
        alert('Please select an Excel file');
        return;
      }

      setUploadingResult(true);
      try {
        if (onUploadResult) {
          await onUploadResult(resultName, excelFile);
          // Reset form
          setResultName('');
          setExcelFile(null);
          setShowUploadForm(false);
        }
      } catch (error) {
        console.error('Error uploading result:', error);
        alert('Failed to upload result: ' + (error.response?.data?.message || error.message));
      } finally {
        setUploadingResult(false);
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          {hasContent && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showDetails ? 'Hide Files' : 'Show Files'}
            </button>
          )}
        </div>
        
        {/* Upload Area */}
        <div className="mb-6 flex gap-2">
          {type === 'objective' ? (
            <>
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="inline-flex items-center px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700"
              >
                <FiUpload className="mr-1" size={12} />
                {showUploadForm ? 'Cancel' : 'Upload Result'}
              </button>
              
              {/* Upload Result Form */}
              {showUploadForm && (
                <form onSubmit={handleResultSubmit} className="flex-1 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Result Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={resultName}
                        onChange={(e) => setResultName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="e.g., Test Run 1, Baseline Results"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Excel File (.xlsx) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        required
                        onChange={(e) => setExcelFile(e.target.files[0])}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      {excelFile && (
                        <p className="text-xs text-gray-500 mt-1">
                          Selected: {excelFile.name}
                        </p>
                      )}
                    </div>
                    
                    <button
                      type="submit"
                      disabled={uploadingResult}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {uploadingResult ? 'Uploading...' : 'Upload Result'}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            // Only show file upload for subjective type (objective uses Upload Result form)
            type === 'subjective' && onUpload ? (
              <label className="block">
                <input
                  type="file"
                  multiple
                  accept=".wav,.mp3,.m4a,.flac,.aac,.ogg,.wma,.aiff,.au" // Only audio files, NO Excel files
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const files = Array.from(e.target.files);
                      // Filter out Excel files - they should only be uploaded through objective upload
                      const excelFiles = files.filter(f => {
                        const ext = f.name.toLowerCase();
                        return ext.endsWith('.xlsx') || ext.endsWith('.xls');
                      });
                      
                      if (excelFiles.length > 0) {
                        alert('Excel files (.xlsx, .xls) cannot be uploaded as subjective SQA reports. Please use the "Upload Result" button in the Objective SQA Reports section to upload Excel files.');
                        e.target.value = ''; // Clear the input
                        return;
                      }
                      
                      // Only upload non-Excel files
                      files.forEach(file => {
                        const ext = file.name.toLowerCase();
                        if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
                          onUpload(file);
                        }
                      });
                    }
                  }}
                  className="hidden"
                  id={`upload-files-${type}`}
                />
                <span className="inline-flex items-center px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700">
                  <FiUpload className="mr-1" size={12} />
                  Upload Files
                </span>
              </label>
            ) : null
          )}
        </div>

        {/* Reports List */}
        <div className="space-y-2">
          {!hasContent ? (
            <p className="text-gray-400 text-sm">No files uploaded</p>
          ) : showDetails ? (
            // Show files table when expanded
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
                  {reports.map((report) => (
                    <tr key={report._id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {type === 'objective' && report.isResult ? (
                          <div>
                            <div className="font-medium">{report.name}</div>
                            {report.fileName && report.fileName !== report.name && (
                              <div className="text-xs text-gray-500">{report.fileName}</div>
                            )}
                          </div>
                        ) : (
                          report.fileName
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {report.fileSize > 0 ? `${(report.fileSize / 1024).toFixed(2)} KB` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex space-x-2">
                          {report.filePath && (
                            <button
                              onClick={() => handleDownload(report.filePath, report.fileName || report.name)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Download"
                            >
                              <FiDownload />
                            </button>
                          )}
                          <button
                            onClick={() => onDelete(report._id, type)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
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
          ) : (
            // Collapsed view: Show file count
            <p className="text-gray-400 text-sm">
              {reports.length} file(s) uploaded. Click "Show Files" to view all files.
            </p>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation Bar */}
      <NavigationBar 
        projectName={projectName ? `${projectName}${versionNumber ? ` - ${versionNumber}` : ''} - SQA Reports` : 'SQA Reports'} 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showSearch={false}
        onBack={() => navigate(`/version/${versionId}`)}
        rightButton={
          <div className="relative" ref={filterButtonRef}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md flex items-center transition-colors border border-slate-200 hover:border-slate-300"
            >
              <FiFilter className="mr-2" size={16} />
              Filter Files
            </button>
          </div>
        }
      />

      {/* Filter Panel - Positioned below Filter Files button */}
      {showFilters && (
        <div className="fixed z-50" style={{
          top: `${filterPanelTop}px`,
          right: '20px',
          width: '320px',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto'
        }}>
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Filter</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Search across all SQA Results.
              </p>

              {/* Metric Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Metric Name
                </label>
                {!showAddMetricInput ? (
                  <>
                    <select
                      value={filters.metric}
                      onChange={(e) => {
                        if (e.target.value === '__ADD__') {
                          // User wants to add a new metric - show input field
                          setShowAddMetricInput(true);
                          setNewMetricName('');
                        } else {
                          updateFilters({ metric: e.target.value });
                        }
                      }}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={loadingMetrics}
                    >
                      <option value="">Select Metric...</option>
                      {availableMetrics.map((metric) => (
                        <option key={metric} value={metric}>
                          {metric}
                        </option>
                      ))}
                      <option value="__ADD__">+ Add New Metric</option>
                    </select>
                    {loadingMetrics && (
                      <p className="text-xs text-slate-500 mt-1">Loading metrics...</p>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMetricName}
                        onChange={(e) => setNewMetricName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newMetricName.trim()) {
                            handleAddMetric();
                          } else if (e.key === 'Escape') {
                            setShowAddMetricInput(false);
                            setNewMetricName('');
                          }
                        }}
                        placeholder="Enter metric name..."
                        className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        autoFocus
                      />
                      <button
                        onClick={handleAddMetric}
                        disabled={!newMetricName.trim()}
                        className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAddMetricInput(false);
                          setNewMetricName('');
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Operation and Value */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Operation
                  </label>
                  <select
                    value={filters.operation}
                    onChange={(e) => updateFilters({ operation: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value=">">&gt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                    <option value="=">=</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Metric Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g., 5"
                    value={filters.value}
                    onChange={(e) => updateFilters({ value: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Result Name Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Result Name
                </label>
                <select
                  value={filters.resultName}
                  onChange={(e) => updateFilters({ resultName: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Result Name</option>
                  <option value="All">All</option>
                  {sqaResults && sqaResults.length > 0 ? (
                    [...sqaResults]
                      .filter(result => result && result.name) // Ensure we only show results with names
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map((result) => (
                        <option key={result._id} value={result.name}>
                          {result.name}
                        </option>
                      ))
                  ) : (
                    <option value="" disabled>No results available</option>
                  )}
                </select>
              </div>

              {/* File Name Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., aeroplane"
                  value={filters.fileName}
                  onChange={(e) => updateFilters({ fileName: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Apply Filter Button */}
              <button
                onClick={handleApplyFilters}
                disabled={loadingFilter}
                className="w-full px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingFilter ? 'Filtering...' : 'Apply Filter'}
              </button>

              {/* Clear Filter Button */}
              <button
                onClick={handleClearFilters}
                className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full">
            {/* Filtered Results - Show at Top */}
        {filteredResults && filteredResults.results && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Filtered Results</h3>
                <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
                  {filteredResults.filters.metric && (
                    <span>Metric: <span className="font-semibold">{filteredResults.filters.metric}</span></span>
                  )}
                  {filteredResults.filters.operation && (
                    <span>Operation: <span className="font-semibold">{filteredResults.filters.operation}</span></span>
                  )}
                  {filteredResults.filters.value && (
                    <span>Metric Value: <span className="font-semibold">{filteredResults.filters.value}</span></span>
                  )}
                  {filteredResults.filters.resultName && filteredResults.filters.resultName !== 'All' && (
                    <span>Result Name: <span className="font-semibold">{filteredResults.filters.resultName}</span></span>
                  )}
                  {filteredResults.filters.resultName === 'All' && (
                    <span>Result Name: <span className="font-semibold">All</span></span>
                  )}
                  {filteredResults.filters.fileName && (
                    <span>File Name: <span className="font-semibold">{filteredResults.filters.fileName}</span></span>
                  )}
                </div>
                {filteredResults.summary && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div className="bg-green-50 px-2 py-1 rounded">SQA Results: {filteredResults.summary.totalSqaResults}</div>
                      <div className="bg-purple-50 px-2 py-1 rounded">Input Files: {filteredResults.summary.totalInputFiles}</div>
                      <div className="bg-orange-50 px-2 py-1 rounded">Output Files: {filteredResults.summary.totalOutputFiles}</div>
                    </div>
                    {(filteredResults.summary.skippedNoExcel > 0 || filteredResults.summary.skippedExcelNotFound > 0 || filteredResults.summary.skippedExcelReadError > 0) && (
                      <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                        ⚠️ Some results were skipped: {filteredResults.summary.skippedNoExcel} without Excel, {filteredResults.summary.skippedExcelNotFound} Excel files not found, {filteredResults.summary.skippedExcelReadError} read errors
                      </div>
                    )}
                    {filteredResults.summary.totalSqaResults === 0 && filteredResults.summary.totalInputFiles === 0 && filteredResults.summary.totalOutputFiles === 0 && (
                      <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        ⚠️ No results found matching your filter criteria. Please check:
                        <ul className="list-disc list-inside mt-1 ml-2">
                          <li>Is the metric name spelled correctly?</li>
                          <li>Does the Excel file contain this metric?</li>
                          <li>Are the operation and value correct?</li>
                          <li>Try clearing filters and checking available metrics</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => setShowFilters(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                >
                  Edit Filter
                </button>
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Quadrant Performance View */}
            {filteredResults.quadrants && (
              <QuadrantView 
                quadrantData={filteredResults.quadrants}
                onFileClick={handleQuadrantFileClick}
                filteredMetric={filteredResults.filters?.metric}
              />
            )}

            {/* Input Files and Output Files - Below Quadrants */}
            <div id="file-list-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Files */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Input Files ({filteredResults.results.matchingInputFiles?.length || 0})</h4>
                {!filteredResults.results.matchingInputFiles || filteredResults.results.matchingInputFiles.length === 0 ? (
                  <p className="text-gray-400 text-sm">No matching input files</p>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
                    {[...filteredResults.results.matchingInputFiles]
                      .sort((a, b) => {
                        // Sort highlighted files to the top
                        const aHighlighted = highlightedFile && (
                          a.fileName.toLowerCase().includes(highlightedFile.toLowerCase()) ||
                          highlightedFile.toLowerCase().includes(a.fileName.toLowerCase())
                        );
                        const bHighlighted = highlightedFile && (
                          b.fileName.toLowerCase().includes(highlightedFile.toLowerCase()) ||
                          highlightedFile.toLowerCase().includes(b.fileName.toLowerCase())
                        );
                        if (aHighlighted && !bHighlighted) return -1;
                        if (!aHighlighted && bHighlighted) return 1;
                        return 0;
                      })
                      .map((file, index) => {
                        // More flexible matching: check if file names share a common base
                        // This ensures both input and output files are highlighted when clicking a dot
                        const isHighlighted = highlightedFile && (() => {
                          const fileLower = file.fileName.toLowerCase();
                          const highlightLower = highlightedFile.toLowerCase();
                          
                          // Direct match
                          if (fileLower === highlightLower) return true;
                          
                          // Contains match (either direction)
                          if (fileLower.includes(highlightLower) || highlightLower.includes(fileLower)) return true;
                          
                          // Extract base names (remove common prefixes/suffixes)
                          const fileBase = fileLower.replace(/^(v\d+_ndp\d+_ep\d+_)/, '').replace(/\.wav$/, '');
                          const highlightBase = highlightLower.replace(/^(v\d+_ndp\d+_ep\d+_)/, '').replace(/\.wav$/, '');
                          
                          // Match if base names are similar
                          if (fileBase === highlightBase) return true;
                          if (fileBase.includes(highlightBase) || highlightBase.includes(fileBase)) return true;
                          
                          // Extract key parts (e.g., "aeroplane_55db_testvector_s1")
                          const fileKeyParts = fileBase.match(/([a-z]+_\d+db_[a-z]+_s\d+)/);
                          const highlightKeyParts = highlightBase.match(/([a-z]+_\d+db_[a-z]+_s\d+)/);
                          
                          if (fileKeyParts && highlightKeyParts && fileKeyParts[1] === highlightKeyParts[1]) {
                            return true;
                          }
                          
                          return false;
                        })();
                        return (
                          <div 
                            key={`input-${file.fileName}-${index}`}
                            data-file-name={file.fileName}
                            className={`bg-white border-2 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-300 ${
                              isHighlighted 
                                ? 'border-blue-500 bg-blue-50 shadow-lg ring-4 ring-blue-200 ring-opacity-75 transform scale-[1.02] z-10' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            style={isHighlighted ? {
                              animation: 'pulse 2s ease-in-out infinite',
                            } : {}}
                          >
                            {/* File Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate" title={file.fileName}>
                                  {file.fileName}
                                </p>
                                {file.resultName && (
                                  <p className="text-xs text-gray-500 mt-0.5 truncate">From: {file.resultName}</p>
                                )}
                                {file.metricValue !== null && (
                                  <p className="text-xs text-indigo-600 mt-0.5 font-medium">Metric Value: {file.metricValue}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleDownload(file.filePath, file.fileName)}
                                className="ml-2 text-indigo-600 hover:text-indigo-900 flex-shrink-0"
                                title="Download"
                              >
                                <FiDownload size={14} />
                              </button>
                            </div>
                            
                            {/* Audio Player */}
                            {isAudioFile(file.mimeType) && (
                              <audio 
                                key={`audio-${file.filePath}`}
                                controls 
                                className="w-full h-8 mt-2"
                                preload="auto"
                                crossOrigin="anonymous"
                                onPlay={(e) => {
                              e.stopPropagation();
                              const audioElement = e.target;
                              
                              // Helper function for normalization (define first)
                              const normalizeFileName = (name) => {
                                if (!name) return '';
                                return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                              };
                              
                              // Mark this audio as actively playing
                              // This allows the monitor to resume if paused unexpectedly
                              audioElement.setAttribute('data-playing', 'true');
                              console.log(`[Audio Play] Started playing: ${file.fileName}`);
                              
                              // Find the corresponding input/output file pair
                              // If this is an input file, find its output counterpart (or vice versa)
                              const fileName = file.fileName;
                              
                              // Determine if this is in Input Files section
                              let parent = audioElement.closest('[data-file-name]');
                              let isInputFile = false;
                              while (parent) {
                                const h4 = parent.parentElement?.querySelector('h4');
                                if (h4 && h4.textContent && h4.textContent.includes('Input Files')) {
                                  isInputFile = true;
                                  break;
                                }
                                parent = parent.parentElement;
                              }
                              
                              // Find the matching file in the other column (input/output pair)
                              const allFileElements = document.querySelectorAll('[data-file-name]');
                              const matchingFileElement = Array.from(allFileElements).find(el => {
                                const elFileName = el.getAttribute('data-file-name');
                                
                                // Check if this element is in Input Files section
                                let elParent = el;
                                let elIsInput = false;
                                while (elParent) {
                                  const h4 = elParent.parentElement?.querySelector('h4');
                                  if (h4 && h4.textContent && h4.textContent.includes('Input Files')) {
                                    elIsInput = true;
                                    break;
                                  }
                                  elParent = elParent.parentElement;
                                }
                                
                                // Match by filename and ensure it's in the opposite column
                                const normalizedEl = normalizeFileName(elFileName || '');
                                const normalizedCurrent = normalizeFileName(fileName);
                                
                                return (normalizedEl === normalizedCurrent || 
                                       normalizedEl.includes(normalizedCurrent) || 
                                       normalizedCurrent.includes(normalizedEl)) &&
                                       elIsInput !== isInputFile;
                              });
                              
                              // If matching file found, auto-play its audio too
                              if (matchingFileElement) {
                                const matchingAudio = matchingFileElement.querySelector('audio');
                                if (matchingAudio && matchingAudio.paused) {
                                  // Small delay to ensure both start playing smoothly
                                  setTimeout(() => {
                                    matchingAudio.setAttribute('data-playing', 'true');
                                    matchingAudio.play().catch(err => {
                                      console.error('[Auto-play] Error playing matching file:', err);
                                    });
                                    console.log(`[Auto-play] Started playing matching file: ${matchingFileElement.getAttribute('data-file-name')}`);
                                  }, 100);
                                }
                              }
                              
                              // DO NOT pause other audio - allow both input and output to play together
                              // This allows users to compare input and output files simultaneously
                              
                              // Ensure audio continues playing - add a monitor to prevent stopping
                              const ensurePlaying = () => {
                                if (audioElement.hasAttribute('data-playing') && audioElement.paused && !audioElement.ended) {
                                  console.log(`[Audio Monitor] Audio was paused unexpectedly, resuming: ${file.fileName}`);
                                  audioElement.play().catch(err => {
                                    console.error('[Audio Monitor] Error resuming:', err);
                                  });
                                }
                              };
                              
                              // Monitor audio state periodically to ensure it keeps playing
                              const monitorInterval = setInterval(() => {
                                if (audioElement.ended || !audioElement.hasAttribute('data-playing')) {
                                  clearInterval(monitorInterval);
                                  return;
                                }
                                ensurePlaying();
                              }, 500); // Check every 500ms
                              
                              // Clear monitor when audio ends naturally
                              audioElement.addEventListener('ended', () => {
                                clearInterval(monitorInterval);
                                audioElement.removeAttribute('data-playing');
                                
                                // Keep highlight for a few seconds after audio ends
                                // This allows user to see which file was playing
                                setTimeout(() => {
                                  // Only clear if no other audio is playing
                                  const anyOtherAudioPlaying = Array.from(document.querySelectorAll('audio')).some(
                                    audio => !audio.paused && !audio.ended && audio.hasAttribute('data-playing')
                                  );
                                  if (!anyOtherAudioPlaying) {
                                    // Check if user has scrolled away - if not, keep highlight a bit longer
                                    const highlightedElements = document.querySelectorAll('[data-file-name]');
                                    let anyHighlightedVisible = false;
                                    const normalizeFileName = (name) => {
                                      if (!name) return '';
                                      return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                                    };
                                    highlightedElements.forEach(el => {
                                      const fileName = el.getAttribute('data-file-name');
                                      if (fileName && highlightedFile) {
                                        const normalized = normalizeFileName(fileName);
                                        const normalizedHighlighted = normalizeFileName(highlightedFile);
                                        if (normalized === normalizedHighlighted || 
                                            normalized.includes(normalizedHighlighted) || 
                                            normalizedHighlighted.includes(normalized)) {
                                          const rect = el.getBoundingClientRect();
                                          if (rect.top < window.innerHeight + 500 && rect.bottom > -500) {
                                            anyHighlightedVisible = true;
                                          }
                                        }
                                      }
                                    });
                                    // Only clear if user has scrolled away
                                    if (!anyHighlightedVisible) {
                                      setHighlightedFile(null);
                                    }
                                  }
                                }, 5000); // Keep highlight for 5 seconds after audio ends
                              }, { once: true });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onPause={(e) => {
                              e.stopPropagation();
                              const audio = e.target;
                              // User explicitly paused - remove data-playing attribute so monitor doesn't try to resume
                              // This allows user to pause and then play again normally
                              if (audio.hasAttribute('data-playing')) {
                                audio.removeAttribute('data-playing');
                                console.log(`[Audio Pause] User paused audio: ${file.fileName}`);
                              }
                            }}
                            onTimeUpdate={(e) => {
                              e.stopPropagation();
                              // Prevent any interference with playback
                            }}
                            onStalled={(e) => {
                              e.stopPropagation();
                              console.warn(`Audio stalled: ${file.fileName}`);
                              const audio = e.target;
                              // Try to resume if stalled
                              if (!audio.paused) {
                                audio.load();
                                audio.play().catch(err => console.error('Error resuming stalled audio:', err));
                              }
                            }}
                            onSuspend={(e) => {
                              e.stopPropagation();
                              console.warn(`Audio suspended: ${file.fileName}`);
                            }}
                            onLoadedData={(e) => {
                              e.stopPropagation();
                              // Ensure full duration is loaded
                              const audio = e.target;
                              if (audio.duration && audio.duration !== Infinity) {
                                console.log(`Audio loaded: ${file.fileName}, Duration: ${audio.duration}s`);
                              }
                            }}
                            onLoadedMetadata={(e) => {
                              e.stopPropagation();
                              const audio = e.target;
                              if (audio.duration && audio.duration !== Infinity) {
                                console.log(`Audio metadata loaded: ${file.fileName}, Duration: ${audio.duration}s`);
                              }
                            }}
                            onCanPlayThrough={(e) => {
                              e.stopPropagation();
                              console.log(`Audio can play through: ${file.fileName}`);
                            }}
                            onEnded={(e) => {
                              e.stopPropagation();
                              console.log(`Audio ended: ${file.fileName}`);
                            }}
                            onError={(e) => {
                              console.error('Audio playback error:', e);
                              const audio = e.target;
                              if (audio.error) {
                                console.error('Audio error code:', audio.error.code);
                                console.error('Audio error message:', audio.error.message);
                              }
                            }}
                              >
                                <source src={`${API_BASE_URL}/uploads/${file.filePath}`} type={file.mimeType} />
                                Your browser does not support the audio element.
                              </audio>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Output Files */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Output Files ({filteredResults.results.matchingOutputFiles?.length || 0})</h4>
                {!filteredResults.results.matchingOutputFiles || filteredResults.results.matchingOutputFiles.length === 0 ? (
                  <p className="text-gray-400 text-sm">No matching output files</p>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
                    {[...filteredResults.results.matchingOutputFiles]
                      .sort((a, b) => {
                        // Sort highlighted files to the top
                        const aHighlighted = highlightedFile && (
                          a.fileName.toLowerCase().includes(highlightedFile.toLowerCase()) ||
                          highlightedFile.toLowerCase().includes(a.fileName.toLowerCase())
                        );
                        const bHighlighted = highlightedFile && (
                          b.fileName.toLowerCase().includes(highlightedFile.toLowerCase()) ||
                          highlightedFile.toLowerCase().includes(b.fileName.toLowerCase())
                        );
                        if (aHighlighted && !bHighlighted) return -1;
                        if (!aHighlighted && bHighlighted) return 1;
                        return 0;
                      })
                      .map((file, index) => {
                        // More flexible matching: check if file names share a common base
                        const isHighlighted = highlightedFile && (() => {
                          const fileLower = file.fileName.toLowerCase();
                          const highlightLower = highlightedFile.toLowerCase();
                          
                          // Direct match
                          if (fileLower === highlightLower) return true;
                          
                          // Contains match (either direction)
                          if (fileLower.includes(highlightLower) || highlightLower.includes(fileLower)) return true;
                          
                          // Extract base names (remove common prefixes/suffixes)
                          const fileBase = fileLower.replace(/^(v\d+_ndp\d+_ep\d+_)/, '').replace(/\.wav$/, '');
                          const highlightBase = highlightLower.replace(/^(v\d+_ndp\d+_ep\d+_)/, '').replace(/\.wav$/, '');
                          
                          // Match if base names are similar
                          if (fileBase === highlightBase) return true;
                          if (fileBase.includes(highlightBase) || highlightBase.includes(fileBase)) return true;
                          
                          // Extract key parts (e.g., "aeroplane_55db_testvector_s1")
                          const fileKeyParts = fileBase.match(/([a-z]+_\d+db_[a-z]+_s\d+)/);
                          const highlightKeyParts = highlightBase.match(/([a-z]+_\d+db_[a-z]+_s\d+)/);
                          
                          if (fileKeyParts && highlightKeyParts && fileKeyParts[1] === highlightKeyParts[1]) {
                            return true;
                          }
                          
                          return false;
                        })();
                        return (
                          <div 
                            key={`output-${file.fileName}-${index}`}
                            data-file-name={file.fileName}
                            className={`bg-white border-2 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-300 ${
                              isHighlighted 
                                ? 'border-blue-500 bg-blue-50 shadow-lg ring-4 ring-blue-200 ring-opacity-75 transform scale-[1.02] z-10' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            style={isHighlighted ? {
                              animation: 'pulse 2s ease-in-out infinite',
                            } : {}}
                          >
                            {/* File Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate" title={file.fileName}>
                                  {file.fileName}
                                </p>
                                {file.resultName && (
                                  <p className="text-xs text-gray-500 mt-0.5 truncate">From: {file.resultName}</p>
                                )}
                                {file.metricValue !== null && (
                                  <p className="text-xs text-indigo-600 mt-0.5 font-medium">Metric Value: {file.metricValue}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleDownload(file.filePath, file.fileName)}
                                className="ml-2 text-indigo-600 hover:text-indigo-900 flex-shrink-0"
                                title="Download"
                              >
                                <FiDownload size={14} />
                              </button>
                            </div>
                            
                            {/* Audio Player */}
                            {isAudioFile(file.mimeType) && (
                              <audio 
                                key={`audio-${file.filePath}`}
                                controls 
                                className="w-full h-8 mt-2"
                                preload="auto"
                                crossOrigin="anonymous"
                                onPlay={(e) => {
                              e.stopPropagation();
                              const audioElement = e.target;
                              
                              // Helper function for normalization (define first)
                              const normalizeFileName = (name) => {
                                if (!name) return '';
                                return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                              };
                              
                              // Mark this audio as actively playing
                              // This allows the monitor to resume if paused unexpectedly
                              audioElement.setAttribute('data-playing', 'true');
                              console.log(`[Audio Play] Started playing: ${file.fileName}`);
                              
                              // Find the corresponding input/output file pair
                              // If this is an input file, find its output counterpart (or vice versa)
                              const fileName = file.fileName;
                              
                              // Determine if this is in Input Files section
                              let parent = audioElement.closest('[data-file-name]');
                              let isInputFile = false;
                              while (parent) {
                                const h4 = parent.parentElement?.querySelector('h4');
                                if (h4 && h4.textContent && h4.textContent.includes('Input Files')) {
                                  isInputFile = true;
                                  break;
                                }
                                parent = parent.parentElement;
                              }
                              
                              // Find the matching file in the other column (input/output pair)
                              const allFileElements = document.querySelectorAll('[data-file-name]');
                              const matchingFileElement = Array.from(allFileElements).find(el => {
                                const elFileName = el.getAttribute('data-file-name');
                                
                                // Check if this element is in Input Files section
                                let elParent = el;
                                let elIsInput = false;
                                while (elParent) {
                                  const h4 = elParent.parentElement?.querySelector('h4');
                                  if (h4 && h4.textContent && h4.textContent.includes('Input Files')) {
                                    elIsInput = true;
                                    break;
                                  }
                                  elParent = elParent.parentElement;
                                }
                                
                                // Match by filename and ensure it's in the opposite column
                                const normalizedEl = normalizeFileName(elFileName || '');
                                const normalizedCurrent = normalizeFileName(fileName);
                                
                                return (normalizedEl === normalizedCurrent || 
                                       normalizedEl.includes(normalizedCurrent) || 
                                       normalizedCurrent.includes(normalizedEl)) &&
                                       elIsInput !== isInputFile;
                              });
                              
                              // If matching file found, auto-play its audio too
                              if (matchingFileElement) {
                                const matchingAudio = matchingFileElement.querySelector('audio');
                                if (matchingAudio && matchingAudio.paused) {
                                  // Small delay to ensure both start playing smoothly
                                  setTimeout(() => {
                                    matchingAudio.setAttribute('data-playing', 'true');
                                    matchingAudio.play().catch(err => {
                                      console.error('[Auto-play] Error playing matching file:', err);
                                    });
                                    console.log(`[Auto-play] Started playing matching file: ${matchingFileElement.getAttribute('data-file-name')}`);
                                  }, 100);
                                }
                              }
                              
                              // DO NOT pause other audio - allow both input and output to play together
                              // This allows users to compare input and output files simultaneously
                              
                              // Ensure audio continues playing - add a monitor to prevent stopping
                              const ensurePlaying = () => {
                                if (audioElement.hasAttribute('data-playing') && audioElement.paused && !audioElement.ended) {
                                  console.log(`[Audio Monitor] Audio was paused unexpectedly, resuming: ${file.fileName}`);
                                  audioElement.play().catch(err => {
                                    console.error('[Audio Monitor] Error resuming:', err);
                                  });
                                }
                              };
                              
                              // Monitor audio state periodically to ensure it keeps playing
                              const monitorInterval = setInterval(() => {
                                if (audioElement.ended || !audioElement.hasAttribute('data-playing')) {
                                  clearInterval(monitorInterval);
                                  return;
                                }
                                ensurePlaying();
                              }, 500); // Check every 500ms
                              
                              // Clear monitor when audio ends naturally
                              audioElement.addEventListener('ended', () => {
                                clearInterval(monitorInterval);
                                audioElement.removeAttribute('data-playing');
                                
                                // Keep highlight for a few seconds after audio ends
                                // This allows user to see which file was playing
                                setTimeout(() => {
                                  // Only clear if no other audio is playing
                                  const anyOtherAudioPlaying = Array.from(document.querySelectorAll('audio')).some(
                                    audio => !audio.paused && !audio.ended && audio.hasAttribute('data-playing')
                                  );
                                  if (!anyOtherAudioPlaying) {
                                    // Check if user has scrolled away - if not, keep highlight a bit longer
                                    const highlightedElements = document.querySelectorAll('[data-file-name]');
                                    let anyHighlightedVisible = false;
                                    const normalizeFileName = (name) => {
                                      if (!name) return '';
                                      return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                                    };
                                    highlightedElements.forEach(el => {
                                      const fileName = el.getAttribute('data-file-name');
                                      if (fileName && highlightedFile) {
                                        const normalized = normalizeFileName(fileName);
                                        const normalizedHighlighted = normalizeFileName(highlightedFile);
                                        if (normalized === normalizedHighlighted || 
                                            normalized.includes(normalizedHighlighted) || 
                                            normalizedHighlighted.includes(normalized)) {
                                          const rect = el.getBoundingClientRect();
                                          if (rect.top < window.innerHeight + 500 && rect.bottom > -500) {
                                            anyHighlightedVisible = true;
                                          }
                                        }
                                      }
                                    });
                                    // Only clear if user has scrolled away
                                    if (!anyHighlightedVisible) {
                                      setHighlightedFile(null);
                                    }
                                  }
                                }, 5000); // Keep highlight for 5 seconds after audio ends
                              }, { once: true });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onPause={(e) => {
                              e.stopPropagation();
                              const audio = e.target;
                              // User explicitly paused - remove data-playing attribute so monitor doesn't try to resume
                              // This allows user to pause and then play again normally
                              if (audio.hasAttribute('data-playing')) {
                                audio.removeAttribute('data-playing');
                                console.log(`[Audio Pause] User paused audio: ${file.fileName}`);
                              }
                            }}
                            onTimeUpdate={(e) => {
                              e.stopPropagation();
                              // Prevent any interference with playback
                            }}
                            onLoadedData={(e) => {
                              e.stopPropagation();
                              // Ensure full duration is loaded
                              const audio = e.target;
                              if (audio.duration && audio.duration !== Infinity) {
                                console.log(`Audio loaded: ${file.fileName}, Duration: ${audio.duration}s`);
                              }
                            }}
                            onLoadedMetadata={(e) => {
                              e.stopPropagation();
                              const audio = e.target;
                              if (audio.duration && audio.duration !== Infinity) {
                                console.log(`Audio metadata loaded: ${file.fileName}, Duration: ${audio.duration}s`);
                              }
                            }}
                            onCanPlayThrough={(e) => {
                              e.stopPropagation();
                              console.log(`Audio can play through: ${file.fileName}`);
                            }}
                            onEnded={(e) => {
                              e.stopPropagation();
                              console.log(`Audio ended: ${file.fileName}`);
                            }}
                            onStalled={(e) => {
                              e.stopPropagation();
                              console.warn(`Audio stalled: ${file.fileName}`);
                              const audio = e.target;
                              // Try to resume if stalled
                              if (!audio.paused) {
                                audio.load();
                                audio.play().catch(err => console.error('Error resuming stalled audio:', err));
                              }
                            }}
                            onSuspend={(e) => {
                              e.stopPropagation();
                              console.warn(`Audio suspended: ${file.fileName}`);
                            }}
                            onError={(e) => {
                              console.error('Audio playback error:', e);
                              const audio = e.target;
                              if (audio.error) {
                                console.error('Audio error code:', audio.error.code);
                                console.error('Audio error message:', audio.error.message);
                              }
                            }}
                              >
                                <source src={`${API_BASE_URL}/uploads/${file.filePath}`} type={file.mimeType} />
                                Your browser does not support the audio element.
                              </audio>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share Link Section */}
        {(() => {
          const type = searchParams.get('type');
          if (type === 'subjective' || type === 'objective') {
            return (
              <div className="mb-6">
                <ShareLink versionId={versionId} type={type} />
              </div>
            );
          }
          return null;
        })()}

        {/* Reports Sections */}
        {(() => {
          const type = searchParams.get('type');
          
          // If type is specified, show only that section
          if (type === 'subjective') {
            // Only show subjective reports - ensure objective reports are not displayed
            return (
              <div className="mb-8">
                <div id="subjective-reports-section">
                  <ReportSection
                    title="Subjective SQA Reports"
                    type="subjective"
                    reports={subjectiveReports}
                    onUpload={(file) => handleFileUpload('subjective', file)}
                    onDelete={handleDeleteReport}
                    showDetails={showSubjectiveDetails}
                    setShowDetails={setShowSubjectiveDetails}
                  />
                </div>
                {/* Ensure objective reports section is NOT rendered */}
                {objectiveReports.length > 0 && console.warn('Objective reports found on subjective page - this should not happen')}
              </div>
            );
          } else if (type === 'objective') {
            // Only show objective reports - ensure subjective reports are not displayed
            return (
              <div className="mb-8">
                <div id="objective-reports-section">
                  <ReportSection
                    title="Objective SQA Reports"
                    type="objective"
                    reports={objectiveReports}
                    onUpload={null}
                    onDelete={handleDeleteReport}
                    showDetails={showObjectiveDetails}
                    setShowDetails={setShowObjectiveDetails}
                    onUploadResult={handleUploadObjectiveResult}
                  />
                </div>
                
                {/* Objective Visualizations */}
                {objectiveReports.length > 0 && (
                  <ExcelMetricVisualization 
                    reports={objectiveReports}
                    versionId={versionId}
                  />
                )}
                {/* Ensure subjective reports section is NOT rendered */}
                {subjectiveReports.length > 0 && console.warn('Subjective reports found on objective page - this should not happen')}
              </div>
            );
          } else {
            // Default: show both sections side by side
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div id="subjective-reports-section">
                  <ReportSection
                    title="Subjective SQA Reports"
                    type="subjective"
                    reports={subjectiveReports}
                    onUpload={(file) => handleFileUpload('subjective', file)}
                    onDelete={handleDeleteReport}
                    showDetails={showSubjectiveDetails}
                    setShowDetails={setShowSubjectiveDetails}
                  />
                </div>
                <div id="objective-reports-section">
                  <ReportSection
                    title="Objective SQA Reports"
                    type="objective"
                    reports={objectiveReports}
                    onUpload={null}
                    onDelete={handleDeleteReport}
                    showDetails={showObjectiveDetails}
                    setShowDetails={setShowObjectiveDetails}
                    onUploadResult={handleUploadObjectiveResult}
                  />
                </div>
              </div>
            );
          }
        })()}

        {/* SQA Results Section - Available for subjective and all pages, hidden only for objective */}
        {(() => {
          const type = searchParams.get('type');
          // Show SQA Results section for subjective and when no type is specified
          // Hide it only for objective page (objective uses "Upload Result" form instead)
          return type !== 'objective';
        })() && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">SQA Results</h3>
                <button
                  onClick={() => setShowSqaResultForm(!showSqaResultForm)}
                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                >
                  <FiUpload className="mr-1" size={12} />
                  {showSqaResultForm ? 'Cancel' : 'Upload New Result'}
                </button>
              </div>

              {/* Upload Form */}
              {showSqaResultForm && (
                <form onSubmit={handleSqaResultSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Result Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={sqaResultForm.name}
                        onChange={handleNameChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Test Run 1, Baseline Results"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Metrics
                      </label>
                      <textarea
                        value={sqaResultForm.metrics}
                        onChange={handleMetricsChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows="4"
                        placeholder="Enter metrics as text"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Input Folder
                      </label>
                      <input
                        type="file"
                        multiple
                        directory=""
                        webkitdirectory=""
                        onChange={(e) => setSqaResultForm({ ...sqaResultForm, inputFiles: e.target.files })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {sqaResultForm.inputFiles && (
                        <p className="text-sm text-gray-500 mt-1">
                          {sqaResultForm.inputFiles.length} file(s) selected
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Output Folder
                      </label>
                      <input
                        type="file"
                        multiple
                        directory=""
                        webkitdirectory=""
                        onChange={(e) => setSqaResultForm({ ...sqaResultForm, outputFiles: e.target.files })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {sqaResultForm.outputFiles && (
                        <p className="text-sm text-gray-500 mt-1">
                          {sqaResultForm.outputFiles.length} file(s) selected
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Final Excel File (.xlsx)
                      </label>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setSqaResultForm({ ...sqaResultForm, finalExcel: e.target.files[0] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {sqaResultForm.finalExcel && (
                        <p className="text-sm text-gray-500 mt-1">
                          Selected: {sqaResultForm.finalExcel.name}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={uploading}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? 'Uploading...' : 'Upload SQA Result'}
                    </button>
                  </div>
                </form>
              )}

            {/* Results List */}
            <div className="space-y-4">
              {sqaResults.length === 0 ? (
                <p className="text-gray-400 text-sm">No SQA Results uploaded yet</p>
              ) : (
                sqaResults.map((result) => (
                  <div key={result._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">{result.name}</h4>
                        {result.metrics && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Metrics:</p>
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                              {result.metrics}
                            </pre>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditSqaResult(result)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDeleteSqaResult(result._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>

                    {/* Edit Form */}
                    {editingResultId === result._id && (
                      <form onSubmit={handleUpdateSqaResult} className="mb-4 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Result Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={handleEditNameChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Test Run 1, Baseline Results"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Metrics
                      </label>
                      <textarea
                        value={editForm.metrics}
                        onChange={handleEditMetricsChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows="4"
                        placeholder="Enter metrics as text"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Add Input Files (optional - will append to existing)
                      </label>
                      <input
                        type="file"
                        multiple
                        directory=""
                        webkitdirectory=""
                        onChange={(e) => setEditForm({ ...editForm, inputFiles: e.target.files })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {editForm.inputFiles && (
                        <p className="text-sm text-gray-500 mt-1">
                          {editForm.inputFiles.length} file(s) selected
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Add Output Files (optional - will append to existing)
                      </label>
                      <input
                        type="file"
                        multiple
                        directory=""
                        webkitdirectory=""
                        onChange={(e) => setEditForm({ ...editForm, outputFiles: e.target.files })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {editForm.outputFiles && (
                        <p className="text-sm text-gray-500 mt-1">
                          {editForm.outputFiles.length} file(s) selected
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Replace Final Excel File (.xlsx) (optional)
                      </label>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setEditForm({ ...editForm, finalExcel: e.target.files[0] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {editForm.finalExcel && (
                        <p className="text-sm text-gray-500 mt-1">
                          Selected: {editForm.finalExcel.name}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={uploading}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? 'Updating...' : 'Update SQA Result'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={uploading}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Input Files:</p>
                        <p className="text-gray-600">{result.inputFiles?.length || 0} file(s)</p>
                        {result.inputFiles && result.inputFiles.length > 0 && (
                          <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                            {result.inputFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 truncate">{file.fileName}</span>
                                <button
                                  onClick={() => handleDownload(file.filePath, file.fileName)}
                                  className="text-indigo-600 hover:text-indigo-900 ml-2"
                                >
                                  <FiDownload />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-gray-700">Output Files:</p>
                        <p className="text-gray-600">{result.outputFiles?.length || 0} file(s)</p>
                        {result.outputFiles && result.outputFiles.length > 0 && (
                          <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                            {result.outputFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 truncate">{file.fileName}</span>
                                <button
                                  onClick={() => handleDownload(file.filePath, file.fileName)}
                                  className="text-indigo-600 hover:text-indigo-900 ml-2"
                                >
                                  <FiDownload />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-gray-700">Final Excel:</p>
                        {result.finalExcel && result.finalExcel.fileName ? (
                          <div className="mt-1">
                            <p className="text-gray-600 text-xs truncate">{result.finalExcel.fileName}</p>
                            <button
                              onClick={() => handleDownload(result.finalExcel.filePath, result.finalExcel.fileName)}
                              className="text-indigo-600 hover:text-indigo-900 text-xs mt-1 flex items-center"
                            >
                              <FiDownload className="mr-1" />
                              Download
                            </button>
                          </div>
                        ) : (
                          <p className="text-gray-400 text-xs">No file</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                      Uploaded: {new Date(result.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        )}

        {/* Project References Section - Only show for subjective analysis */}
        {currentType !== 'objective' && (
          <div id="project-references-section" className="mb-8">
            <ProjectReferences versionId={versionId} user={user} />
          </div>
        )}

        </div>
      </main>
    </div>
  );
};


export default SQAPage;


