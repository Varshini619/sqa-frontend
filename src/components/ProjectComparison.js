import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FiX, FiPlus, FiTrash2, FiTrendingUp, FiTrendingDown, FiMinus, FiAward, FiTarget, FiBarChart2, FiArrowRight } from 'react-icons/fi';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import { API_BASE_URL } from '../config';

const ProjectComparison = () => {
  const [showComparison, setShowComparison] = useState(false);
  const [projects, setProjects] = useState([]);
  
  // Multiple project selections - array of { projectId, versionId, resultId, projectName, versionNumber, allVersions, allResults, sqaType }
  // allVersions: true if "All" versions selected, allResults: true if "All" results selected
  // sqaType: 'subjective' or 'objective'
  const [selectedProjects, setSelectedProjects] = useState([]);
  
  // Store versions and results for each project
  const [projectVersions, setProjectVersions] = useState({}); // { projectId: [versions] }
  const [versionResults, setVersionResults] = useState({}); // { versionId: [results] }
  
  // Dynamic metrics list - will be fetched from Excel files
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  
  // Comparison result
  const [comparisonData, setComparisonData] = useState(null);
  const [, setAverageMetrics] = useState(null);
  const [loadingAverages, setLoadingAverages] = useState(false);
  
  // Dashboard data for objective SQA
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Color palette for multiple projects
  const projectColors = [
    { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-blue-600', hex: '#3b82f6' },
    { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-green-600', hex: '#10b981' },
    { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', text: 'text-purple-600', hex: '#8b5cf6' },
    { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-orange-600', hex: '#f59e0b' },
    { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-red-600', hex: '#ef4444' },
    { bg: 'bg-teal-500', hover: 'hover:bg-teal-600', text: 'text-teal-600', hex: '#14b8a6' },
    { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', text: 'text-pink-600', hex: '#ec4899' },
    { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', text: 'text-yellow-600', hex: '#eab308' },
  ];

  useEffect(() => {
    if (showComparison) {
      fetchProjects();
      // Initialize with two empty project selections
      if (selectedProjects.length === 0) {
        setSelectedProjects([
          { projectId: '', versionId: '', resultId: '', projectName: '', versionNumber: '', allVersions: false, allResults: false, sqaType: 'subjective' },
          { projectId: '', versionId: '', resultId: '', projectName: '', versionNumber: '', allVersions: false, allResults: false, sqaType: 'subjective' }
        ]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComparison]);

  // Fetch versions when a project is selected
  useEffect(() => {
    selectedProjects.forEach((selection) => {
      if (selection.projectId && !projectVersions[selection.projectId]) {
        fetchProjectVersions(selection.projectId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjects]);

  // Fetch results when a version is selected or SQA type changes
  useEffect(() => {
    selectedProjects.forEach((selection) => {
      if (selection.versionId) {
        const sqaType = selection.sqaType || 'subjective';
        const resultKey = `${selection.versionId}_${sqaType}`;
        if (!versionResults[resultKey] || (Array.isArray(versionResults[resultKey]) && versionResults[resultKey].length === 0)) {
          console.log(`[ProjectComparison] Fetching ${sqaType} results for versionId: ${selection.versionId}`);
          fetchVersionResults(selection.versionId, sqaType);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjects]);

  // Update versionNumber when projectVersions are loaded
  useEffect(() => {
    selectedProjects.forEach((selection, index) => {
      if (selection.versionId && !selection.versionNumber && !selection.allVersions) {
        const versions = projectVersions[selection.projectId] || [];
        const version = versions.find(v => v.id === selection.versionId);
        if (version) {
          updateProjectSelection(index, { versionNumber: version.versionNumber });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectVersions]);

  // Fetch available metrics when at least 2 results are selected (including "All" selections)
  useEffect(() => {
    // Get all potential result IDs from selections
    const allResultIds = [];
    
    selectedProjects.forEach(selection => {
      if (!selection.projectId) return;
      
      const sqaType = selection.sqaType || 'subjective';
      
      if (selection.allVersions) {
        const versions = projectVersions[selection.projectId] || [];
        versions.forEach(version => {
          const resultKey = `${version.id}_${sqaType}`;
          const results = versionResults[resultKey] || [];
          if (selection.allResults) {
            results.forEach(result => allResultIds.push(result._id));
          } else if (selection.resultId) {
            allResultIds.push(selection.resultId);
          }
        });
      } else if (selection.versionId) {
        const resultKey = `${selection.versionId}_${sqaType}`;
        if (selection.allResults) {
          const results = versionResults[resultKey] || [];
          results.forEach(result => allResultIds.push(result._id));
        } else if (selection.resultId) {
          allResultIds.push(selection.resultId);
        }
      }
    });
    
    if (allResultIds.length >= 2) {
      fetchAvailableMetrics(allResultIds);
    } else {
      setAvailableMetrics([]);
    }
  }, [selectedProjects, projectVersions, versionResults]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchProjectVersions = async (projectId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/projects/${projectId}`);
      const versionsList = response.data.versions || [];
      setProjectVersions(prev => ({ ...prev, [projectId]: versionsList }));
      
      // Auto-select first version if available
      const selectionIndex = selectedProjects.findIndex(s => s.projectId === projectId);
      if (selectionIndex !== -1 && !selectedProjects[selectionIndex].versionId && versionsList.length > 0) {
        updateProjectSelection(selectionIndex, { versionId: versionsList[0].id });
      }
    } catch (error) {
      console.error('Error fetching project versions:', error);
    }
  };

  const fetchVersionResults = async (versionId, sqaType = 'subjective') => {
    if (!versionId) {
      console.log('[ProjectComparison] No versionId provided, skipping fetch');
      return;
    }
    
    try {
      console.log(`[ProjectComparison] Fetching ${sqaType} results for versionId: ${versionId}`);
      
      // Use the correct endpoint based on SQA type
      let response;
      if (sqaType === 'objective') {
        response = await axios.get(`${API_BASE_URL}/api/objective/${versionId}`);
      } else {
        // subjective or default
        response = await axios.get(`${API_BASE_URL}/api/subjective/${versionId}`);
      }
      
      const resultKey = `${versionId}_${sqaType}`;
      const results = response.data || [];
      
      console.log(`[ProjectComparison] Fetched ${results.length} ${sqaType} results for version ${versionId}`);
      console.log(`[ProjectComparison] Results:`, results.map(r => ({ id: r._id, name: r.name })));
      
      setVersionResults(prev => ({ ...prev, [resultKey]: results }));
      
      // Auto-select first result if available
      const selectionIndex = selectedProjects.findIndex(s => s.versionId === versionId && (s.sqaType || 'subjective') === sqaType);
      if (selectionIndex !== -1 && !selectedProjects[selectionIndex].resultId && results.length > 0) {
        updateProjectSelection(selectionIndex, { resultId: results[0]._id });
      }
    } catch (error) {
      console.error(`[ProjectComparison] Error fetching ${sqaType} version results:`, error);
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
      
      // Helper function to normalize metric names for comparison
      const normalizeMetric = (metric) => metric.toLowerCase().trim().replace(/\s+/g, ' ');
      
      // Helper function to check if two metrics match (flexible matching)
      const metricsMatch = (metric1, metric2) => {
        const norm1 = normalizeMetric(metric1);
        const norm2 = normalizeMetric(metric2);
        
        // Exact match
        if (norm1 === norm2) return true;
        
        // One contains the other
        if (norm1.includes(norm2) || norm2.includes(norm1)) {
          const minLen = Math.min(norm1.length, norm2.length);
          if (minLen >= 3) return true;
        }
        
        // Special handling for specific metrics
        if (norm1.includes('comprehensibility') && norm2.includes('comprehensibility')) return true;
        if (norm1.includes('quality') && norm2.includes('quality')) return true;
        if (norm1.includes('noise') && norm1.includes('suppression') &&
            norm2.includes('noise') && norm2.includes('suppression')) return true;
        if ((norm1.includes('chops') || norm1.includes('chop')) &&
            (norm2.includes('chops') || norm2.includes('chop'))) return true;
        
        return false;
      };
      
      // Check if other results have the same metrics (using flexible matching)
      if (resultIds.length > 2) {
        for (let i = 2; i < resultIds.length; i++) {
          const checkResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/common-metrics`, {
            resultIdA: resultIds[0],
            resultIdB: resultIds[i]
          });
          const otherMetrics = checkResponse.data.metrics || [];
          
          // Filter using flexible matching instead of simple includes
          commonMetrics = commonMetrics.filter(metric => {
            return otherMetrics.some(otherMetric => metricsMatch(metric, otherMetric));
          });
        }
      }
      
      setAvailableMetrics(commonMetrics);
    } catch (error) {
      console.error('Error fetching available metrics:', error);
      setAvailableMetrics([]);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const addProjectSelection = () => {
    const newSelection = {
      projectId: '',
      versionId: '',
      resultId: '',
      projectName: '',
      versionNumber: '',
      allVersions: false,
      allResults: false,
      sqaType: 'subjective'
    };
    setSelectedProjects([...selectedProjects, newSelection]);
  };

  const removeProjectSelection = (index) => {
    const updated = selectedProjects.filter((_, i) => i !== index);
    setSelectedProjects(updated);
    
    // Clean up unused versions and results
    const removed = selectedProjects[index];
    if (removed.projectId && updated.every(s => s.projectId !== removed.projectId)) {
      setProjectVersions(prev => {
        const newVersions = { ...prev };
        delete newVersions[removed.projectId];
        return newVersions;
      });
    }
    if (removed.versionId && updated.every(s => s.versionId !== removed.versionId)) {
      setVersionResults(prev => {
        const newResults = { ...prev };
        delete newResults[removed.versionId];
        return newResults;
      });
    }
  };

  const updateProjectSelection = (index, updates) => {
    setSelectedProjects(prev => prev.map((selection, i) => {
      if (i === index) {
        const updated = { ...selection, ...updates };
        
        // Update project name when project changes
        if (updates.projectId !== undefined) {
          const project = projects.find(p => p._id === updates.projectId);
          updated.projectName = project?.name || '';
          // Reset version and result when project changes
          if (updates.projectId !== selection.projectId) {
            updated.versionId = '';
            updated.resultId = '';
            updated.versionNumber = '';
            updated.allVersions = false;
            updated.allResults = false;
          }
        }
        
        // Update version number when version changes
        if (updates.versionId !== undefined) {
          const versions = projectVersions[updated.projectId] || [];
          const version = versions.find(v => v.id === updates.versionId);
          updated.versionNumber = version?.versionNumber || '';
          // Reset result when version changes
          if (updates.versionId !== selection.versionId) {
            updated.resultId = '';
            updated.allResults = false;
          }
        }
        
        // Reset result and fetch new results when SQA type changes
        if (updates.sqaType !== undefined && updates.sqaType !== selection.sqaType) {
          console.log(`[ProjectComparison] SQA type changed from ${selection.sqaType} to ${updates.sqaType} for version ${updated.versionId}`);
          updated.resultId = '';
          updated.allResults = false;
          // Clear old results for the previous SQA type
          const oldResultKey = `${updated.versionId}_${selection.sqaType}`;
          setVersionResults(prev => {
            const newResults = { ...prev };
            delete newResults[oldResultKey];
            return newResults;
          });
          // Fetch results for the new SQA type
          if (updated.versionId) {
            fetchVersionResults(updated.versionId, updates.sqaType);
          }
        }
        
        // Ensure allVersions and allResults are set
        if (updates.allVersions !== undefined) {
          updated.allVersions = updates.allVersions;
        }
        if (updates.allResults !== undefined) {
          updated.allResults = updates.allResults;
        }
        
        return updated;
      }
      return selection;
    }));
  };

  const handleCompare = async () => {
    // Expand "All" selections into individual selections
    const expandedSelections = [];
    
    selectedProjects.forEach(selection => {
      if (!selection.projectId) return;
      
      const sqaType = selection.sqaType || 'subjective';
      
      if (selection.allVersions) {
        // When "All" versions is selected, we need to calculate averages across all versions
        // Group results by project and SQA type, then calculate averages
        const versions = projectVersions[selection.projectId] || [];
        const allResultsForProject = [];
        
        versions.forEach(version => {
          const resultKey = `${version.id}_${sqaType}`;
          const results = versionResults[resultKey] || [];
          
          if (selection.allResults) {
            // Use all results for each version
            results.forEach(result => {
              allResultsForProject.push({
                projectId: selection.projectId,
                projectName: selection.projectName,
                versionId: version.id,
                versionNumber: version.versionNumber,
                resultId: result._id,
                resultName: result.name,
                sqaType: sqaType
              });
            });
          } else if (selection.resultId) {
            // Use selected result - check if it exists in this version
            const result = results.find(r => r._id === selection.resultId);
            if (result) {
              allResultsForProject.push({
                projectId: selection.projectId,
                projectName: selection.projectName,
                versionId: version.id,
                versionNumber: version.versionNumber,
                resultId: selection.resultId,
                resultName: result.name,
                sqaType: sqaType
              });
            }
          }
        });
        
        // If we have multiple versions, create a single aggregated selection
        // Otherwise, add individual selections
        if (allResultsForProject.length > 0) {
          if (allResultsForProject.length === 1) {
            expandedSelections.push(allResultsForProject[0]);
          } else {
            // Group by project and create aggregated selection
            expandedSelections.push({
              projectId: selection.projectId,
              projectName: selection.projectName,
              versionId: 'all', // Special marker for "all versions"
              versionNumber: 'All',
              resultId: selection.allResults ? 'all' : selection.resultId,
              resultName: selection.allResults ? 'All Results' : (versionResults[`${versions[0].id}_${sqaType}`]?.find(r => r._id === selection.resultId)?.name || ''),
              sqaType: sqaType,
              allVersionsResults: allResultsForProject // Store all results for averaging
            });
          }
        }
      } else if (selection.versionId) {
        const resultKey = `${selection.versionId}_${sqaType}`;
        if (selection.allResults) {
          // Expand all results for selected version
          const results = versionResults[resultKey] || [];
          results.forEach(result => {
            expandedSelections.push({
              projectId: selection.projectId,
              projectName: selection.projectName,
              versionId: selection.versionId,
              versionNumber: selection.versionNumber,
              resultId: result._id,
              resultName: result.name,
              sqaType: sqaType
            });
          });
        } else if (selection.resultId) {
          // Single selection
          expandedSelections.push({
            projectId: selection.projectId,
            projectName: selection.projectName,
            versionId: selection.versionId,
            versionNumber: selection.versionNumber,
            resultId: selection.resultId,
            resultName: versionResults[resultKey]?.find(r => r._id === selection.resultId)?.name || '',
            sqaType: sqaType
          });
        }
      }
    });
    
    if (expandedSelections.length < 2) {
      alert('Please select at least 2 projects with versions and results (or use "All" options)');
      return;
    }

    // Check if all selections are objective type
    const allObjective = expandedSelections.every(s => s.sqaType === 'objective');
    const allSubjective = expandedSelections.every(s => s.sqaType === 'subjective');

    setLoadingAverages(true);
    setLoadingDashboard(true);
    try {
      // Handle "All" versions case - calculate averages
      const selectionsWithAverages = [];
      
      for (const selection of expandedSelections) {
        if (selection.allVersionsResults && selection.allVersionsResults.length > 1) {
          // Calculate average across all versions for this project
          const resultIds = selection.allVersionsResults.map(r => r.resultId);
          
          // For objective, we need to fetch Excel data and calculate averages
          if (selection.sqaType === 'objective') {
            // Fetch dashboard data for all results and calculate average
            const projectMetrics = {};
            const allMetrics = new Set();
            
            // Get common metrics from first two results
            if (resultIds.length >= 2) {
              try {
                const commonMetricsResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/common-metrics`, {
                  resultIdA: resultIds[0],
                  resultIdB: resultIds[1]
                });
                let commonMetrics = commonMetricsResponse.data.metrics || [];
                
                // Check other results to find truly common metrics
                if (resultIds.length > 2) {
                  for (let i = 2; i < resultIds.length; i++) {
                    const checkResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/common-metrics`, {
                      resultIdA: resultIds[0],
                      resultIdB: resultIds[i]
                    });
                    const otherMetrics = checkResponse.data.metrics || [];
                    
                    // Filter to keep only metrics that exist in all results
                    commonMetrics = commonMetrics.filter(metric => {
                      return otherMetrics.some(otherMetric => {
                        const normalizeMetric = (m) => m.toLowerCase().trim().replace(/\s+/g, ' ');
                        const norm1 = normalizeMetric(metric);
                        const norm2 = normalizeMetric(otherMetric);
                        return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
                      });
                    });
                  }
                }
                
                // Calculate average for each metric across all results
                for (const metricName of commonMetrics) {
                  const metricValues = [];
                  
                  for (const resultId of resultIds) {
                    try {
                      // Compare with first result to get average
                      const avgResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/average-metrics`, {
                        resultIdA: resultIds[0],
                        resultIdB: resultId,
                        metricName: metricName
                      });
                      
                      if (avgResponse.data && avgResponse.data.metrics && avgResponse.data.metrics.length > 0) {
                        const metric = avgResponse.data.metrics[0];
                        const avgValue = resultId === resultIds[0] ? metric.avgA : metric.avgB;
                        if (avgValue !== null && avgValue !== undefined && !isNaN(avgValue) && isFinite(avgValue)) {
                          metricValues.push(avgValue);
                        }
                      }
                    } catch (error) {
                      console.error(`Error fetching ${metricName} for result ${resultId}:`, error);
                    }
                  }
                  
                  if (metricValues.length > 0) {
                    const avg = metricValues.reduce((a, b) => a + b, 0) / metricValues.length;
                    projectMetrics[metricName] = Number(avg.toFixed(2));
                    allMetrics.add(metricName);
                  }
                }
                
                if (Object.keys(projectMetrics).length > 0) {
                  selectionsWithAverages.push({
                    ...selection,
                    averagedMetrics: projectMetrics,
                    averagedMetricsList: Array.from(allMetrics),
                    isAveraged: true
                  });
                } else {
                  // Fallback: use first result
                  selectionsWithAverages.push(selection.allVersionsResults[0]);
                }
              } catch (error) {
                console.error('Error calculating averages for all versions:', error);
                // Fallback: use first result
                selectionsWithAverages.push(selection.allVersionsResults[0]);
              }
            } else {
              selectionsWithAverages.push(selection.allVersionsResults[0]);
            }
          } else {
            // For subjective, check if results have Excel files for comparison
            // If they do, we can calculate averages similar to objective
            const hasExcelFiles = resultIds.some(id => {
              // Check if any result has an Excel file (we'll verify this when fetching)
              return true; // Assume they might have Excel files
            });
            
            if (hasExcelFiles && resultIds.length >= 2) {
              try {
                // Try to get common metrics from Excel files if available
                const commonMetricsResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/common-metrics`, {
                  resultIdA: resultIds[0],
                  resultIdB: resultIds[1]
                });
                const commonMetrics = commonMetricsResponse.data.metrics || [];
                
                if (commonMetrics.length > 0) {
                  // Subjective results have Excel files with metrics - calculate averages
                  const projectMetrics = {};
                  const allMetrics = new Set();
                  
                  for (const metricName of commonMetrics) {
                    const metricValues = [];
                    
                    for (const resultId of resultIds) {
                      try {
                        const avgResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/average-metrics`, {
                          resultIdA: resultIds[0],
                          resultIdB: resultId,
                          metricName: metricName
                        });
                        
                        if (avgResponse.data && avgResponse.data.metrics && avgResponse.data.metrics.length > 0) {
                          const metric = avgResponse.data.metrics[0];
                          const avgValue = resultId === resultIds[0] ? metric.avgA : metric.avgB;
                          if (avgValue !== null && avgValue !== undefined && !isNaN(avgValue) && isFinite(avgValue)) {
                            metricValues.push(avgValue);
                          }
                        }
                      } catch (error) {
                        console.error(`[Subjective] Error fetching ${metricName} for result ${resultId}:`, error);
                      }
                    }
                    
                    if (metricValues.length > 0) {
                      const avg = metricValues.reduce((a, b) => a + b, 0) / metricValues.length;
                      projectMetrics[metricName] = Number(avg.toFixed(2));
                      allMetrics.add(metricName);
                    }
                  }
                  
                  if (Object.keys(projectMetrics).length > 0) {
                    selectionsWithAverages.push({
                      ...selection,
                      averagedMetrics: projectMetrics,
                      averagedMetricsList: Array.from(allMetrics),
                      isAveraged: true
                    });
                  } else {
                    selectionsWithAverages.push(selection.allVersionsResults[0]);
                  }
                } else {
                  // No Excel files or no common metrics - use first result
                  selectionsWithAverages.push(selection.allVersionsResults[0]);
                }
              } catch (error) {
                console.error('[Subjective] Error calculating averages for all versions:', error);
                // Fallback: use first result
                selectionsWithAverages.push(selection.allVersionsResults[0]);
              }
            } else {
              // No Excel files available - use first result
              selectionsWithAverages.push(selection.allVersionsResults[0]);
            }
          }
        } else {
          selectionsWithAverages.push(selection);
        }
      }
      
      const resultIds = selectionsWithAverages.map(s => s.resultId).filter(id => id !== 'all');
      
      if (resultIds.length >= 2) {
      await fetchAllAverageMetrics(resultIds);
      }
      
      // Set comparison data
      setComparisonData({
        projects: selectionsWithAverages.map(s => ({
          name: s.projectName,
          versionNumber: s.versionNumber,
          resultId: s.resultId,
          resultName: s.resultName,
          sqaType: s.sqaType || 'subjective',
          averagedMetrics: s.averagedMetrics,
          averagedMetricsList: s.averagedMetricsList
        }))
      });
      
      // Fetch dashboard data for objective or subjective (if they have Excel files)
      if (allObjective) {
        await fetchDashboardData(selectionsWithAverages);
      } else if (allSubjective) {
        // For subjective, always try to fetch dashboard data
        // fetchDashboardData will check if Excel files exist and handle accordingly
        console.log('[handleCompare] Fetching dashboard data for subjective results');
        await fetchDashboardData(selectionsWithAverages);
      } else {
        setDashboardData(null);
      }
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data?.details;
      
      let fullMessage = `Failed to fetch metrics: ${errorMessage}`;
      if (errorDetails) {
        fullMessage += `\n\nDetails:\n`;
        if (errorDetails.resultIdA) {
          fullMessage += `Result A ID: ${errorDetails.resultIdA} (Found: ${errorDetails.resultAFound ? 'Yes' : 'No'})\n`;
        }
        if (errorDetails.resultIdB) {
          fullMessage += `Result B ID: ${errorDetails.resultIdB} (Found: ${errorDetails.resultBFound ? 'Yes' : 'No'})\n`;
        }
      }
      
      console.error('Full error details:', error.response?.data);
      alert(fullMessage);
    } finally {
      setLoadingAverages(false);
      setLoadingDashboard(false);
    }
  };
  
  // Fetch dashboard data for objective SQA comparison
  const fetchDashboardData = async (expandedSelections) => {
    try {
      console.log('[fetchDashboardData] Starting with selections:', expandedSelections);
      const dashboardResults = [];
      
      // Check if any selection has averaged metrics (from "All" versions)
      const hasAveragedMetrics = expandedSelections.some(s => s.averagedMetrics && s.averagedMetricsList);
      console.log('[fetchDashboardData] Has averaged metrics:', hasAveragedMetrics);
      
      if (hasAveragedMetrics) {
        // Use averaged metrics if available
        for (const selection of expandedSelections) {
          if (selection.averagedMetrics && selection.averagedMetricsList) {
            dashboardResults.push({
              projectName: selection.projectName,
              versionNumber: selection.versionNumber,
              resultName: selection.resultName || 'All Versions Average',
              metrics: selection.averagedMetrics,
              allMetrics: selection.averagedMetricsList
            });
          } else {
            // For non-averaged selections, fetch from API
            const baselineResultId = expandedSelections.find(s => s.averagedMetrics)?.resultId || expandedSelections[0].resultId;
            const projectMetrics = {};
            const projectMetricsList = [];
            
            // Get common metrics
            const commonMetricsResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/common-metrics`, {
              resultIdA: baselineResultId,
              resultIdB: selection.resultId
            });
            const commonMetrics = commonMetricsResponse.data.metrics || [];
            
            for (const metricName of commonMetrics) {
              try {
                const avgResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/average-metrics`, {
                  resultIdA: baselineResultId,
                  resultIdB: selection.resultId,
                  metricName: metricName
                });
                
                if (avgResponse.data && avgResponse.data.metrics && avgResponse.data.metrics.length > 0) {
                  const metric = avgResponse.data.metrics[0];
                  const avgValue = selection.resultId === baselineResultId ? metric.avgA : metric.avgB;
                  projectMetrics[metricName] = avgValue || 0;
                  projectMetricsList.push(metricName);
                }
              } catch (error) {
                console.error(`Error fetching ${metricName} for ${selection.projectName}:`, error);
              }
            }
            
            if (projectMetricsList.length > 0) {
              dashboardResults.push({
                projectName: selection.projectName,
                versionNumber: selection.versionNumber,
                resultName: selection.resultName,
                metrics: projectMetrics,
                allMetrics: projectMetricsList
              });
            }
          }
        }
      } else {
        // Original logic: fetch from API for all selections
        if (expandedSelections.length > 1) {
          // Validate result IDs before making API call
          const resultIdA = expandedSelections[0].resultId;
          const resultIdB = expandedSelections[1].resultId;
          
          console.log(`[fetchDashboardData] Comparing results:`);
          console.log(`[fetchDashboardData]   Result A: ${resultIdA} (${expandedSelections[0].projectName} - ${expandedSelections[0].versionNumber} - ${expandedSelections[0].sqaType})`);
          console.log(`[fetchDashboardData]   Result B: ${resultIdB} (${expandedSelections[1].projectName} - ${expandedSelections[1].versionNumber} - ${expandedSelections[1].sqaType})`);
          
          if (!resultIdA || !resultIdB || resultIdA === 'all' || resultIdB === 'all') {
            console.error('[fetchDashboardData] Invalid result IDs');
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
            console.log(`[fetchDashboardData] Found ${commonMetrics.length} common metrics:`, commonMetrics);
          } catch (error) {
            console.error('[fetchDashboardData] Error fetching common metrics:', error);
            setDashboardData(null);
            return;
          }
          
          if (commonMetrics.length === 0) {
            console.warn('[fetchDashboardData] No common metrics found');
            setDashboardData(null);
            return;
          }
          
          // For each project, calculate averages for common metrics
          for (let i = 0; i < expandedSelections.length; i++) {
            const sel = expandedSelections[i];
            const projectMetrics = {};
            const projectMetricsList = [];
            
            // Use first result as baseline for comparison
            const baselineResultId = expandedSelections[0].resultId;
            
            console.log(`[fetchDashboardData] Processing project ${i + 1}: ${sel.projectName} (resultId: ${sel.resultId})`);
            
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
                  // Use avgA for baseline (first project), avgB for others
                  const avgValue = i === 0 ? metric.avgA : metric.avgB;
                  if (avgValue !== null && avgValue !== undefined && !isNaN(avgValue)) {
                    projectMetrics[metricName] = avgValue;
                    projectMetricsList.push(metricName);
                  }
                }
              } catch (error) {
                console.error(`[fetchDashboardData] Error fetching ${metricName} for ${sel.projectName}:`, error);
              }
            }
            
            console.log(`[fetchDashboardData] Project ${sel.projectName}: ${projectMetricsList.length} metrics collected`);
            
            if (projectMetricsList.length > 0) {
              dashboardResults.push({
                projectName: sel.projectName,
                versionNumber: sel.versionNumber,
                resultName: sel.resultName,
                metrics: projectMetrics,
                allMetrics: projectMetricsList
              });
            } else {
              console.warn(`[fetchDashboardData] No metrics collected for ${sel.projectName}`);
            }
          }
        }
      }
      
      console.log(`[fetchDashboardData] Final dashboard results: ${dashboardResults.length} projects`);
      if (dashboardResults.length >= 2) {
        console.log('[fetchDashboardData] Dashboard data loaded successfully:', dashboardResults);
        console.log('[fetchDashboardData] Setting dashboardData with', dashboardResults.length, 'projects');
        setDashboardData(dashboardResults);
      } else {
        console.warn(`[fetchDashboardData] Not enough dashboard results: ${dashboardResults.length} (need at least 2)`);
        console.warn(`[fetchDashboardData] Dashboard results:`, dashboardResults);
        setDashboardData(null);
      }
    } catch (error) {
      console.error('[fetchDashboardData] Error fetching dashboard data:', error);
      console.error('[fetchDashboardData] Error details:', error.response?.data || error.message);
      setDashboardData(null);
    } finally {
      setLoadingDashboard(false);
      console.log('[fetchDashboardData] Finished, loadingDashboard set to false');
    }
  };
  
  // Calculate comparison metrics (differences, winners, etc.)
  const comparisonMetrics = useMemo(() => {
    console.log('[comparisonMetrics] Calculating metrics, dashboardData:', dashboardData);
    if (!dashboardData || dashboardData.length < 2) {
      console.log('[comparisonMetrics] Not enough dashboard data:', dashboardData?.length || 0);
      return null;
    }
    
    // Get common metrics across all projects
    const commonMetrics = dashboardData[0].allMetrics.filter(metric => {
      return dashboardData.every(project => project.allMetrics.includes(metric));
    });
    
    if (commonMetrics.length === 0) return null;
    
    const metrics = [];
    const projectScores = {};
    
    // Initialize project scores
    dashboardData.forEach((project, idx) => {
      projectScores[idx] = {
        name: project.projectName,
        versionNumber: project.versionNumber,
        totalScore: 0,
        metricCount: 0
      };
    });
    
    // Calculate differences for each metric
    commonMetrics.forEach(metric => {
      const scores = dashboardData.map(p => p.metrics[metric] || 0);
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
      
      // Calculate differences (using first project as baseline)
      const differences = scores.map((score, idx) => {
        if (idx === 0) return 0;
        return score - scores[0];
      });
      
      metrics.push({
        name: metric,
        scores: scores.map((score, idx) => ({
          projectIndex: idx,
          value: score,
          isWinner: winners.includes(idx),
          isLoser: losers.includes(idx),
          difference: differences[idx]
        })),
        maxScore,
        minScore,
        avgScore,
        range: maxScore - minScore
      });
      
      // Update project totals
      scores.forEach((score, idx) => {
        projectScores[idx].totalScore += score;
        projectScores[idx].metricCount += 1;
      });
    });
    
    // Calculate overall averages
    Object.keys(projectScores).forEach(idx => {
      if (projectScores[idx].metricCount > 0) {
        projectScores[idx].averageScore = projectScores[idx].totalScore / projectScores[idx].metricCount;
      } else {
        projectScores[idx].averageScore = 0;
      }
    });
    
    // Find overall winner (highest average)
    const overallWinner = Object.values(projectScores).reduce((best, current) => {
      return current.averageScore > best.averageScore ? current : best;
    }, projectScores[0]);
    
    return {
      metrics,
      projectScores: Object.values(projectScores),
      overallWinner,
      commonMetrics
    };
  }, [dashboardData]);

  const fetchAllAverageMetrics = async (resultIds) => {
    try {
      let metricsToUse = availableMetrics;
      
      // Helper function to normalize metric names for comparison
      const normalizeMetric = (metric) => metric.toLowerCase().trim().replace(/\s+/g, ' ');
      
      // Helper function to check if two metrics match (flexible matching)
      const metricsMatch = (metric1, metric2) => {
        const norm1 = normalizeMetric(metric1);
        const norm2 = normalizeMetric(metric2);
        
        // Exact match
        if (norm1 === norm2) return true;
        
        // One contains the other
        if (norm1.includes(norm2) || norm2.includes(norm1)) {
          const minLen = Math.min(norm1.length, norm2.length);
          if (minLen >= 3) return true;
        }
        
        // Special handling for specific metrics
        if (norm1.includes('comprehensibility') && norm2.includes('comprehensibility')) return true;
        if (norm1.includes('quality') && norm2.includes('quality')) return true;
        if (norm1.includes('noise') && norm1.includes('suppression') &&
            norm2.includes('noise') && norm2.includes('suppression')) return true;
        if ((norm1.includes('chops') || norm1.includes('chop')) &&
            (norm2.includes('chops') || norm2.includes('chop'))) return true;
        
        return false;
      };
      
      if (!metricsToUse || metricsToUse.length === 0) {
        // Fetch common metrics from first two results
        const metricsResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/common-metrics`, {
          resultIdA: resultIds[0],
          resultIdB: resultIds[1]
        });
        metricsToUse = metricsResponse.data.metrics || [];
        
        // Check other results using flexible matching
        if (resultIds.length > 2) {
          for (let i = 2; i < resultIds.length; i++) {
            const checkResponse = await axios.post(`${API_BASE_URL}/api/sqa-results/common-metrics`, {
              resultIdA: resultIds[0],
              resultIdB: resultIds[i]
            });
            const otherMetrics = checkResponse.data.metrics || [];
            
            // Filter using flexible matching instead of simple includes
            metricsToUse = metricsToUse.filter(metric => {
              return otherMetrics.some(otherMetric => metricsMatch(metric, otherMetric));
            });
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
      // We'll compare each result with the first one to get averages
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

  if (!showComparison) {
    return (
      <div>
        <button
          data-compare-projects-button
          onClick={() => setShowComparison(true)}
          className="flex items-center gap-2 text-base font-semibold text-white transition-all duration-200"
          style={{ 
            backgroundColor: '#4F46E5',
            borderRadius: '12px',
            padding: '12px 28px',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.2)',
            fontFamily: 'Inter, system-ui, sans-serif',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#4338CA';
            e.target.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#4F46E5';
            e.target.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.2)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          Compare Models
          <FiArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200" style={{ boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.2), 0 2px 4px -1px rgba(30, 58, 138, 0.15)' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Project Comparison</h2>
        <button
          onClick={() => {
            setShowComparison(false);
            setComparisonData(null);
            setSelectedProjects([]);
            setProjectVersions({});
            setVersionResults({});
          }}
          className="text-slate-400 hover:text-slate-600"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* Project Selections */}
      <div className="space-y-4 mb-4">
        {selectedProjects.map((selection, index) => (
          <div key={index} className="border border-slate-200 rounded-lg p-4 bg-white" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Project {index + 1}</h3>
              {selectedProjects.length > 1 && (
                <button
                  onClick={() => removeProjectSelection(index)}
                  className="text-red-500 hover:text-red-700"
                  title="Remove project"
                >
                  <FiTrash2 size={16} />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Project</label>
                <select
                  value={selection.projectId}
                  onChange={(e) => {
                    const projectId = e.target.value;
                    const project = projects.find(p => p._id === projectId);
                    updateProjectSelection(index, { 
                      projectId, 
                      versionId: '', 
                      resultId: '',
                      projectName: project?.name || ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Select Project</option>
                  {projects.filter(p => !selectedProjects.some((s, i) => s.projectId === p._id && i !== index)).map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              {selection.projectId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Version</label>
                  <select
                    value={selection.allVersions ? 'all' : selection.versionId}
                    onChange={(e) => {
                      if (e.target.value === 'all') {
                        updateProjectSelection(index, { 
                          versionId: '', 
                          resultId: '',
                          allVersions: true,
                          allResults: false
                        });
                        // Fetch results for all versions
                        const versions = projectVersions[selection.projectId] || [];
                        versions.forEach(v => {
                          const resultKey = `${v.id}_${selection.sqaType || 'subjective'}`;
                          if (!versionResults[resultKey]) {
                            fetchVersionResults(v.id, selection.sqaType || 'subjective');
                          }
                        });
                      } else {
                        const newVersionId = e.target.value;
                        const sqaType = selection.sqaType || 'subjective';
                        // Clear old results for previous version
                        if (selection.versionId) {
                          const oldResultKey = `${selection.versionId}_${sqaType}`;
                          setVersionResults(prev => {
                            const newResults = { ...prev };
                            delete newResults[oldResultKey];
                            return newResults;
                          });
                        }
                        updateProjectSelection(index, { 
                          versionId: newVersionId, 
                          resultId: '',
                          allVersions: false
                        });
                        // Fetch results for new version
                        if (newVersionId) {
                          fetchVersionResults(newVersionId, sqaType);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="">Select Version</option>
                    <option value="all">All</option>
                    {(projectVersions[selection.projectId] || []).map(v => (
                      <option key={v.id} value={v.id}>{v.versionNumber}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {selection.projectId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select SQA Type</label>
                  <select
                    value={selection.sqaType || 'subjective'}
                    onChange={(e) => {
                      const newSqaType = e.target.value;
                      updateProjectSelection(index, { 
                        sqaType: newSqaType, 
                        resultId: '', 
                        allResults: false 
                      });
                      // Clear existing results for this selection to force refresh
                      if (selection.versionId) {
                        const resultKey = `${selection.versionId}_${selection.sqaType || 'subjective'}`;
                        setVersionResults(prev => {
                          const newResults = { ...prev };
                          delete newResults[resultKey];
                          return newResults;
                        });
                        // Fetch results for selected version with new SQA type
                        fetchVersionResults(selection.versionId, newSqaType);
                      } else if (selection.allVersions) {
                        // Clear and fetch results for all versions with new SQA type
                        const versions = projectVersions[selection.projectId] || [];
                        versions.forEach(v => {
                          const resultKey = `${v.id}_${selection.sqaType || 'subjective'}`;
                          setVersionResults(prev => {
                            const newResults = { ...prev };
                            delete newResults[resultKey];
                            return newResults;
                          });
                          fetchVersionResults(v.id, newSqaType);
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="subjective">Subjective</option>
                    <option value="objective">Objective</option>
                  </select>
                </div>
              )}
              
              {(selection.versionId || selection.allVersions) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Result</label>
                  <select
                    value={selection.allResults ? 'all' : selection.resultId}
                    onChange={(e) => {
                      if (e.target.value === 'all') {
                        updateProjectSelection(index, { 
                          resultId: '',
                          allResults: true
                        });
                      } else {
                        updateProjectSelection(index, { 
                          resultId: e.target.value,
                          allResults: false
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="">Select Result</option>
                    <option value="all">All</option>
                    {(() => {
                      const sqaType = selection.sqaType || 'subjective';
                      console.log(`[ProjectComparison] Rendering dropdown for versionId: ${selection.versionId}, sqaType: ${sqaType}, allVersions: ${selection.allVersions}`);
                      
                      if (selection.allVersions) {
                      // Show all results from all versions when "All" versions is selected
                        const versions = projectVersions[selection.projectId] || [];
                        const allResults = [];
                        versions.forEach(version => {
                          const resultKey = `${version.id}_${sqaType}`;
                          const results = versionResults[resultKey] || [];
                          console.log(`[ProjectComparison] Version ${version.id} (${sqaType}): ${results.length} results`);
                          results.forEach(result => {
                            // Avoid duplicates by checking if result ID already exists
                            if (!allResults.find(r => r._id === result._id)) {
                              allResults.push({
                                ...result,
                                versionNumber: version.versionNumber
                              });
                            }
                          });
                        });
                        console.log(`[ProjectComparison] Total unique results for all versions: ${allResults.length}`);
                        return allResults.map(r => (
                          <option key={r._id} value={r._id}>
                            {r.name} ({r.versionNumber})
                          </option>
                        ));
                      } else {
                      // Show results for specific version
                        const resultKey = `${selection.versionId}_${sqaType}`;
                        const results = versionResults[resultKey] || [];
                        console.log(`[ProjectComparison] Rendering ${results.length} results for ${resultKey}`);
                        return results.map(r => (
                          <option key={r._id} value={r._id}>{r.name || r.finalExcel?.fileName || `Result ${r._id.substring(0, 8)}`}</option>
                        ));
                      }
                    })()}
                  </select>
                </div>
              )}
            </div>
          </div>
        ))}
        
        <button
          onClick={addProjectSelection}
          className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
        >
          <FiPlus size={16} />
          Add Project
        </button>
      </div>

      {/* Metrics Info */}
      <div className="mb-6">
        {availableMetrics.length > 0 && (
          <>
            {loadingMetrics ? (
              <div className="text-sm text-slate-500 py-2">Loading metrics from Excel files...</div>
            ) : (
              <p className="text-sm text-slate-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {availableMetrics.length > 0 
                  ? `Found ${availableMetrics.length} metric${availableMetrics.length !== 1 ? 's' : ''} in all Excel files. Click Compare to view all metrics comparison.`
                  : 'No common metrics found in all Excel files.'}
              </p>
            )}
          </>
        )}
      </div>

      {/* Compare Button */}
      <div className="mb-4">
        <button
          onClick={handleCompare}
          disabled={loadingAverages}
          className="flex items-center gap-2 text-base font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: loadingAverages ? '#64748B' : '#4F46E5',
            borderRadius: '12px',
            padding: '12px 28px',
            boxShadow: loadingAverages ? 'none' : '0 2px 8px rgba(79, 70, 229, 0.2)',
            fontFamily: 'Inter, system-ui, sans-serif',
            border: 'none',
            cursor: loadingAverages ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={(e) => {
            if (!loadingAverages) {
              e.target.style.backgroundColor = '#4338CA';
              e.target.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loadingAverages) {
              e.target.style.backgroundColor = '#4F46E5';
              e.target.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.2)';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          {loadingAverages ? 'Comparing...' : 'Compare'}
          {!loadingAverages && <FiArrowRight size={18} />}
        </button>
      </div>

      {/* Selected Projects Info */}
      {selectedProjects.filter(s => s.projectId).length > 0 && (
        <div className="mt-6 mb-4 p-4 bg-slate-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedProjects.map((selection, index) => {
              if (!selection.projectId) return null;
              // Get version number from projectVersions if not set in selection
              let displayVersionNumber = selection.versionNumber;
              if (!displayVersionNumber && selection.versionId) {
                const versions = projectVersions[selection.projectId] || [];
                const version = versions.find(v => v.id === selection.versionId);
                displayVersionNumber = version?.versionNumber || '';
              }
              // If allVersions is selected, show "All" instead
              if (selection.allVersions) {
                displayVersionNumber = 'All';
              }
              return (
                <div key={index}>
                  <h4 className="text-sm font-semibold text-slate-700">Project {index + 1}</h4>
                  <p className="text-xs text-slate-600">
                    Project: {selection.projectName || 'Not selected'}
                  </p>
                  <p className="text-xs text-slate-600">
                    Version: {displayVersionNumber || 'Not selected'}
                  </p>
                  <p className="text-xs text-slate-600">
                    SQA Type: {selection.sqaType === 'subjective' ? 'Subjective' : 'Objective'}
                  </p>
                  <p className="text-xs text-slate-600">
                    Result: {(() => {
                      const resultKey = `${selection.versionId}_${selection.sqaType || 'subjective'}`;
                      return versionResults[resultKey]?.find(r => r._id === selection.resultId)?.name || (selection.allResults ? 'All' : 'Not selected');
                    })()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* High-Level Dashboard Loading Spinner */}
      {comparisonData && loadingDashboard && (
        <div className="mt-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 p-8 shadow-2xl">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
            <p className="text-slate-300 text-lg font-medium">Loading dashboard data...</p>
            <p className="text-slate-500 text-sm mt-2">Analyzing performance metrics</p>
                </div>
            </div>
      )}
      
      {comparisonData && !loadingDashboard && comparisonMetrics && dashboardData && dashboardData.length >= 2 && (() => {
        // Determine SQA type from selected projects
        const sqaType = selectedProjects.length > 0 && selectedProjects[0].sqaType 
          ? selectedProjects[0].sqaType 
          : (comparisonData.projects.length > 0 && comparisonData.projects[0].sqaType 
            ? comparisonData.projects[0].sqaType 
            : 'objective');
        const isSubjective = sqaType === 'subjective';
        const dashboardTitle = isSubjective 
          ? 'Subjective SQA Performance Dashboard' 
          : 'Objective SQA Performance Dashboard';
        
        return (
        <div className="mt-6 space-y-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 rounded-xl p-8 text-white shadow-2xl border border-indigo-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <FiBarChart2 className="text-indigo-300" />
                  {dashboardTitle}
                </h2>
                <p className="text-indigo-200 text-base">Comprehensive high-level comparison across all metrics</p>
                          </div>
              <div className="text-right">
                <div className="text-sm text-indigo-200 mb-1">Total Metrics Analyzed</div>
                <div className="text-4xl font-bold text-white">{comparisonMetrics.metrics.length}</div>
                        </div>
            </div>
                  </div>
                  
          {/* KPI Cards with Donut Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {comparisonMetrics.projectScores.map((project, idx) => {
              const percentage = (project.averageScore / 5.0) * 100;
              const colors = [
                { gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500', ring: 'ring-blue-500' },
                { gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-500', ring: 'ring-purple-500' },
                { gradient: 'from-teal-500 to-green-500', bg: 'bg-teal-500', ring: 'ring-teal-500' },
                { gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-500', ring: 'ring-orange-500' },
              ];
              const colorScheme = colors[idx % colors.length];
              const isWinner = project.name === comparisonMetrics.overallWinner.name;
              
              const donutData = [
                { name: 'Score', value: percentage, fill: `url(#gradient${idx})` },
                { name: 'Remaining', value: 100 - percentage, fill: '#1e293b' }
              ];
                        
                        return (
                          <div
                            key={idx}
                  className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border-2 ${
                    isWinner 
                      ? 'border-green-400 shadow-lg shadow-green-500/20' 
                      : 'border-slate-700'
                  } shadow-xl hover:shadow-2xl transition-all duration-300`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorScheme.bg}`}></div>
                      <h3 className="text-sm font-semibold text-slate-200 truncate">{project.name}</h3>
                    </div>
                    {isWinner && (
                      <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-lg border border-green-500/30">
                        <FiAward size={14} />
                        <span className="text-xs font-semibold">Winner</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-4">{project.versionNumber}</p>
                  
                  {/* Donut Chart */}
                  <div className="relative mb-4">
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <defs>
                          <linearGradient id={`gradient${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colorScheme.gradient.includes('blue') ? '#3b82f6' : colorScheme.gradient.includes('purple') ? '#8b5cf6' : colorScheme.gradient.includes('teal') ? '#14b8a6' : '#f59e0b'} />
                            <stop offset="100%" stopColor={colorScheme.gradient.includes('blue') ? '#06b6d4' : colorScheme.gradient.includes('purple') ? '#ec4899' : colorScheme.gradient.includes('teal') ? '#10b981' : '#ef4444'} />
                          </linearGradient>
                        </defs>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={50}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{percentage.toFixed(0)}%</div>
                        <div className="text-xs text-slate-400">Score</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {project.averageScore.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400">/ 5.0 Average</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Metrics</div>
                      <div className="text-lg font-semibold text-slate-200">{project.metricCount}</div>
                    </div>
                  </div>
                                  </div>
                                );
                              })}
          </div>
          
          {/* Metrics Comparison Table */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 px-8 py-5 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiTarget className="text-indigo-400" />
                    Metrics Performance Comparison
                  </h3>
                  <p className="text-slate-300 text-sm mt-1">Detailed score analysis for each metric</p>
                </div>
                <div className="flex items-center gap-4">
                  {comparisonMetrics.projectScores.map((project, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        idx === 0 ? 'bg-blue-500' : 
                        idx === 1 ? 'bg-purple-500' : 
                        idx === 2 ? 'bg-teal-500' : 'bg-orange-500'
                      }`}></div>
                      <span className="text-xs text-slate-300 font-medium">{project.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto bg-slate-900/50">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-800 to-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-600">
                      Metric
                    </th>
                    {comparisonMetrics.projectScores.map((project, idx) => (
                      <th key={idx} className="px-6 py-4 text-center text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-600">
                        <div className="flex items-center justify-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            idx === 0 ? 'bg-blue-500' : 
                            idx === 1 ? 'bg-purple-500' : 
                            idx === 2 ? 'bg-teal-500' : 'bg-orange-500'
                          }`}></div>
                          {project.name}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-600">
                      Difference
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-600">
                      Best Performer
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {comparisonMetrics.metrics.map((metric, metricIdx) => (
                    <tr key={metricIdx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-200">
                        {metric.name}
                      </td>
                      {metric.scores.map((score, scoreIdx) => {
                        const percentage = (score.value / 5.0) * 100;
                                return (
                          <td key={scoreIdx} className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex items-center justify-center gap-2">
                                <span className={`text-base font-bold ${
                                  score.isWinner ? 'text-green-400' : 
                                  score.isLoser ? 'text-red-400' : 
                                  'text-slate-100'
                                }`}>
                                  {score.value.toFixed(2)}
                                </span>
                                {score.isWinner && (
                                  <FiTrendingUp className="text-green-400" size={18} />
                                )}
                                {score.isLoser && (
                                  <FiTrendingDown className="text-red-400" size={18} />
                                )}
                              </div>
                              <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    score.isWinner ? 'bg-gradient-to-r from-green-500 to-green-400' :
                                    score.isLoser ? 'bg-gradient-to-r from-red-500 to-red-400' :
                                    'bg-gradient-to-r from-blue-500 to-cyan-400'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                                  </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-center">
                        {metric.scores.length > 1 && (
                          <div className="flex items-center justify-center gap-2">
                            {metric.scores[1].difference > 0 ? (
                              <>
                                <FiTrendingUp className="text-green-400" size={16} />
                                <span className="text-sm font-bold text-green-400">
                                  +{metric.scores[1].difference.toFixed(2)}
                                </span>
                              </>
                            ) : metric.scores[1].difference < 0 ? (
                              <>
                                <FiTrendingDown className="text-red-400" size={16} />
                                <span className="text-sm font-bold text-red-400">
                                  {metric.scores[1].difference.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <>
                                <FiMinus className="text-slate-500" size={16} />
                                <span className="text-sm text-slate-400">0.00</span>
                              </>
                            )}
                      </div>
                    )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {metric.scores.filter(s => s.isWinner).length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg border border-green-500/30 font-semibold">
                            <FiAward size={12} />
                            {metric.scores.filter(s => s.isWinner).map(s => 
                              comparisonMetrics.projectScores[s.projectIndex].name
                            ).join(', ')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 bg-slate-700/50 px-3 py-1.5 rounded-lg">Tie</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
                  </div>
                  
          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6">
            {/* Line Chart for Trend */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FiTrendingUp className="text-purple-400" />
                  Performance Trend
                </h3>
                <div className="text-sm text-slate-400">
                  Average Scores
                </div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart 
                  data={comparisonMetrics.metrics.map(m => ({
                    metric: m.name,
                    ...comparisonMetrics.projectScores.reduce((acc, project, idx) => {
                      acc[project.name] = m.scores[idx].value;
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
                    cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#cbd5e1', paddingTop: '20px' }}
                    iconType="line"
                  />
                  {comparisonMetrics.projectScores.map((project, idx) => (
                    <Line 
                      key={idx}
                      type="monotone"
                      dataKey={project.name}
                      stroke={`url(#lineGradient${(idx % 2) + 1})`}
                      strokeWidth={3}
                      dot={{ fill: projectColors[idx % projectColors.length].hex, r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        );
      })()}
      
      {/* Show message if dashboard data failed to load */}
      {comparisonData && !loadingDashboard && (!comparisonMetrics || !dashboardData || dashboardData.length < 2) && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-600 font-semibold">Dashboard Unavailable</span>
          </div>
          <p className="text-sm text-yellow-700">
            Unable to load dashboard data. Please ensure all selected projects have Excel files uploaded and try again.
          </p>
          <p className="text-xs text-yellow-600 mt-2">
            Check browser console (F12) for detailed error messages.
          </p>
        </div>
      )}
      
      {/* Show message for Subjective comparison without Excel files */}
      {comparisonData && !loadingDashboard && !comparisonMetrics && selectedProjects.every(p => (p.sqaType || 'subjective') === 'subjective') && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600 font-semibold">Subjective Comparison</span>
          </div>
          <p className="text-sm text-blue-700">
            Subjective comparison data loaded successfully. 
            {comparisonData.projects.length > 0 ? (
              <>
                {' '}Selected projects: {comparisonData.projects.map(p => `${p.name} (${p.resultName})`).join(', ')}.
                {comparisonData.projects.some(p => !p.averagedMetrics) && (
                  <> To view detailed metrics comparison, please ensure all selected projects have Excel files uploaded.</>
                )}
              </>
            ) : (
              ' Comparison visualization for subjective SQA results without Excel files is coming soon.'
            )}
          </p>
          {comparisonData.projects.length > 0 && (
            <div className="mt-4 space-y-2">
              {comparisonData.projects.map((project, idx) => (
                <div key={idx} className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                  <strong>Project {idx + 1}:</strong> {project.name} - Version: {project.versionNumber} - Result: {project.resultName}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default ProjectComparison;
