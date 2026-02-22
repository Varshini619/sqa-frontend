import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FiX, FiPlus, FiTrash2, FiTrendingUp, FiTrendingDown, FiMinus, FiAward, FiTarget, FiBarChart2, FiAlertTriangle } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import CircularKPIComparison from './CircularKPIComparison';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../config';

const VersionComparison = ({ currentVersionId, projectId }) => {
  const [showComparison, setShowComparison] = useState(false);
  const [versions, setVersions] = useState([]);
  
  // Multiple version selections - array of { versionId, resultId, versionNumber, sqaType }
  // sqaType: 'subjective' or 'objective'
  const [selectedVersions, setSelectedVersions] = useState([]);
  
  // Store results for each version
  const [versionResults, setVersionResults] = useState({}); // { versionId: [results] }
  
  // Dynamic metrics list - will be fetched from Excel files
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  
  // Comparison result
  const [comparisonData, setComparisonData] = useState(null);
  const [averageMetrics, setAverageMetrics] = useState(null);
  const [loadingAverages, setLoadingAverages] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('');
  const [detailedComparison, setDetailedComparison] = useState(null);
  const [loadingDetailed, setLoadingDetailed] = useState(false);
  
  // Dashboard data for objective SQA
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  
  // Noise Level Performance Trend data
  const [noiseLevelData, setNoiseLevelData] = useState(null);
  const [loadingNoiseLevel, setLoadingNoiseLevel] = useState(false);
  const [noiseLevelViewMode, setNoiseLevelViewMode] = useState('overall'); // 'overall' or 'selected'
  const [selectedNoiseLevelMetric, setSelectedNoiseLevelMetric] = useState('');
  
  // Version selection for difference comparison (when 3+ versions)
  const [differenceVersionA, setDifferenceVersionA] = useState(0);
  const [differenceVersionB, setDifferenceVersionB] = useState(1);
  
  // Reset difference version selections when dashboard data changes
  useEffect(() => {
    if (dashboardData && dashboardData.length >= 2) {
      setDifferenceVersionA(0);
      setDifferenceVersionB(Math.min(1, dashboardData.length - 1));
    }
  }, [dashboardData]);

  // Color palette for multiple versions
  const versionColors = [
    { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-blue-600' },
    { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-green-600' },
    { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', text: 'text-purple-600' },
    { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-orange-600' },
    { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-red-600' },
    { bg: 'bg-teal-500', hover: 'hover:bg-teal-600', text: 'text-teal-600' },
    { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', text: 'text-pink-600' },
    { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', text: 'text-yellow-600' },
  ];

  useEffect(() => {
    if (showComparison && projectId) {
      fetchVersions();
      // Initialize with two empty version selections
      if (selectedVersions.length === 0) {
        setSelectedVersions([
          { versionId: currentVersionId || '', resultId: '', versionNumber: '', sqaType: 'subjective' },
          { versionId: '', resultId: '', versionNumber: '', sqaType: 'subjective' }
        ]);
      }
    }
  }, [showComparison, projectId]);

  // Update versionNumber when versions are loaded and currentVersionId is set
  useEffect(() => {
    if (versions.length > 0 && currentVersionId) {
      const currentVersion = versions.find(v => v.id === currentVersionId);
      if (currentVersion) {
        setSelectedVersions(prev => prev.map((selection, index) => {
          if (index === 0 && selection.versionId === currentVersionId && !selection.versionNumber) {
            return { ...selection, versionNumber: currentVersion.versionNumber };
          }
          return selection;
        }));
      }
    }
  }, [versions, currentVersionId]);

  // Fetch results when a version is selected or SQA type changes
  useEffect(() => {
    selectedVersions.forEach((selection) => {
      if (selection.versionId) {
        const sqaType = selection.sqaType || 'subjective';
        const resultKey = `${selection.versionId}_${sqaType}`;
        // Always fetch if we don't have results for this key, or if results array is empty
        if (!versionResults[resultKey] || (Array.isArray(versionResults[resultKey]) && versionResults[resultKey].length === 0)) {
          console.log(`[VersionComparison] Fetching ${sqaType} results for version ${selection.versionId}`);
          fetchVersionResults(selection.versionId, sqaType);
        }
      }
    });
  }, [selectedVersions]);

  // Fetch available metrics when at least 2 results are selected
  useEffect(() => {
    const selectedResults = selectedVersions.filter(s => s.resultId);
    if (selectedResults.length >= 2) {
      fetchAvailableMetrics(selectedResults.map(s => s.resultId));
    } else {
      setAvailableMetrics([]);
    }
  }, [selectedVersions]);

  const fetchVersions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/projects/${projectId}`);
      const versionsList = response.data.versions || [];
      setVersions(versionsList);
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  };

  const fetchVersionResults = async (versionId, sqaType = 'subjective') => {
    try {
      // Use the correct endpoint based on SQA type
      let response;
      if (sqaType === 'objective') {
        response = await axios.get(`${API_BASE_URL}/api/objective/${versionId}`);
      } else {
        // subjective or default
        response = await axios.get(`${API_BASE_URL}/api/subjective/${versionId}`);
      }
      
      const resultKey = `${versionId}_${sqaType}`;
      setVersionResults(prev => ({ ...prev, [resultKey]: response.data || [] }));
      
      console.log(`[VersionComparison] Fetched ${response.data?.length || 0} ${sqaType} results for version ${versionId}`);
      
      // Auto-select first result if available
      const selectionIndex = selectedVersions.findIndex(s => s.versionId === versionId && (s.sqaType || 'subjective') === sqaType);
      if (selectionIndex !== -1 && !selectedVersions[selectionIndex].resultId && response.data && response.data.length > 0) {
        updateVersionSelection(selectionIndex, { resultId: response.data[0]._id });
      }
    } catch (error) {
      console.error(`Error fetching ${sqaType} version results:`, error);
      // Set empty array on error to prevent undefined issues
      const resultKey = `${versionId}_${sqaType}`;
      setVersionResults(prev => ({ ...prev, [resultKey]: [] }));
    }
  };

  const fetchAvailableMetrics = async (resultIds) => {
    if (resultIds.length < 2) return;
    
    setLoadingMetrics(true);
    try {
      // Fetch common metrics from first two results, then check others
      const response = await axios.post(`${API_BASE_URL}/api/sqa-results/common-metrics`, {
        resultIdA: resultIds[0],
        resultIdB: resultIds[1]
      });
      
      let commonMetrics = response.data.metrics || [];
      
      // Check if other results have the same metrics
      if (resultIds.length > 2) {
        for (let i = 2; i < resultIds.length; i++) {
          const checkResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/common-metrics`, {
            resultIdA: resultIds[0],
            resultIdB: resultIds[i]
          });
          const otherMetrics = checkResponse.data.metrics || [];
          commonMetrics = commonMetrics.filter(m => otherMetrics.includes(m));
        }
      }
      
      setAvailableMetrics(commonMetrics);
    } catch (error) {
      console.error('Error fetching available metrics:', error);
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data?.details;
      console.error('Error details:', errorDetails);
      if (errorMessage.includes('not found on disk')) {
        alert(`Error: ${errorMessage}\n\nThis usually means the Excel files were moved or deleted. Please re-upload the Excel files for the selected results.`);
      }
      setAvailableMetrics([]);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const addVersionSelection = () => {
    const newSelection = {
      versionId: '',
      resultId: '',
      versionNumber: '',
      sqaType: 'subjective'
    };
    setSelectedVersions([...selectedVersions, newSelection]);
  };

  const removeVersionSelection = (index) => {
    const updated = selectedVersions.filter((_, i) => i !== index);
    setSelectedVersions(updated);
    
    // Clean up unused results
    const removed = selectedVersions[index];
    if (removed.versionId && updated.every(s => s.versionId !== removed.versionId)) {
      setVersionResults(prev => {
        const newResults = { ...prev };
        delete newResults[removed.versionId];
        return newResults;
      });
    }
  };

  const updateVersionSelection = (index, updates) => {
    setSelectedVersions(prev => prev.map((selection, i) => {
      if (i === index) {
        const updated = { ...selection, ...updates };
        
        // Update version number when version changes
        if (updates.versionId !== undefined) {
          const version = versions.find(v => v.id === updates.versionId);
          updated.versionNumber = version?.versionNumber || '';
          // Reset result when version changes
          if (updates.versionId !== selection.versionId) {
            updated.resultId = '';
          }
        }
        
        // Reset result and fetch new results when SQA type changes
        if (updates.sqaType !== undefined && updates.sqaType !== selection.sqaType) {
          updated.resultId = '';
          updated.allResults = [];
          // Fetch results for the new SQA type
          if (updated.versionId) {
            fetchVersionResults(updated.versionId, updates.sqaType);
          }
        }
        
        return updated;
      }
      return selection;
    }));
  };

  const handleCompare = async () => {
    const validSelections = selectedVersions.filter(s => s.versionId && s.resultId);
    
    if (validSelections.length < 2) {
      alert('Please select at least 2 versions with results');
      return;
    }

    // Check if all selections are objective type
    const allObjective = validSelections.every(s => (s.sqaType || 'subjective') === 'objective');

    setLoadingAverages(true);
    setLoadingDashboard(true);
    try {
      const resultIds = validSelections.map(s => s.resultId);
      await fetchAllAverageMetrics(resultIds);
      
      // Set comparison data with version numbers and result info
      setComparisonData({
        versions: validSelections.map(s => {
          const version = versions.find(v => v.id === s.versionId);
          const resultKey = `${s.versionId}_${s.sqaType || 'subjective'}`;
          const result = versionResults[resultKey]?.find(r => r._id === s.resultId);
          return {
            versionNumber: s.versionNumber || version?.versionNumber || 'Unknown',
            resultId: s.resultId,
            resultName: result?.name || 'Unknown',
            sqaType: s.sqaType || 'subjective'
          };
        })
      });
      
      // If all are objective, fetch dashboard data
      if (allObjective) {
        await fetchDashboardData(validSelections);
      } else {
        setDashboardData(null);
      }
    } catch (error) {
      console.error('Error fetching all average metrics:', error);
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data?.details;
      const uploadsDir = error.response?.data?.uploadsDir;
      
      let fullMessage = `Failed to fetch metrics: ${errorMessage}`;
      if (errorDetails) {
        fullMessage += `\n\nDetails:\n${Array.isArray(errorDetails) ? errorDetails.join('\n') : errorDetails}`;
      }
      if (uploadsDir) {
        fullMessage += `\n\nUploads directory: ${uploadsDir}`;
      }
      
      alert(fullMessage);
    } finally {
      setLoadingAverages(false);
      setLoadingDashboard(false);
    }
  };

  const fetchAllAverageMetrics = async (resultIds) => {
    try {
      let metricsToUse = availableMetrics;
      
      if (!metricsToUse || metricsToUse.length === 0) {
        // Fetch common metrics from first two results
        const metricsResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/common-metrics`, {
          resultIdA: resultIds[0],
          resultIdB: resultIds[1]
        });
        metricsToUse = metricsResponse.data.metrics || [];
        
        // Check other results
        if (resultIds.length > 2) {
          for (let i = 2; i < resultIds.length; i++) {
            const checkResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/common-metrics`, {
              resultIdA: resultIds[0],
              resultIdB: resultIds[i]
            });
            const otherMetrics = checkResponse.data.metrics || [];
            metricsToUse = metricsToUse.filter(m => otherMetrics.includes(m));
          }
        }
        
        if (metricsToUse.length === 0) {
          console.warn('No common metrics found in Excel files');
          setAverageMetrics({ metrics: [] });
          return;
        }
        setAvailableMetrics(metricsToUse);
      }
      
      // Fetch average metrics for all metrics and all result pairs
      const allMetricsData = [];
      
      for (const metricName of metricsToUse) {
        const metricData = {
          name: metricName,
          averages: []
        };
        
        for (let i = 0; i < resultIds.length; i++) {
          try {
            // Compare with first result to get average
            const response = await axios.post(`${API_BASE_URL}/api/sqa-results/average-metrics`, {
              resultIdA: resultIds[0],
              resultIdB: resultIds[i],
              metricName,
              metricNumberA: null,
              metricNumberB: null
            });
            
            if (response.data && response.data.metrics && response.data.metrics.length > 0) {
              const metric = response.data.metrics[0];
              // Use avgB for the current result (since we're comparing with result 0)
              metricData.averages.push({
                resultIndex: i,
                value: i === 0 ? metric.avgA : metric.avgB
              });
            }
          } catch (error) {
            console.error(`Error fetching ${metricName} for result ${i}:`, error);
            metricData.averages.push({
              resultIndex: i,
              value: null
            });
          }
        }
        
        allMetricsData.push(metricData);
      }
      
      setAverageMetrics({
        metrics: allMetricsData
      });
    } catch (error) {
      console.error('Error fetching all average metrics:', error);
      throw error;
    }
  };

  const fetchDetailedComparison = async (metricName) => {
    const validSelections = selectedVersions.filter(s => s.versionId && s.resultId);
    if (validSelections.length < 2) {
      alert('Please select at least 2 versions with results');
      return;
    }

    // For now, compare first two versions (can be extended later)
    const resultA = validSelections[0].resultId;
    const resultB = validSelections[1].resultId;

    // Validate that results exist
    if (!resultA || !resultB) {
      alert('Please ensure both versions have valid results selected');
      return;
    }

    // Validate result IDs format (MongoDB ObjectId)
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!objectIdPattern.test(resultA) || !objectIdPattern.test(resultB)) {
      console.error(`[VersionComparison] Invalid result ID format:`, { resultA, resultB });
      alert('Invalid result IDs. Please reselect the versions and try again.');
      return;
    }

    setLoadingDetailed(true);
    setDetailedComparison(null); // Clear previous comparison
    try {
      console.log(`[VersionComparison] Fetching detailed comparison for metric: "${metricName}"`);
      console.log(`[VersionComparison] Result A: ${resultA}, Result B: ${resultB}`);
      
      // Send the metric name as-is first (backend handles flexible matching)
      // The backend will handle case-insensitive matching and variations like "Noise Suppression" vs "noise suppression"
      const response = await axios.post(`${API_BASE_URL}/api/sqa-results/compare`, {
        resultIdA: resultA,
        resultIdB: resultB,
        metricName: metricName.trim(), // Trim whitespace
        metricNumberA: null,
        metricNumberB: null
      });
      
      console.log(`[VersionComparison] Detailed comparison response received:`, response.data);
      
      if (response.data && response.data.comparison && Array.isArray(response.data.comparison)) {
        setDetailedComparison(response.data);
        console.log(`[VersionComparison] Successfully set detailed comparison with ${response.data.comparison.length} items`);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error fetching detailed comparison:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      const errorMessage = error.response?.data?.message || error.message;
      const statusCode = error.response?.status;
      
      // Handle different error scenarios
      if (statusCode === 404) {
        // 404 could mean results not found OR metric not found
        if (errorMessage.includes('results not found') || errorMessage.includes('One or both results not found')) {
          console.error(`[VersionComparison] Results not found: ${errorMessage}`);
          alert(`Unable to find the selected results. Please ensure both versions have valid results with Excel files uploaded.`);
        } else if (errorMessage.includes('Excel files not found') || errorMessage.includes('not found on disk')) {
          console.error(`[VersionComparison] Excel files not found: ${errorMessage}`);
          alert(`Excel files not found for one or both results. Please re-upload the Excel files.`);
        } else {
          // Metric not found - try to provide helpful information
          console.warn(`[VersionComparison] Metric "${metricName}" not found in Excel files`);
          console.warn(`[VersionComparison] This might be because the metric name doesn't match exactly.`);
          console.warn(`[VersionComparison] Available metrics: ${availableMetrics.join(', ')}`);
          
          // Check if there's a similar metric name
          const normalizedSearch = metricName.toLowerCase().trim();
          const similarMetric = availableMetrics.find(m => {
            const normalized = m.toLowerCase().trim();
            return normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized) ||
                   (normalizedSearch.includes('noise') && normalizedSearch.includes('suppression') &&
                    normalized.includes('noise') && normalized.includes('suppression'));
          });
          
          if (similarMetric && similarMetric !== metricName) {
            console.info(`[VersionComparison] Found similar metric: "${similarMetric}"`);
          }
        }
      } else if (statusCode === 400) {
        console.error(`[VersionComparison] Bad request: ${errorMessage}`);
      } else {
        console.error(`[VersionComparison] Error (${statusCode}): ${errorMessage}`);
      }
      
      // Keep selectedMetric so user can see what they selected
      // setDetailedComparison will remain null, which will show the helpful message
      setDetailedComparison(null);
    } finally {
      setLoadingDetailed(false);
    }
  };

  // Fetch dashboard data for objective SQA comparison
  const fetchDashboardData = async (validSelections) => {
    try {
      console.log('[VersionComparison-fetchDashboardData] Starting with selections:', validSelections);
      const dashboardResults = [];
      
      if (validSelections.length > 1) {
        // Validate result IDs before making API call
        const resultIdA = validSelections[0].resultId;
        const resultIdB = validSelections[1].resultId;
        
        console.log(`[VersionComparison-fetchDashboardData] Comparing results:`);
        console.log(`[VersionComparison-fetchDashboardData]   Result A: ${resultIdA} (${validSelections[0].versionNumber})`);
        console.log(`[VersionComparison-fetchDashboardData]   Result B: ${resultIdB} (${validSelections[1].versionNumber})`);
        
        if (!resultIdA || !resultIdB || resultIdA === 'all' || resultIdB === 'all') {
          console.error('[VersionComparison-fetchDashboardData] Invalid result IDs');
          setDashboardData(null);
          return;
        }
        
        // Get common metrics
        let commonMetrics = [];
        try {
          const commonMetricsResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/common-metrics`, {
            resultIdA: resultIdA,
            resultIdB: resultIdB
          });
          commonMetrics = commonMetricsResponse.data.metrics || [];
          console.log(`[VersionComparison-fetchDashboardData] Found ${commonMetrics.length} common metrics:`, commonMetrics);
        } catch (error) {
          console.error('[VersionComparison-fetchDashboardData] Error fetching common metrics:', error);
          setDashboardData(null);
          return;
        }
        
        if (commonMetrics.length === 0) {
          console.warn('[VersionComparison-fetchDashboardData] No common metrics found');
          setDashboardData(null);
          return;
        }
        
        // For each version, calculate averages for common metrics
        for (let i = 0; i < validSelections.length; i++) {
          const sel = validSelections[i];
          const versionMetrics = {};
          const versionMetricsList = [];
          
          // Use first result as baseline for comparison
          const baselineResultId = validSelections[0].resultId;
          
          console.log(`[VersionComparison-fetchDashboardData] Processing version ${i + 1}: ${sel.versionNumber} (resultId: ${sel.resultId})`);
          
          for (const metricName of commonMetrics) {
            try {
              const avgResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/average-metrics`, {
                resultIdA: baselineResultId,
                resultIdB: sel.resultId,
                metricName: metricName,
                metricNumberA: null,
                metricNumberB: null
              });
              
              if (avgResponse.data && avgResponse.data.metrics && avgResponse.data.metrics.length > 0) {
                const metric = avgResponse.data.metrics[0];
                // Use avgA for baseline (first version), avgB for others
                const avgValue = i === 0 ? metric.avgA : metric.avgB;
                if (avgValue !== null && avgValue !== undefined && !isNaN(avgValue)) {
                  versionMetrics[metricName] = avgValue;
                  versionMetricsList.push(metricName);
                }
              }
            } catch (error) {
              console.error(`[VersionComparison-fetchDashboardData] Error fetching ${metricName} for ${sel.versionNumber}:`, error);
            }
          }
          
          console.log(`[VersionComparison-fetchDashboardData] Version ${sel.versionNumber}: ${versionMetricsList.length} metrics collected`);
          
          if (versionMetricsList.length > 0) {
            const resultKey = `${sel.versionId}_${sel.sqaType || 'subjective'}`;
            const result = versionResults[resultKey]?.find(r => r._id === sel.resultId);
            dashboardResults.push({
              versionName: sel.versionNumber,
              versionNumber: sel.versionNumber,
              resultName: result?.name || 'Unknown',
              metrics: versionMetrics,
              allMetrics: versionMetricsList
            });
          } else {
            console.warn(`[VersionComparison-fetchDashboardData] No metrics collected for ${sel.versionNumber}`);
          }
        }
      }
      
      console.log(`[VersionComparison-fetchDashboardData] Final dashboard results: ${dashboardResults.length} versions`);
      if (dashboardResults.length >= 2) {
        console.log('[VersionComparison-fetchDashboardData] Dashboard data loaded successfully:', dashboardResults);
        setDashboardData(dashboardResults);
      } else {
        console.warn(`[VersionComparison-fetchDashboardData] Not enough dashboard results: ${dashboardResults.length} (need at least 2)`);
        setDashboardData(null);
      }
    } catch (error) {
      console.error('[VersionComparison-fetchDashboardData] Error fetching dashboard data:', error);
      setDashboardData(null);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Fetch Noise Level Performance data from Excel files
  const fetchNoiseLevelData = async (validSelections) => {
    if (!validSelections || validSelections.length < 2) return;
    
    setLoadingNoiseLevel(true);
    try {
      const noiseLevelResults = [];
      
      for (let i = 0; i < validSelections.length; i++) {
        const sel = validSelections[i];
        const resultKey = `${sel.versionId}_${sel.sqaType || 'objective'}`;
        const result = versionResults[resultKey]?.find(r => r._id === sel.resultId);
        
        if (!result || !result.finalExcel || !result.finalExcel.filePath) {
          console.warn(`[NoiseLevel] No Excel file for ${sel.versionNumber}`);
          continue;
        }
        
        try {
          // Fetch Excel file - normalize path like ExcelMetricVisualization does
          const filePath = result.finalExcel.filePath || result.finalExcel.filepath;
          const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
          const fileUrl = `${API_BASE_URL}/uploads/${normalizedPath}`;
          
          console.log(`[NoiseLevel] Loading Excel file from: ${fileUrl}`);
          
          const excelResponse = await axios.get(fileUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          const workbook = XLSX.read(excelResponse.data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const excelData = XLSX.utils.sheet_to_json(worksheet);
          
          if (excelData.length === 0) continue;
          
          // Detect dB level column
          const firstRow = excelData[0];
          const columns = Object.keys(firstRow);
          const dbLevelCol = columns.find(col => {
            const colLower = col.toLowerCase();
            return colLower.includes('db/snr') || colLower.includes('snr/db') ||
                   (colLower.includes('db') && colLower.includes('level')) ||
                   (colLower.includes('snr') && colLower.includes('level')) ||
                   colLower.includes('db') || colLower.includes('snr');
          });
          
          if (!dbLevelCol) {
            console.warn(`[NoiseLevel] No dB level column found for ${sel.versionNumber}`);
            continue;
          }
          
          // Extract metrics (exclude dB level, noise type, file name columns)
          const metricColumns = columns.filter(col => {
            const colLower = col.toLowerCase();
            return col !== dbLevelCol &&
                   !colLower.includes('noise') && !colLower.includes('type') &&
                   !colLower.includes('file') && !colLower.includes('name') &&
                   excelData.some(row => !isNaN(parseFloat(row[col])));
          });
          
          // Group data by dB level
          const dbLevelGroups = {};
          excelData.forEach(row => {
            const dbLevel = String(row[dbLevelCol] || '').trim();
            if (!dbLevel) return;
            
            if (!dbLevelGroups[dbLevel]) {
              dbLevelGroups[dbLevel] = [];
            }
            
            const metricValues = {};
            metricColumns.forEach(metric => {
              const value = parseFloat(row[metric]);
              if (!isNaN(value)) {
                metricValues[metric] = value;
              }
            });
            
            if (Object.keys(metricValues).length > 0) {
              dbLevelGroups[dbLevel].push(metricValues);
            }
          });
          
          // Calculate averages for each dB level
          const dbLevelAverages = {};
          Object.keys(dbLevelGroups).forEach(dbLevel => {
            const rows = dbLevelGroups[dbLevel];
            const metricSums = {};
            const metricCounts = {};
            
            rows.forEach(row => {
              Object.keys(row).forEach(metric => {
                if (!metricSums[metric]) {
                  metricSums[metric] = 0;
                  metricCounts[metric] = 0;
                }
                metricSums[metric] += row[metric];
                metricCounts[metric]++;
              });
            });
            
            dbLevelAverages[dbLevel] = {};
            Object.keys(metricSums).forEach(metric => {
              dbLevelAverages[dbLevel][metric] = metricSums[metric] / metricCounts[metric];
            });
          });
          
          noiseLevelResults.push({
            versionName: sel.versionNumber,
            versionNumber: sel.versionNumber,
            resultId: sel.resultId,
            dbLevelAverages: dbLevelAverages,
            metrics: metricColumns
          });
        } catch (error) {
          console.error(`[NoiseLevel] Error processing ${sel.versionNumber}:`, error);
        }
      }
      
      if (noiseLevelResults.length >= 2) {
        setNoiseLevelData(noiseLevelResults);
      } else {
        setNoiseLevelData(null);
      }
    } catch (error) {
      console.error('[NoiseLevel] Error fetching noise level data:', error);
      setNoiseLevelData(null);
    } finally {
      setLoadingNoiseLevel(false);
    }
  };
  
  // Fetch noise level data when dashboard data is ready
  useEffect(() => {
    if (dashboardData && dashboardData.length >= 2 && selectedVersions.every(v => (v.sqaType || 'subjective') === 'objective')) {
      const validSelections = selectedVersions.filter(s => s.versionId && s.resultId);
      if (validSelections.length >= 2) {
        fetchNoiseLevelData(validSelections);
      }
    } else {
      setNoiseLevelData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardData]);
  
  // Calculate comparison metrics (differences, winners, etc.) for dashboard
  const comparisonMetrics = useMemo(() => {
    if (!dashboardData || dashboardData.length < 2) return null;
    
    // Get common metrics across all versions
    const commonMetrics = dashboardData[0].allMetrics.filter(metric => {
      return dashboardData.every(version => version.allMetrics.includes(metric));
    });
    
    if (commonMetrics.length === 0) return null;
    
    const metrics = [];
    const versionScores = {};
    
    // Initialize version scores
    dashboardData.forEach((version, idx) => {
      versionScores[idx] = {
        name: version.versionName || version.versionNumber,
        versionNumber: version.versionNumber,
        totalScore: 0,
        metricCount: 0
      };
    });
    
    // Calculate differences for each metric
    commonMetrics.forEach(metric => {
      const scores = dashboardData.map(v => v.metrics[metric] || 0);
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      // Find winners and losers
      const winners = [];
      const losers = [];
      scores.forEach((score, idx) => {
        if (score === maxScore && maxScore > minScore) {
          winners.push(idx);
        }
        if (score === minScore && maxScore > minScore) {
          losers.push(idx);
        }
      });
      
      // Calculate differences (using first version as baseline)
      const differences = scores.map((score, idx) => {
        if (idx === 0) return 0;
        return score - scores[0];
      });
      
      metrics.push({
        name: metric,
        scores: scores.map((score, idx) => ({
          value: score,
          projectIndex: idx,
          isWinner: winners.includes(idx),
          isLoser: losers.includes(idx),
          difference: differences[idx]
        })),
        maxScore,
        minScore,
        avgScore,
        range: maxScore - minScore
      });
      
      // Update version totals
      scores.forEach((score, idx) => {
        versionScores[idx].totalScore += score;
        versionScores[idx].metricCount += 1;
      });
    });
    
    // Calculate overall averages
    Object.keys(versionScores).forEach(idx => {
      if (versionScores[idx].metricCount > 0) {
        versionScores[idx].averageScore = versionScores[idx].totalScore / versionScores[idx].metricCount;
      } else {
        versionScores[idx].averageScore = 0;
      }
    });
    
    // Find overall winner (highest average)
    const overallWinner = Object.values(versionScores).reduce((best, current) => {
      return current.averageScore > best.averageScore ? current : best;
    }, versionScores[0]);
    
    return {
      metrics,
      versionScores: Object.values(versionScores),
      overallWinner,
      commonMetrics
    };
  }, [dashboardData]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'improved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'degraded':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'same':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'improved':
        return <FiTrendingUp className="text-green-600" />;
      case 'degraded':
        return <FiTrendingDown className="text-red-600" />;
      case 'same':
        return <FiMinus className="text-yellow-600" />;
      default:
        return null;
    }
  };

  if (!showComparison) {
    return (
      <div className="mt-6">
        <button
          onClick={() => setShowComparison(true)}
          className="px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-all"
        >
          Compare Versions
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-lg p-6 border border-slate-200" style={{ boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.2), 0 2px 4px -1px rgba(30, 58, 138, 0.15)' }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Version Comparison</h2>
        <button
          onClick={() => {
            setShowComparison(false);
            setComparisonData(null);
            setSelectedVersions([]);
            setVersionResults({});
            setDetailedComparison(null);
            setSelectedMetric('');
          }}
          className="text-slate-400 hover:text-slate-600"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* Version Selections */}
      <div className="space-y-4 mb-6">
        {selectedVersions.map((selection, index) => (
          <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Version {index + 1}</h3>
              {selectedVersions.length > 1 && (
                <button
                  onClick={() => removeVersionSelection(index)}
                  className="text-red-500 hover:text-red-700"
                  title="Remove version"
                >
                  <FiTrash2 size={16} />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select SQA Type</label>
                <select
                  value={selection.sqaType || 'subjective'}
                  onChange={(e) => {
                    updateVersionSelection(index, { 
                      sqaType: e.target.value,
                      resultId: ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="subjective">Subjective</option>
                  <option value="objective">Objective</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Version</label>
                <select
                  value={selection.versionId}
                  onChange={(e) => {
                    updateVersionSelection(index, { 
                      versionId: e.target.value, 
                      resultId: '' 
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Select Version</option>
                  {versions.filter(v => !selectedVersions.some((s, i) => s.versionId === v.id && i !== index)).map(v => (
                    <option key={v.id} value={v.id}>{v.versionNumber}</option>
                  ))}
                </select>
              </div>
              
              {selection.versionId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Result</label>
                  <select
                    value={selection.resultId}
                    onChange={(e) => {
                      updateVersionSelection(index, { resultId: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="">Select Result</option>
                    {(() => {
                      const resultKey = `${selection.versionId}_${selection.sqaType || 'subjective'}`;
                      const results = versionResults[resultKey] || [];
                      console.log(`[VersionComparison] Rendering dropdown for ${resultKey}:`, results.length, 'results');
                      return results.map(r => (
                        <option key={r._id} value={r._id}>{r.name || r.finalExcel?.fileName || `Result ${r._id.substring(0, 8)}`}</option>
                      ));
                    })()}
                  </select>
                </div>
              )}
            </div>
          </div>
        ))}
        
        <button
          onClick={addVersionSelection}
          className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
        >
          <FiPlus size={16} />
          Add Version
        </button>
      </div>

      {/* Metrics Info and Selection */}
      <div className="mb-6">
        {selectedVersions.filter(s => s.resultId).length >= 2 && (
          <>
            {loadingMetrics ? (
              <div className="text-sm text-slate-500 py-2">Loading metrics from Excel files...</div>
            ) : (
              <>
                <p className="text-sm text-slate-700 mb-3">
                  {availableMetrics.length > 0 
                    ? `Found ${availableMetrics.length} metric${availableMetrics.length !== 1 ? 's' : ''} in all Excel files.`
                    : 'No common metrics found in all Excel files.'}
                </p>
                {availableMetrics.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Metric for Detailed Comparison</label>
                    <select
                      value={selectedMetric}
                      onChange={async (e) => {
                        const metricValue = e.target.value;
                        setSelectedMetric(metricValue);
                        if (metricValue) {
                          // Only fetch detailed comparison if we have valid results
                          const validSelections = selectedVersions.filter(s => s.versionId && s.resultId);
                          if (validSelections.length >= 2) {
                            await fetchDetailedComparison(metricValue);
                          } else {
                            setSelectedMetric('');
                            alert('Please ensure both versions have results selected before comparing individual metrics.');
                          }
                        } else {
                          setDetailedComparison(null);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="">ALL metrics comparison</option>
                      {availableMetrics.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Select "ALL metrics comparison" to view overall comparison. Individual metrics may not be available for detailed comparison.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Compare Button */}
      <div className="mb-6">
        <button
          onClick={handleCompare}
          disabled={loadingAverages || selectedVersions.filter(s => s.resultId).length < 2}
          className="px-6 py-2 bg-slate-700 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingAverages ? 'Comparing...' : 'Compare All Metrics'}
        </button>
      </div>

      {/* Selected Versions Info */}
      {selectedVersions.filter(s => s.versionId).length > 0 && (
        <div className="mt-6 mb-4 p-4 bg-slate-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedVersions.map((selection, index) => {
              if (!selection.versionId) return null;
              // Get version number from versions array if not set in selection
              const version = versions.find(v => v.id === selection.versionId);
              const displayVersionNumber = selection.versionNumber || version?.versionNumber || 'Not selected';
              return (
                <div key={index}>
                  <h4 className="text-sm font-semibold text-slate-700">Version {index + 1}</h4>
                  <p className="text-xs text-slate-600">
                    Version: {displayVersionNumber}
                  </p>
                  <p className="text-xs text-slate-600">
                    Result: {(versionResults[`${selection.versionId}_${selection.sqaType || 'subjective'}`] || []).find(r => r._id === selection.resultId)?.name || 'Not selected'}
                  </p>
                  <p className="text-xs text-slate-600">
                    SQA Type: {(selection.sqaType || 'subjective').charAt(0).toUpperCase() + (selection.sqaType || 'subjective').slice(1)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed File-by-File Comparison */}
      {loadingDetailed && (
        <div className="mt-6 text-center py-4">
          <div className="text-sm text-slate-500">Loading detailed comparison...</div>
        </div>
      )}
      {selectedMetric && !detailedComparison && !loadingDetailed && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <div className="text-yellow-600 font-semibold">Note:</div>
            <div className="text-sm text-yellow-700">
              Detailed comparison for "{selectedMetric}" could not be loaded. 
              <div className="mt-2">
                <span className="font-medium">Possible reasons:</span>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>The results may not exist in the database (404 error)</li>
                  <li>The Excel files may not be found on the server</li>
                  <li>The metric name may not match the Excel column headers exactly</li>
                  <li>The results may not have been fully processed</li>
                </ul>
              </div>
              <div className="mt-3">
                <span className="font-medium">What to check:</span>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Verify both versions have results selected (check Version 1 and Version 2 info above)</li>
                  <li>Ensure Excel files are uploaded for both results</li>
                  <li>Check the browser console (F12) for detailed error messages</li>
                  <li>Try selecting "ALL metrics comparison" to view the overall comparison with bar graphs</li>
                </ul>
              </div>
              <div className="mt-3 p-2 bg-yellow-100 rounded text-xs">
                <strong>Debug Info:</strong> Check console for result IDs and error details. The API endpoint is: <code className="bg-yellow-200 px-1 rounded">/api/sqa-results/compare</code>
              </div>
            </div>
          </div>
        </div>
      )}
      {detailedComparison && selectedMetric && !loadingDetailed && (() => {
        // Check if all selected versions have subjective SQA type
        const allSubjective = selectedVersions.length > 0 && 
          selectedVersions.every(v => (v.sqaType || 'subjective') === 'subjective');
        
        // Hide bar chart if all versions are subjective
        if (allSubjective) {
          return null;
        }
        
        return (
          <div className="mt-6">
            {/* Metrics Comparison Bar Chart */}
            <div className="mb-6 bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="text-base font-semibold text-slate-900 mb-3">
              Metrics Comparison Bar Chart
            </h3>
            <div className="mb-3 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>{detailedComparison.versionA.versionNumber} ({detailedComparison.versionA.resultName})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>{detailedComparison.versionB.versionNumber} ({detailedComparison.versionB.resultName})</span>
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-hidden">
              <div className="min-w-full" style={{ minHeight: '250px' }}>
                <div className="relative" style={{ height: '250px', padding: '20px 0 30px 50px' }}>
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 w-10" style={{ height: '220px' }}>
                    {[0, 1.0, 2.0, 3.0, 4.0, 5.0].map((value, idx) => {
                      const xAxisPosition = 220;
                      const barsStart = 40;
                      const chartHeight = xAxisPosition - barsStart;
                      const position = xAxisPosition - (value / 5) * chartHeight;
                      
                      if (value === 0) {
                        return (
                          <div
                            key={idx}
                            className="absolute text-xs text-slate-600 font-medium"
                            style={{ top: `${xAxisPosition}px`, transform: 'translateY(0)' }}
                          >
                            {value.toFixed(1)}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={idx}
                          className="absolute text-xs text-slate-600 font-medium"
                          style={{ top: `${position}px`, transform: 'translateY(-50%)' }}
                        >
                          {value.toFixed(1)}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* X-axis line */}
                  <div className="absolute left-10 right-0 border-t-2 border-slate-300" style={{ bottom: '30px' }}></div>
                  
                  {/* Bars container */}
                  <div className="flex items-end justify-start gap-1.5" style={{ height: '200px', paddingTop: '20px', paddingBottom: '0', position: 'absolute', bottom: '30px', left: '50px', right: '0' }}>
                    {detailedComparison.comparison
                      .filter(item => item.scoreA !== null || item.scoreB !== null)
                      .slice(0, 50)
                      .map((item, idx) => {
                        const maxScore = 5;
                        const containerHeight = 200;
                        const heightA = item.scoreA !== null ? (item.scoreA / maxScore) * containerHeight : 0;
                        const heightB = item.scoreB !== null ? (item.scoreB / maxScore) * containerHeight : 0;
                        const barWidth = Math.max(15, Math.min(30, 300 / detailedComparison.comparison.length));
                        
                        return (
                          <div
                            key={idx}
                            className="flex flex-col items-center"
                            style={{ width: `${barWidth}px`, minWidth: '15px' }}
                            title={`${item.fileName}\nVersion A: ${item.scoreA?.toFixed(2) || 'N/A'}\nVersion B: ${item.scoreB?.toFixed(2) || 'N/A'}`}
                          >
                            <div className="flex items-end gap-0.5 w-full" style={{ height: `${containerHeight}px` }}>
                              {item.scoreA !== null && (
                                <div
                                  className="bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative group"
                                  style={{
                                    width: '48%',
                                    height: `${heightA}px`,
                                    minHeight: heightA > 0 ? '2px' : '0'
                                  }}
                                >
                                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-slate-700 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                                    {item.scoreA.toFixed(2)}
                                  </div>
                                </div>
                              )}
                              {item.scoreB !== null && (
                                <div
                                  className="bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer relative group"
                                  style={{
                                    width: '48%',
                                    height: `${heightB}px`,
                                    minHeight: heightB > 0 ? '2px' : '0'
                                  }}
                                >
                                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-slate-700 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                                    {item.scoreB.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  
                  {/* File names below x-axis */}
                  <div className="absolute left-10 right-0 flex justify-start gap-1.5" style={{ bottom: '0px', paddingTop: '8px' }}>
                    {detailedComparison.comparison
                      .filter(item => item.scoreA !== null || item.scoreB !== null)
                      .slice(0, 50)
                      .map((item, idx) => {
                        const barWidth = Math.max(15, Math.min(30, 300 / detailedComparison.comparison.length));
                        return (
                          <div
                            key={idx}
                            className="text-xs text-slate-600 truncate text-center"
                            style={{ fontSize: '8px', width: `${barWidth}px`, minWidth: '15px' }}
                            title={item.fileName}
                          >
                            {item.fileName.length > 8 ? item.fileName.substring(0, 8) + '...' : item.fileName}
                          </div>
                        );
                      })}
                  </div>
                  
                  {/* Y-axis line */}
                  <div className="absolute left-10 w-0.5 bg-slate-300" style={{ top: '20px', bottom: '30px' }}></div>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Showing files with scores for {selectedMetric}. Hover over bars to see exact scores.
            </p>
          </div>

          {/* File-Level Comparison Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Version A Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200">
                <h4 className="text-xs font-semibold text-slate-900">
                  {detailedComparison.versionA.versionNumber} - {detailedComparison.versionA.metric}
                </h4>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-700">File Name</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-700">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {detailedComparison.comparison
                      .filter(item => item.scoreA !== null)
                      .map((item, idx) => {
                        const hasBoth = item.scoreA !== null && item.scoreB !== null;
                        return (
                          <tr 
                            key={idx} 
                            className={`hover:bg-slate-50 ${hasBoth ? getStatusColor(item.status) : ''}`}
                          >
                            <td className="px-2 py-1 text-slate-700">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs truncate max-w-[200px]" title={item.fileName}>
                                  {item.fileName.length > 25 ? item.fileName.substring(0, 25) + '...' : item.fileName}
                                </span>
                                {item.audioUrlA && (
                                  <audio
                                    controls
                                    className="w-full h-7"
                                    style={{ height: '28px' }}
                                    onPlay={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <source src={`${API_BASE_URL}${item.audioUrlA}`} type="audio/wav" />
                                    Your browser does not support the audio element.
                                  </audio>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1 font-medium text-slate-900 text-xs">{item.scoreA?.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Version B Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200">
                <h4 className="text-xs font-semibold text-slate-900">
                  {detailedComparison.versionB.versionNumber} - {detailedComparison.versionB.metric}
                </h4>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-700">File Name</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-700">Score</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {detailedComparison.comparison
                      .filter(item => item.scoreB !== null)
                      .map((item, idx) => {
                        const hasBoth = item.scoreA !== null && item.scoreB !== null;
                        return (
                          <tr 
                            key={idx} 
                            className={`hover:bg-slate-50 ${hasBoth ? getStatusColor(item.status) : ''}`}
                          >
                            <td className="px-2 py-1 text-slate-700">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs truncate max-w-[200px]" title={item.fileName}>
                                  {item.fileName.length > 25 ? item.fileName.substring(0, 25) + '...' : item.fileName}
                                </span>
                                {item.audioUrlB && (
                                  <audio
                                    controls
                                    className="w-full h-7"
                                    style={{ height: '28px' }}
                                    onPlay={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <source src={`${API_BASE_URL}${item.audioUrlB}`} type="audio/wav" />
                                    Your browser does not support the audio element.
                                  </audio>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1 font-medium text-slate-900 text-xs">{item.scoreB?.toFixed(2)}</td>
                            <td className="px-2 py-1">
                              {hasBoth && (
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(item.status)}
                                  {item.difference !== null && (
                                    <span className="text-xs">
                                      {item.difference > 0 ? '+' : ''}{item.difference.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* High-Level Dashboard Loading Spinner for Objective */}
      {comparisonData && loadingDashboard && selectedVersions.every(v => (v.sqaType || 'subjective') === 'objective') && (
        <div className="mt-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 p-8 shadow-2xl">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
            <p className="text-slate-300 text-lg">Loading dashboard...</p>
          </div>
        </div>
      )}
      
      {/* High-Level Dashboard for Objective SQA */}
      {comparisonData && !loadingDashboard && comparisonMetrics && dashboardData && dashboardData.length >= 2 && selectedVersions.every(v => (v.sqaType || 'subjective') === 'objective') && (
        <div className="mt-6 space-y-6">
          {/* Circular KPI Comparison */}
          <CircularKPIComparison versionScores={comparisonMetrics.versionScores} />
          
          {/* Metrics Comparison Table */}
          <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden backdrop-blur-sm">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/60 to-indigo-900/60 px-8 py-6 border-b border-slate-700/50 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                      <FiTarget className="text-indigo-400" size={24} />
                    </div>
                    Metrics Performance Comparison
                  </h3>
                  <p className="text-slate-400 text-sm ml-14">Comprehensive score analysis across all performance metrics</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 ml-14 md:ml-0">
                  {comparisonMetrics.versionScores.map((version, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${
                        idx === 0 ? 'bg-blue-500 shadow-blue-500/50' : 
                        idx === 1 ? 'bg-purple-500 shadow-purple-500/50' : 
                        idx === 2 ? 'bg-teal-500 shadow-teal-500/50' : 'bg-orange-500 shadow-orange-500/50'
                      }`}></div>
                      <span className="text-xs text-slate-200 font-semibold">{version.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Enhanced Table */}
            <div className="overflow-x-auto bg-slate-900/30">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm">
                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-600/50">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                        <span>Metric</span>
                      </div>
                    </th>
                    {comparisonMetrics.versionScores.map((version, idx) => (
                      <th key={idx} className="px-8 py-5 text-center text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-600/50">
                        <div className="flex items-center justify-center gap-2.5">
                          <div className={`w-3 h-3 rounded-full shadow-md ${
                            idx === 0 ? 'bg-blue-500 shadow-blue-500/50' : 
                            idx === 1 ? 'bg-purple-500 shadow-purple-500/50' : 
                            idx === 2 ? 'bg-teal-500 shadow-teal-500/50' : 'bg-orange-500 shadow-orange-500/50'
                          }`}></div>
                          <span className="font-semibold">{version.name}</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-600/50">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-1 h-6 bg-gradient-to-b from-slate-500 to-slate-400 rounded-full"></div>
                          <span>Difference</span>
                        </div>
                        {comparisonMetrics && comparisonMetrics.versionScores && comparisonMetrics.versionScores.length > 2 ? (
                          <div className="flex flex-col items-center gap-1.5 mt-2">
                            <div className="flex items-center gap-2">
                              <select
                                value={differenceVersionA}
                                onChange={(e) => {
                                  const newA = parseInt(e.target.value);
                                  setDifferenceVersionA(newA);
                                  if (newA === differenceVersionB && comparisonMetrics && comparisonMetrics.versionScores) {
                                    // If same version selected, switch to next available
                                    const nextB = (newA + 1) % comparisonMetrics.versionScores.length;
                                    setDifferenceVersionB(nextB);
                                  }
                                }}
                                className="text-xs bg-slate-800/80 border border-slate-600/50 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                              >
                                {comparisonMetrics.versionScores.map((version, idx) => (
                                  <option key={idx} value={idx}>
                                    {version.name}
                                  </option>
                                ))}
                              </select>
                              <span className="text-xs text-slate-400 font-medium">vs</span>
                              <select
                                value={differenceVersionB}
                                onChange={(e) => {
                                  const newB = parseInt(e.target.value);
                                  setDifferenceVersionB(newB);
                                  if (newB === differenceVersionA && comparisonMetrics && comparisonMetrics.versionScores) {
                                    // If same version selected, switch to next available
                                    const nextA = (newB + 1) % comparisonMetrics.versionScores.length;
                                    setDifferenceVersionA(nextA);
                                  }
                                }}
                                className="text-xs bg-slate-800/80 border border-slate-600/50 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                              >
                                {comparisonMetrics.versionScores.map((version, idx) => (
                                  <option key={idx} value={idx}>
                                    {version.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              ({comparisonMetrics.versionScores[differenceVersionB]?.name} - {comparisonMetrics.versionScores[differenceVersionA]?.name})
                            </div>
                          </div>
                        ) : comparisonMetrics && comparisonMetrics.versionScores && comparisonMetrics.versionScores.length === 2 && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            ({comparisonMetrics.versionScores[1]?.name} - {comparisonMetrics.versionScores[0]?.name})
                          </div>
                        )}
                      </div>
                    </th>
                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-600/50">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                        <span>Best Performer</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {comparisonMetrics.metrics.map((metric, metricIdx) => (
                    <tr key={metricIdx} className="hover:bg-slate-800/40 transition-all duration-200 group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-gradient-to-b from-indigo-500/50 to-purple-500/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                            {metric.name}
                          </span>
                        </div>
                      </td>
                      {metric.scores.map((score, scoreIdx) => {
                        const percentage = (score.value / 5.0) * 100;
                        const colors = [
                          { from: 'from-blue-500', to: 'to-cyan-400' },
                          { from: 'from-purple-500', to: 'to-pink-400' },
                          { from: 'from-teal-500', to: 'to-green-400' },
                          { from: 'from-orange-500', to: 'to-red-400' },
                        ];
                        const color = colors[scoreIdx % colors.length];
                        return (
                          <td key={scoreIdx} className="px-8 py-5 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="flex items-center justify-center">
                                <span className="text-lg font-bold text-white tracking-tight">
                                  {score.value.toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-400 ml-1">/5</span>
                              </div>
                              <div className="w-24 h-2 bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
                                <div 
                                  className={`h-full rounded-full bg-gradient-to-r ${color.from} ${color.to} shadow-lg transition-all duration-500`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                {percentage.toFixed(0)}%
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-8 py-5 text-center">
                        {metric.scores.length > 1 && comparisonMetrics && comparisonMetrics.versionScores && (() => {
                          // Calculate difference based on selected versions
                          let difference;
                          if (comparisonMetrics.versionScores.length > 2) {
                            // For 3+ versions, use selected versions
                            const scoreA = metric.scores[differenceVersionA]?.value || 0;
                            const scoreB = metric.scores[differenceVersionB]?.value || 0;
                            difference = scoreB - scoreA;
                          } else {
                            // For 2 versions, use the existing difference calculation
                            difference = metric.scores[1].difference;
                          }
                          
                          return (
                            <div className="flex items-center justify-center">
                              {difference > 0 ? (
                                <span className="text-base font-bold text-slate-100 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                  +{difference.toFixed(2)}
                                </span>
                              ) : difference < 0 ? (
                                <span className="text-base font-bold text-slate-100 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                  {difference.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-500 bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-700/30">0.00</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-8 py-5 text-center">
                        {metric.scores.filter(s => s.isWinner).length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 px-4 py-2 rounded-lg border border-green-500/40 font-semibold shadow-lg shadow-green-500/10 backdrop-blur-sm">
                            {metric.scores.filter(s => s.isWinner).map(s => 
                              comparisonMetrics.versionScores[s.projectIndex].name
                            ).join(', ')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 bg-slate-800/40 px-4 py-2 rounded-lg border border-slate-700/30">Tie</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Performance Trend Chart */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FiTrendingUp className="text-indigo-400" />
                Performance Trend
              </h3>
              <div className="text-sm text-slate-400">
                Score Range: 0 - 5.0
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart 
                data={comparisonMetrics.metrics.map(m => ({
                  metric: m.name,
                  ...comparisonMetrics.versionScores.reduce((acc, version, idx) => {
                    acc[version.name] = m.scores[idx].value;
                    return acc;
                  }, {})
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <defs>
                  <linearGradient id="lineGradient1" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <linearGradient id="lineGradient2" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  <linearGradient id="lineGradient3" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
                <XAxis 
                  dataKey="metric"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  interval={0}
                />
                <YAxis 
                  tick={{ fill: '#cbd5e1' }}
                  domain={[0, 5]}
                  label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#cbd5e1', style: { fontSize: '14px', fontWeight: 'bold' } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                  }}
                  cursor={{ stroke: '#6366f1', strokeWidth: 1 }}
                />
                <Legend 
                  wrapperStyle={{ color: '#cbd5e1', paddingTop: '20px' }}
                  iconType="line"
                />
                {comparisonMetrics.versionScores.map((version, idx) => {
                  const colors = [
                    { stroke: '#3b82f6', fill: '#3b82f6' }, // Blue
                    { stroke: '#8b5cf6', fill: '#8b5cf6' }, // Purple
                    { stroke: '#14b8a6', fill: '#14b8a6' }, // Teal
                    { stroke: '#f59e0b', fill: '#f59e0b' }, // Orange
                  ];
                  const color = colors[idx % colors.length];
                  return (
                    <Line 
                      key={idx}
                      type="monotone"
                      dataKey={version.name}
                      stroke={color.stroke}
                      strokeWidth={3}
                      dot={{ fill: color.fill, r: 6, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8, fill: color.fill, stroke: '#fff', strokeWidth: 2 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Noise Level Performance Trend Chart */}
          {noiseLevelData && noiseLevelData.length >= 2 && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FiTrendingUp className="text-indigo-400" />
                  Noise Level Performance Trend
                </h3>
                <div className="flex items-center gap-4">
                  {/* Toggle for Overall Average vs Selected Metric */}
                  <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-1">
                    <button
                      onClick={() => {
                        setNoiseLevelViewMode('overall');
                        setSelectedNoiseLevelMetric('');
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                        noiseLevelViewMode === 'overall'
                          ? 'bg-indigo-500 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Overall Average
                    </button>
                    <button
                      onClick={() => setNoiseLevelViewMode('selected')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                        noiseLevelViewMode === 'selected'
                          ? 'bg-indigo-500 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Selected Metric Only
                    </button>
                  </div>
                  {noiseLevelViewMode === 'selected' && comparisonMetrics && comparisonMetrics.metrics && (
                    <select
                      value={selectedNoiseLevelMetric}
                      onChange={(e) => setSelectedNoiseLevelMetric(e.target.value)}
                      className="text-xs bg-slate-700/80 border border-slate-600/50 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select Metric</option>
                      {comparisonMetrics.metrics.map((metric, idx) => (
                        <option key={idx} value={metric.name}>
                          {metric.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="text-sm text-slate-400">
                    Score Range: 1 - 5.0
                  </div>
                </div>
              </div>
              
              {loadingNoiseLevel ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : (() => {
                // Prepare chart data
                const allDbLevels = new Set();
                noiseLevelData.forEach(version => {
                  Object.keys(version.dbLevelAverages).forEach(level => allDbLevels.add(level));
                });
                
                // Sort dB levels numerically
                const sortedDbLevels = Array.from(allDbLevels).sort((a, b) => {
                  const numA = parseInt(a.replace(/[^\d]/g, '')) || 0;
                  const numB = parseInt(b.replace(/[^\d]/g, '')) || 0;
                  return numA - numB;
                });
                
                if (sortedDbLevels.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-400">
                      <p>No dB level data available in Excel files</p>
                    </div>
                  );
                }
                
                // Check if metric is selected when in "Selected Metric Only" mode
                if (noiseLevelViewMode === 'selected' && !selectedNoiseLevelMetric) {
                  return (
                    <div className="text-center py-8 text-slate-400">
                      <p>Please select a metric from the dropdown above to view the noise level performance trend</p>
                    </div>
                  );
                }
                
                // Calculate data points
                const chartData = sortedDbLevels.map(dbLevel => {
                  const dataPoint = { dbLevel };
                  
                  noiseLevelData.forEach((version) => {
                    const versionName = version.versionName;
                    let score = 0;
                    
                    if (noiseLevelViewMode === 'overall') {
                      // Calculate overall average across all metrics
                      const metrics = version.dbLevelAverages[dbLevel] || {};
                      const values = Object.values(metrics).filter(v => !isNaN(v) && v > 0);
                      score = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                    } else if (noiseLevelViewMode === 'selected' && selectedNoiseLevelMetric) {
                      // Use selected metric only
                      score = version.dbLevelAverages[dbLevel]?.[selectedNoiseLevelMetric] || 0;
                    }
                    
                    dataPoint[versionName] = score;
                  });
                  
                  return dataPoint;
                });
                
                // Calculate slopes and warnings
                const slopes = {};
                const warnings = [];
                
                noiseLevelData.forEach((version) => {
                  const versionName = version.versionName;
                  if (chartData.length >= 2) {
                    const firstScore = chartData[0][versionName] || 0;
                    const lastScore = chartData[chartData.length - 1][versionName] || 0;
                    const slope = (lastScore - firstScore) / chartData.length;
                    slopes[versionName] = slope;
                    
                    const drop = firstScore - lastScore;
                    if (drop > 0.5) {
                      warnings.push({ version: versionName, drop: drop.toFixed(2) });
                    }
                  }
                });
                
                return (
                  <>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart 
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                      >
                        <defs>
                          <linearGradient id="noiseLineGradient1" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                          <linearGradient id="noiseLineGradient2" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
                        <XAxis 
                          dataKey="dbLevel"
                          tick={{ fill: '#cbd5e1', fontSize: 11 }}
                          label={{ value: 'dB/SNR Level', position: 'insideBottom', offset: -5, fill: '#cbd5e1', style: { fontSize: '14px', fontWeight: 'bold' } }}
                        />
                        <YAxis 
                          tick={{ fill: '#cbd5e1' }}
                          domain={[1, 5]}
                          label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#cbd5e1', style: { fontSize: '14px', fontWeight: 'bold' } }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #475569',
                            color: '#cbd5e1',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                          }}
                          formatter={(value, name, props) => {
                            const dbLevel = props.payload.dbLevel;
                            const currentDataPoint = chartData.find(d => d.dbLevel === dbLevel);
                            const otherVersion = noiseLevelData.find(v => v.versionName !== name);
                            const otherValue = otherVersion && currentDataPoint ? currentDataPoint[otherVersion.versionName] : null;
                            const difference = otherValue !== null && otherValue !== undefined ? (value - otherValue).toFixed(2) : null;
                            return [
                              <div key={name}>
                                <div className="font-semibold">{value.toFixed(2)}</div>
                                {difference !== null && (
                                  <div className="text-xs mt-1">
                                    Difference: {difference > 0 ? '+' : ''}{difference}
                                  </div>
                                )}
                              </div>,
                              name
                            ];
                          }}
                          labelFormatter={(label) => `dB Level: ${label}`}
                          cursor={{ stroke: '#6366f1', strokeWidth: 1 }}
                        />
                        <Legend 
                          wrapperStyle={{ color: '#cbd5e1', paddingTop: '20px' }}
                          iconType="line"
                        />
                        {noiseLevelData.map((version, idx) => {
                          const colors = [
                            { stroke: '#3b82f6', fill: '#3b82f6' }, // Blue
                            { stroke: '#8b5cf6', fill: '#8b5cf6' }, // Purple
                            { stroke: '#14b8a6', fill: '#14b8a6' }, // Teal
                            { stroke: '#f59e0b', fill: '#f59e0b' }, // Orange
                          ];
                          const color = colors[idx % colors.length];
                          
                          return (
                            <Line 
                              key={idx}
                              type="monotone"
                              dataKey={version.versionName}
                              stroke={color.stroke}
                              strokeWidth={3}
                              dot={{ fill: color.fill, r: 6, strokeWidth: 2, stroke: '#fff' }}
                              activeDot={{ r: 8, fill: color.fill, stroke: '#fff', strokeWidth: 2 }}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                    
                    {/* Warning for sharp drops */}
                    {warnings.length > 0 && (
                      <div className="mt-4 flex items-center gap-2 text-yellow-400 text-sm">
                        <FiAlertTriangle />
                        <span>Performance degradation detected: {warnings.map(w => `${w.version} (-${w.drop})`).join(', ')}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
      
      {/* Comparison Results - Show Average Metrics Comparison for Subjective or when dashboard not available */}
      {comparisonData && averageMetrics && (!selectedVersions.every(v => (v.sqaType || 'subjective') === 'objective') || !comparisonMetrics) && (
        <div className="mt-6">
          {/* Average Metrics Comparison Graph */}
          <div className="mt-6 bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Average Metrics Comparison
            </h3>
            <div className="mb-4 flex items-center justify-center gap-4 text-xs flex-wrap">
              {comparisonData.versions.map((version, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`w-4 h-4 ${versionColors[index % versionColors.length].bg} rounded`}></div>
                  <span>{version.versionNumber}</span>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-full" style={{ minHeight: '300px' }}>
                <div className="relative" style={{ height: '300px', padding: '25px 0 60px 80px' }}>
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 w-16" style={{ height: '240px' }}>
                    {[0, 1.0, 2.0, 3.0, 4.0, 5.0].map((value, idx) => {
                      const xAxisPosition = 240;
                      const barsStart = 25;
                      const chartHeight = xAxisPosition - barsStart;
                      const position = xAxisPosition - (value / 5) * chartHeight;
                      
                      if (value === 0) {
                        return (
                          <div
                            key={idx}
                            className="absolute text-xs text-slate-600 font-medium"
                            style={{ top: `${xAxisPosition}px`, transform: 'translateY(0)' }}
                          >
                            {value.toFixed(1)}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={idx}
                          className="absolute text-xs text-slate-600 font-medium"
                          style={{ top: `${position}px`, transform: 'translateY(-50%)' }}
                        >
                          {value.toFixed(1)}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Bars container */}
                  <div className="flex items-end justify-around gap-4" style={{ paddingLeft: '16px', paddingRight: '16px', height: '240px', position: 'absolute', bottom: '60px', left: '64px', right: '0' }}>
                    {averageMetrics.metrics && Array.isArray(averageMetrics.metrics) && averageMetrics.metrics.length > 0 ? (
                      averageMetrics.metrics.map((metric, idx) => {
                        const maxScore = 5;
                        const containerHeight = 240;
                        const barWidth = 60;
                        const numVersions = comparisonData.versions.length;
                        const barGroupWidth = Math.max(60, numVersions * 8);
                        
                        return (
                          <div
                            key={idx}
                            className="flex flex-col items-center"
                            style={{ width: `${barGroupWidth}px` }}
                          >
                            <div className="flex items-end gap-1 w-full relative" style={{ height: `${containerHeight}px` }}>
                              {/* Value labels above bars */}
                              {metric.averages.map((avg, avgIdx) => {
                                if (avg.value == null || typeof avg.value !== 'number') return null;
                                const height = (avg.value / maxScore) * containerHeight;
                                return (
                                  <div
                                    key={avgIdx}
                                    className={`absolute text-xs font-semibold whitespace-nowrap z-10 ${versionColors[avgIdx % versionColors.length].text}`}
                                    style={{
                                      bottom: `${height + 6}px`,
                                      left: `${(avgIdx / numVersions) * 100}%`,
                                      transform: 'translateX(-50%)'
                                    }}
                                  >
                                    {avg.value.toFixed(2)}
                                  </div>
                                );
                              })}
                              
                              {/* Bars */}
                              {metric.averages.map((avg, avgIdx) => {
                                if (avg.value == null || typeof avg.value !== 'number') return null;
                                const height = (avg.value / maxScore) * containerHeight;
                                const version = comparisonData.versions[avgIdx];
                                const color = versionColors[avgIdx % versionColors.length];
                                return (
                                  <div
                                    key={avgIdx}
                                    className={`${color.bg} ${color.hover} rounded-t transition-colors cursor-pointer relative group`}
                                    style={{
                                      width: `${100 / numVersions - 2}%`,
                                      height: `${height}px`,
                                      minHeight: '2px'
                                    }}
                                    title={`${metric.name} - ${version.versionNumber}: ${avg.value.toFixed(2)}`}
                                  >
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="w-full text-center text-slate-500 text-sm py-10">
                        {averageMetrics.metrics && averageMetrics.metrics.length === 0 
                          ? 'No metrics data available. Please ensure all versions have Excel files uploaded.' 
                          : 'Loading metrics...'}
                      </div>
                    )}
                  </div>
                  
                  {/* X-axis line */}
                  <div className="absolute left-16 right-0 border-t-2 border-slate-300" style={{ bottom: '60px' }}></div>
                  
                  {/* Metric labels below x-axis */}
                  <div className="absolute left-16 right-0 flex items-start justify-around gap-4" style={{ bottom: '0px', paddingTop: '8px' }}>
                    {averageMetrics.metrics && Array.isArray(averageMetrics.metrics) && averageMetrics.metrics.length > 0 ? (
                      averageMetrics.metrics.map((metric, idx) => {
                        const numVersions = comparisonData.versions.length;
                        const barGroupWidth = Math.max(60, numVersions * 8);
                        return (
                          <div
                            key={idx}
                            className="text-xs text-slate-700 font-medium text-center"
                            style={{ fontSize: '10px', width: `${barGroupWidth}px` }}
                          >
                            {metric.name}
                          </div>
                        );
                      })
                    ) : null}
                  </div>
                  
                  {/* Y-axis line */}
                  <div className="absolute left-16 w-0.5 bg-slate-300" style={{ top: '25px', bottom: '60px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionComparison;
