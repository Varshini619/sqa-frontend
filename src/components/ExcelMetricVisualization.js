import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FiDownload, FiFileText, FiImage, FiToggleLeft, FiToggleRight, FiPlus, FiX, FiSearch } from 'react-icons/fi';

const ExcelMetricVisualization = ({ reports, versionId, isPublicView = false }) => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states for main chart
  const [selectedNoiseTypes, setSelectedNoiseTypes] = useState([]);
  const [selectedDbLevels, setSelectedDbLevels] = useState([]);
  
  // Filter states for dB Level Comparison Chart
  const [selectedDbLevelsForChart, setSelectedDbLevelsForChart] = useState([]);
  const [selectedNoiseTypesForChart, setSelectedNoiseTypesForChart] = useState([]);
  const [dbLevelSearchForChart, setDbLevelSearchForChart] = useState('');
  
  // Custom noise types and dB levels (user-added)
  const [customNoiseTypes, setCustomNoiseTypes] = useState([]);
  const [customDbLevels, setCustomDbLevels] = useState([]);
  const [newNoiseTypeInput, setNewNoiseTypeInput] = useState('');
  const [newDbLevelInput, setNewDbLevelInput] = useState('');
  
  // Search filters for easy selection
  const [noiseTypeSearch, setNoiseTypeSearch] = useState('');
  const [dbLevelSearch, setDbLevelSearch] = useState('');
  
  const chartRef = useRef(null);
  const dbLevelChartRef = useRef(null);

  // Auto-detect columns from Excel data
  const detectedColumns = useMemo(() => {
    if (excelData.length === 0) return { noiseType: null, dbLevel: null, metrics: [], scoreColumns: [] };
    
    const firstRow = excelData[0];
    const columns = Object.keys(firstRow);
    
    // Auto-detect Noise Type column
    const noiseTypeCol = columns.find(col => 
      col.toLowerCase().includes('noise') || 
      col.toLowerCase().includes('type')
    );
    
    // Auto-detect dB/SNR Level column
    // Priority: columns with "db/snr" or "db/snr level" pattern, then fallback to individual keywords
    const dbLevelCol = columns.find(col => {
      const colLower = col.toLowerCase();
      return colLower.includes('db/snr') || colLower.includes('snr/db') || 
             colLower.includes('db/snr level') || colLower.includes('snr/db level');
    }) || columns.find(col => {
      const colLower = col.toLowerCase();
      return (colLower.includes('db') || colLower.includes('snr')) && colLower.includes('level');
    }) || columns.find(col => {
      const colLower = col.toLowerCase();
      return colLower.includes('db') || colLower.includes('snr');
    });
    
    // Identify metric columns (exclude noise type, db level, and non-numeric columns)
    const excludedCols = [noiseTypeCol, dbLevelCol].filter(Boolean);
    const metricColumns = columns.filter(col => {
      if (excludedCols.includes(col)) return false;
      // Check if column contains numeric values
      const sampleValues = excelData.slice(0, 10).map(row => row[col]);
      return sampleValues.some(val => !isNaN(parseFloat(val)) && isFinite(val));
    });
    
    return {
      noiseType: noiseTypeCol || null,
      dbLevel: dbLevelCol || null,
      metrics: metricColumns,
      scoreColumns: metricColumns
    };
  }, [excelData]);

  // Extract unique values for filters
  const uniqueNoiseTypes = useMemo(() => {
    if (!detectedColumns.noiseType) return [];
    const values = excelData.map(row => row[detectedColumns.noiseType]).filter(Boolean);
    return [...new Set(values)].sort();
  }, [excelData, detectedColumns.noiseType]);

  const uniqueDbLevels = useMemo(() => {
    if (!detectedColumns.dbLevel) return [];
    const values = excelData.map(row => row[detectedColumns.dbLevel]).filter(Boolean);
    return [...new Set(values)].sort();
  }, [excelData, detectedColumns.dbLevel]);

  // Combine unique values with custom added values
  const allNoiseTypes = useMemo(() => {
    const combined = [...uniqueNoiseTypes, ...customNoiseTypes];
    return [...new Set(combined)].sort();
  }, [uniqueNoiseTypes, customNoiseTypes]);

  const allDbLevels = useMemo(() => {
    const combined = [...uniqueDbLevels, ...customDbLevels];
    return [...new Set(combined)].sort();
  }, [uniqueDbLevels, customDbLevels]);

  // Filtered lists based on search
  const filteredNoiseTypes = useMemo(() => {
    if (!noiseTypeSearch.trim()) return allNoiseTypes;
    const searchLower = noiseTypeSearch.toLowerCase();
    return allNoiseTypes.filter(type => 
      type.toLowerCase().includes(searchLower)
    );
  }, [allNoiseTypes, noiseTypeSearch]);

  const filteredDbLevels = useMemo(() => {
    if (!dbLevelSearch.trim()) return allDbLevels;
    const searchLower = dbLevelSearch.toLowerCase();
    return allDbLevels.filter(level => 
      level.toLowerCase().includes(searchLower)
    );
  }, [allDbLevels, dbLevelSearch]);

  // Functions to add custom noise types and dB levels
  const handleAddNoiseType = () => {
    if (newNoiseTypeInput.trim() && !allNoiseTypes.includes(newNoiseTypeInput.trim())) {
      setCustomNoiseTypes([...customNoiseTypes, newNoiseTypeInput.trim()]);
      setNewNoiseTypeInput('');
    }
  };

  const handleRemoveNoiseType = (noiseType) => {
    setCustomNoiseTypes(customNoiseTypes.filter(nt => nt !== noiseType));
  };

  const handleAddDbLevel = () => {
    if (newDbLevelInput.trim() && !allDbLevels.includes(newDbLevelInput.trim())) {
      setCustomDbLevels([...customDbLevels, newDbLevelInput.trim()]);
      setNewDbLevelInput('');
    }
  };

  const handleRemoveDbLevel = (dbLevel) => {
    setCustomDbLevels(customDbLevels.filter(dl => dl !== dbLevel));
  };

  // Load Excel file
  const loadExcelFile = async (report) => {
    setLoading(true);
    setError(null);
    try {
      // Handle both filePath formats (with or without leading slash)
      const filePath = report.filePath || report.filepath;
      const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
      const fileUrl = `http://localhost:5000/uploads/${normalizedPath}`;
      
      console.log('Loading Excel file from:', fileUrl);
      
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout
      });
      const arrayBuffer = response.data;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (data.length === 0) {
        throw new Error('Excel file is empty');
      }
      
      setExcelData(data);
    } catch (err) {
      console.error('Error loading Excel file:', err);
      setError('Failed to load Excel file: ' + (err.response?.data?.message || err.message));
      setExcelData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReport) {
      loadExcelFile(selectedReport);
    } else {
      setExcelData([]);
    }
  }, [selectedReport]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    if (excelData.length === 0) return [];
    
    let filtered = excelData;
    
    // Apply noise type filter (normalize string comparisons)
    if (selectedNoiseTypes.length > 0 && detectedColumns.noiseType) {
      filtered = filtered.filter(row => {
        const rowValue = String(row[detectedColumns.noiseType] || '').trim();
        return selectedNoiseTypes.some(selected => String(selected).trim() === rowValue);
      });
    }
    
    // Apply dB level filter (normalize string comparisons)
    if (selectedDbLevels.length > 0 && detectedColumns.dbLevel) {
      filtered = filtered.filter(row => {
        const rowValue = String(row[detectedColumns.dbLevel] || '').trim();
        return selectedDbLevels.some(selected => String(selected).trim() === rowValue);
      });
    }
    
    return filtered;
  }, [excelData, selectedNoiseTypes, selectedDbLevels, detectedColumns]);

  // Calculate chart data for dB level comparison (X-axis: Metrics, Bars: dB Levels)
  // Uses separate filter states for this chart
  const dbLevelChartData = useMemo(() => {
    if (excelData.length === 0 || !detectedColumns || !detectedColumns.metrics || detectedColumns.metrics.length === 0) {
      return [];
    }
    
    if (!detectedColumns.dbLevel || selectedDbLevelsForChart.length === 0) {
      return [];
    }
    
    const metrics = detectedColumns.metrics;
    const dbLevelsToShow = selectedDbLevelsForChart.length > 0 ? selectedDbLevelsForChart : allDbLevels;
    
    if (dbLevelsToShow.length === 0) {
      return [];
    }
    
    // Filter data based on chart-specific filters
    const chartFilteredData = excelData.filter(row => {
      const rowDb = detectedColumns.dbLevel ? String(row[detectedColumns.dbLevel] || '').trim() : null;
      const rowNoise = detectedColumns.noiseType ? String(row[detectedColumns.noiseType] || '').trim() : null;
      
      const dbMatch = !detectedColumns.dbLevel || selectedDbLevelsForChart.length === 0 || selectedDbLevelsForChart.includes(rowDb);
      const noiseMatch = !detectedColumns.noiseType || selectedNoiseTypesForChart.length === 0 || selectedNoiseTypesForChart.includes(rowNoise);
      
      return dbMatch && noiseMatch;
    });
    
    if (chartFilteredData.length === 0) {
      return [];
    }
    
    const dbLevelData = {};
    
    dbLevelsToShow.forEach(level => {
      // Filter data for this dB level and selected noise types (if any)
      const levelData = chartFilteredData.filter(row => {
        const rowDb = String(row[detectedColumns.dbLevel] || '').trim();
        const rowNoise = detectedColumns.noiseType ? String(row[detectedColumns.noiseType] || '').trim() : null;
        
        const dbMatch = rowDb === level;
        const noiseMatch = !detectedColumns.noiseType || selectedNoiseTypesForChart.length === 0 || selectedNoiseTypesForChart.includes(rowNoise);
        
        return dbMatch && noiseMatch;
      });
      
      // Calculate average for each metric at this dB level
      const metricAverages = {};
      metrics.forEach(metric => {
        const values = levelData
          .map(row => parseFloat(row[metric]))
          .filter(v => !isNaN(v) && isFinite(v));
        
        if (values.length > 0) {
          metricAverages[metric] = values.reduce((a, b) => a + b, 0) / values.length;
        } else {
          metricAverages[metric] = 0;
        }
      });
      
      dbLevelData[level] = metricAverages;
    });
    
    // Transform data: X-axis = metrics, each dB level becomes a bar group
    const result = metrics.map(metric => {
      const dataPoint = { metric };
      
      dbLevelsToShow.forEach(level => {
        const avgValue = dbLevelData[level]?.[metric];
        if (avgValue !== undefined && avgValue !== null && !isNaN(avgValue) && isFinite(avgValue)) {
          dataPoint[level] = Number(avgValue.toFixed(2));
        } else {
          dataPoint[level] = 0;
        }
      });
      
      return dataPoint;
    });
    
    return result.length > 0 && Object.keys(result[0]).length > 1 ? result : [];
  }, [excelData, detectedColumns, selectedNoiseTypesForChart, selectedDbLevelsForChart, allDbLevels]);

  // Calculate aggregated data for chart - Always show Metrics on X-axis, Noise Types as bars
  const chartData = useMemo(() => {
    if (filteredData.length === 0 || !detectedColumns || !detectedColumns.metrics || detectedColumns.metrics.length === 0) {
      return [];
    }
    
    // Validate required columns exist
    if (!detectedColumns.metrics || detectedColumns.metrics.length === 0) {
      console.warn('No metrics detected in Excel file');
      return [];
    }
    
    const metrics = detectedColumns.metrics;
    
    // Check if "All" dB levels are selected (all selected = all available)
    const allDbLevelsSelected = selectedDbLevels.length > 0 && selectedDbLevels.length === allDbLevels.length;
    const allNoiseTypesSelected = selectedNoiseTypes.length > 0 && selectedNoiseTypes.length === allNoiseTypes.length;
    
    // Determine what to show based on selections
    const noiseTypesToShow = selectedNoiseTypes.length > 0 
      ? selectedNoiseTypes 
      : (detectedColumns.noiseType && allNoiseTypes.length > 0 ? allNoiseTypes : []);
    
    // Determine dB levels to show
    let dbLevelsToShow = [];
    if (selectedDbLevels.length > 0) {
      // User selected specific dB levels
      dbLevelsToShow = selectedDbLevels;
    } else if (noiseTypesToShow.length > 0 && detectedColumns.dbLevel) {
      // No dB levels selected, but noise types are selected - find dB levels that have data for these noise types
      const availableDbLevels = new Set();
      filteredData.forEach(row => {
        const rowDb = String(row[detectedColumns.dbLevel] || '').trim();
        const rowNoise = String(row[detectedColumns.noiseType] || '').trim();
        
        // Check if this row matches selected noise types and has valid metric data
        if (noiseTypesToShow.includes(rowNoise) && rowDb) {
          // Check if there's at least one valid metric value
          const hasValidData = metrics.some(metric => {
            const value = parseFloat(row[metric]);
            return !isNaN(value) && isFinite(value) && value > 0;
          });
          
          if (hasValidData) {
            availableDbLevels.add(rowDb);
          }
        }
      });
      
      // Sort dB levels numerically
      dbLevelsToShow = Array.from(availableDbLevels).sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
        return aNum - bNum;
      });
    } else if (detectedColumns.dbLevel && allDbLevels.length > 0) {
      dbLevelsToShow = allDbLevels;
    }
    
    // Priority 1: If noise types are selected AND dB levels are selected -> X-axis: dB Levels, Bars: Metrics (grouped)
    // Priority 1b: If noise types are selected AND no dB levels selected -> X-axis: Metrics, Bars: Noise Types
    if (noiseTypesToShow.length > 0 && detectedColumns.noiseType && detectedColumns.dbLevel) {
      // If dB levels are selected, show dB levels on X-axis with all metrics as bars
      if (selectedDbLevels.length > 0 && dbLevelsToShow.length > 0) {
        const dbLevelMetricData = {};
        
        // For each dB level, calculate average scores for each metric (for selected noise types)
        dbLevelsToShow.forEach(level => {
          dbLevelMetricData[level] = {};
          
          // Filter data for this dB level and selected noise types
          const levelData = filteredData.filter(row => {
            const rowDb = String(row[detectedColumns.dbLevel] || '').trim();
            const rowNoise = String(row[detectedColumns.noiseType] || '').trim();
            
            return rowDb === level && noiseTypesToShow.includes(rowNoise);
          });
          
          // Calculate average for each metric at this dB level
          metrics.forEach(metric => {
            const values = levelData
              .map(row => parseFloat(row[metric]))
              .filter(v => !isNaN(v) && isFinite(v));
            
            if (values.length > 0) {
              dbLevelMetricData[level][metric] = values.reduce((a, b) => a + b, 0) / values.length;
            } else {
              dbLevelMetricData[level][metric] = 0;
            }
          });
        });
        
        // Transform: X-axis = dB levels, bars = metrics
        // Only include dB levels that have at least one non-zero value
        const result = dbLevelsToShow
          .map(level => {
            const dataPoint = { level };
            let hasData = false;
            
            metrics.forEach(metric => {
              const value = dbLevelMetricData[level]?.[metric];
              if (value !== undefined && value !== null && !isNaN(value) && isFinite(value)) {
                dataPoint[metric] = Number(value.toFixed(2));
                if (value > 0) {
                  hasData = true;
                }
              } else {
                dataPoint[metric] = 0;
              }
            });
            
            return hasData ? dataPoint : null;
          })
          .filter(Boolean); // Remove null entries (dB levels with no data)
        
        if (result.length > 0 && Object.keys(result[0]).length > 1) {
          return result;
        }
      }
      
      // If no dB levels selected but noise types are selected -> X-axis: Metrics, Bars: Noise Types
      if (selectedDbLevels.length === 0 && noiseTypesToShow.length > 0) {
        const metricNoiseData = {};
        
        // For each metric, calculate average scores for each noise type (across all available dB levels)
        metrics.forEach(metric => {
          metricNoiseData[metric] = {};
          
          noiseTypesToShow.forEach(noise => {
            // Filter data for this noise type
            const noiseData = filteredData.filter(row => {
              const rowNoise = String(row[detectedColumns.noiseType] || '').trim();
              return rowNoise === noise;
            });
            
            // Calculate average for this metric across all dB levels for this noise type
            const values = noiseData
              .map(row => parseFloat(row[metric]))
              .filter(v => !isNaN(v) && isFinite(v) && v > 0);
            
            if (values.length > 0) {
              metricNoiseData[metric][noise] = values.reduce((a, b) => a + b, 0) / values.length;
            } else {
              metricNoiseData[metric][noise] = 0;
            }
          });
        });
        
        // Transform: X-axis = metrics, bars = noise types
        const result = metrics.map(metric => {
          const dataPoint = { metric };
          
          noiseTypesToShow.forEach(noise => {
            const value = metricNoiseData[metric]?.[noise];
            if (value !== undefined && value !== null && !isNaN(value) && isFinite(value) && value > 0) {
              dataPoint[noise] = Number(value.toFixed(2));
            } else {
              dataPoint[noise] = 0;
            }
          });
          
          return dataPoint;
        });
        
        if (result.length > 0 && Object.keys(result[0]).length > 1) {
          return result;
        }
      }
    }
    
    // Priority 2: If all dB levels selected AND no noise types selected, show dB levels on X-axis
    if (allDbLevelsSelected && detectedColumns.dbLevel && !selectedNoiseTypes.length) {
      // X-axis: dB Levels, Bars: Metrics
      const dbLevelData = {};
      
      allDbLevels.forEach(level => {
        const levelData = filteredData.filter(row => {
          const rowDb = String(row[detectedColumns.dbLevel] || '').trim();
          const rowNoise = detectedColumns.noiseType ? String(row[detectedColumns.noiseType] || '').trim() : null;
          
          const dbMatch = rowDb === level;
          const noiseMatch = !detectedColumns.noiseType || !selectedNoiseTypes.length || selectedNoiseTypes.includes(rowNoise);
          
          return dbMatch && noiseMatch;
        });
        
        const metricAverages = {};
        metrics.forEach(metric => {
          const values = levelData
            .map(row => parseFloat(row[metric]))
            .filter(v => !isNaN(v) && isFinite(v));
          
          if (values.length > 0) {
            metricAverages[metric] = values.reduce((a, b) => a + b, 0) / values.length;
          } else {
            metricAverages[metric] = 0;
          }
        });
        
        dbLevelData[level] = metricAverages;
      });
      
      // Transform: X-axis = dB levels, bars = metrics
      return allDbLevels.map(level => {
        const dataPoint = { level };
        metrics.forEach(metric => {
          dataPoint[metric] = dbLevelData[level]?.[metric] || 0;
        });
        return dataPoint;
      });
    }
    
    // Case 2: Only noise types selected (no dB levels or all dB levels) -> X-axis: Metrics, Bars: Noise Types
    if (noiseTypesToShow.length > 0 && detectedColumns.noiseType) {
      const noiseTypeData = {};
      
      noiseTypesToShow.forEach(noise => {
        // Filter data for this noise type (across all dB levels)
        const noiseData = filteredData.filter(row => {
          const rowNoise = String(row[detectedColumns.noiseType] || '').trim();
          return rowNoise === noise;
        });
        
        // Calculate average for each metric (averaging across all dB levels)
        const metricAverages = {};
        metrics.forEach(metric => {
          const values = noiseData
            .map(row => parseFloat(row[metric]))
            .filter(v => !isNaN(v) && isFinite(v));
          
          if (values.length > 0) {
            metricAverages[metric] = values.reduce((a, b) => a + b, 0) / values.length;
          } else {
            metricAverages[metric] = 0;
          }
        });
        
        noiseTypeData[noise] = metricAverages;
      });
      
      // Transform data: X-axis = metrics, each noise type becomes a bar group
      const result = metrics.map(metric => {
        const dataPoint = { metric };
        
        noiseTypesToShow.forEach(noise => {
          const avgValue = noiseTypeData[noise]?.[metric];
          // Ensure we always have a numeric value
          if (avgValue !== undefined && avgValue !== null && !isNaN(avgValue) && isFinite(avgValue)) {
            dataPoint[noise] = Number(avgValue.toFixed(2));
          } else {
            dataPoint[noise] = 0;
          }
        });
        
        return dataPoint;
      });
      
      // Validate: ensure result has valid data structure
      if (result.length > 0 && Object.keys(result[0]).length > 1) {
        return result;
      }
    }
    
    // Fallback: show overall average by metric
    const fallbackResult = metrics.map(metric => {
      const values = filteredData
        .map(row => parseFloat(row[metric]))
        .filter(v => !isNaN(v) && isFinite(v));
      
      const avg = values.length > 0 
        ? values.reduce((a, b) => a + b, 0) / values.length 
        : 0;
      
      return {
        metric,
        value: Number(avg.toFixed(2))
      };
    });
    
    return fallbackResult.length > 0 ? fallbackResult : [];
  }, [filteredData, detectedColumns, selectedNoiseTypes, allNoiseTypes]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (filteredData.length === 0 || detectedColumns.metrics.length === 0) {
      return { averageScore: 0, bestMetric: null, worstMetric: null };
    }
    
    const allValues = [];
    const metricAverages = {};
    
    detectedColumns.metrics.forEach(metric => {
      const values = filteredData
        .map(row => parseFloat(row[metric]))
        .filter(v => !isNaN(v) && isFinite(v));
      
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        metricAverages[metric] = avg;
        allValues.push(...values);
      }
    });
    
    const averageScore = allValues.length > 0 
      ? allValues.reduce((a, b) => a + b, 0) / allValues.length 
      : 0;
    
    const metricEntries = Object.entries(metricAverages);
    const bestMetric = metricEntries.length > 0 
      ? metricEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : null;
    const worstMetric = metricEntries.length > 0 
      ? metricEntries.reduce((a, b) => a[1] < b[1] ? a : b)[0]
      : null;
    
    return { averageScore, bestMetric, worstMetric, metricAverages };
  }, [filteredData, detectedColumns]);

  // Export chart as PNG
  const exportChartAsPNG = async () => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#1e293b',
        scale: 2
      });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `metric-chart-${Date.now()}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error('Error exporting chart:', err);
      alert('Failed to export chart as PNG');
    }
  };

  // Export dB level chart as PNG
  const exportDbLevelChartAsPNG = async () => {
    if (!dbLevelChartRef.current) return;
    
    try {
      const canvas = await html2canvas(dbLevelChartRef.current, {
        backgroundColor: '#1e293b',
        scale: 2
      });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `db-level-comparison-${Date.now()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting dB level chart:', err);
      alert('Failed to export dB level chart as PNG');
    }
  };

  // Export filtered data as CSV
  const exportDataAsCSV = () => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = Object.keys(filteredData[0]);
    const csvRows = [
      headers.join(','),
      ...filteredData.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ];
    
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `filtered-data-${Date.now()}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Get reports with Excel files (handle both _id and id fields for public/private views)
  const reportsWithExcel = reports.filter(r => {
    const filePath = r.filePath || r.filepath;
    return filePath && (filePath.endsWith('.xlsx') || filePath.endsWith('.xls'));
  });

  return (
    <div className="mt-8 space-y-6">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-700">
        <h3 className="text-2xl font-bold text-slate-100 mb-6">Excel Metric Visualization</h3>
        
        {/* Report Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Select Excel File
          </label>
          <select
            value={selectedReport?._id || selectedReport?.id || ''}
            onChange={(e) => {
              const report = reports.find(r => (r._id === e.target.value || r.id === e.target.value));
              setSelectedReport(report || null);
              setExcelData([]);
              setSelectedNoiseTypes([]);
              setSelectedDbLevels([]);
              setCustomNoiseTypes([]);
              setCustomDbLevels([]);
              setNewNoiseTypeInput('');
              setNewDbLevelInput('');
              setNoiseTypeSearch('');
              setDbLevelSearch('');
            }}
            className="w-full px-4 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select an Excel file...</option>
            {reportsWithExcel.map((report) => (
              <option key={report._id || report.id} value={report._id || report.id}>
                {report.fileName}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="text-center py-8">
            <p className="text-slate-400">Loading Excel data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {excelData.length > 0 && !loading && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-lg p-5 border border-indigo-500">
                <p className="text-sm text-indigo-200 mb-2">Average Score</p>
                <p className="text-3xl font-bold text-white">
                  {summaryStats.averageScore.toFixed(2)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-5 border border-green-500">
                <p className="text-sm text-green-200 mb-2">Best Metric</p>
                <p className="text-lg font-semibold text-white truncate">
                  {summaryStats.bestMetric || 'N/A'}
                </p>
                {summaryStats.bestMetric && summaryStats.metricAverages && (
                  <p className="text-sm text-green-200 mt-1">
                    {summaryStats.metricAverages[summaryStats.bestMetric]?.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-lg p-5 border border-red-500">
                <p className="text-sm text-red-200 mb-2">Worst Metric</p>
                <p className="text-lg font-semibold text-white truncate">
                  {summaryStats.worstMetric || 'N/A'}
                </p>
                {summaryStats.worstMetric && summaryStats.metricAverages && (
                  <p className="text-sm text-red-200 mt-1">
                    {summaryStats.metricAverages[summaryStats.worstMetric]?.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Chart Section - Main Combined Chart */}
            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-slate-100 mb-3">
                    Metric Performance Chart
                  </h4>
                  
                  {/* Compact Noise Type Filter Inside Chart */}
                  {detectedColumns.noiseType && (
                    <div className="bg-slate-800 rounded-lg p-3 border border-slate-600 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-slate-200">
                          Noise Type Filter
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {selectedNoiseTypes.length}/{allNoiseTypes.length}
                          </span>
                          <button
                            onClick={() => {
                              if (selectedNoiseTypes.length === allNoiseTypes.length) {
                                setSelectedNoiseTypes([]);
                              } else {
                                setSelectedNoiseTypes([...allNoiseTypes]);
                              }
                            }}
                            className="text-xs px-2 py-0.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded transition-colors"
                          >
                            {selectedNoiseTypes.length === allNoiseTypes.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Compact Search Box */}
                      <div className="relative mb-2">
                        <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          value={noiseTypeSearch}
                          onChange={(e) => setNoiseTypeSearch(e.target.value)}
                          placeholder="Search..."
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-600 text-slate-100 border border-slate-500 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                        />
                      </div>

                      {/* Compact Checkbox List - Grid Layout */}
                      <div className="max-h-32 overflow-y-auto bg-slate-900/50 rounded p-2 border border-slate-600">
                        {filteredNoiseTypes.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2">
                            {filteredNoiseTypes.map((type) => (
                              <label
                                key={type}
                                className="flex items-center space-x-1.5 p-1 rounded hover:bg-slate-700/50 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedNoiseTypes.includes(type)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedNoiseTypes([...selectedNoiseTypes, type]);
                                    } else {
                                      setSelectedNoiseTypes(selectedNoiseTypes.filter(t => t !== type));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 text-indigo-600 bg-slate-600 border-slate-500 rounded focus:ring-1 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                                />
                                <span className="text-xs text-slate-200 truncate">
                                  {type}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-2">No noise types found</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedNoiseTypes.length > 0 && (
                    <p className="text-xs text-slate-400 mt-2">
                      Selected: {selectedNoiseTypes.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={exportChartAsPNG}
                    disabled={chartData.length === 0}
                    className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiImage className="mr-2" />
                    Export PNG
                  </button>
                  <button
                    onClick={exportDataAsCSV}
                    disabled={filteredData.length === 0}
                    className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiFileText className="mr-2" />
                    Export CSV
                  </button>
                </div>
              </div>
              
              {/* Chart or Empty State */}
              {chartData.length > 0 && chartData[0] && Object.keys(chartData[0]).length > 1 ? (
                <div ref={chartRef} className="bg-slate-800 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={chartData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis 
                        dataKey={(() => {
                          // Determine X-axis dataKey based on chart data structure
                          if (chartData.length > 0) {
                            // Check if first data point has "level" key (dB levels on X-axis)
                            return chartData[0].hasOwnProperty('level') ? 'level' : 'metric';
                          }
                          return 'metric';
                        })()}
                        angle={(() => {
                          if (chartData.length > 0 && chartData[0].hasOwnProperty('level')) {
                            return 0; // Horizontal for dB levels
                          }
                          return -45; // Angled for metrics
                        })()}
                        textAnchor={(() => {
                          if (chartData.length > 0 && chartData[0].hasOwnProperty('level')) {
                            return 'middle';
                          }
                          return 'end';
                        })()}
                        height={(() => {
                          if (chartData.length > 0 && chartData[0].hasOwnProperty('level')) {
                            return 60;
                          }
                          return 100;
                        })()}
                        tick={{ fill: '#cbd5e1', fontSize: 12 }}
                        interval={0}
                        label={(() => {
                          if (chartData.length > 0 && chartData[0].hasOwnProperty('level')) {
                            return { value: 'dB/SNR Level', position: 'insideBottom', offset: -5, fill: '#cbd5e1' };
                          }
                          return { value: 'Metrics', position: 'insideBottom', offset: -5, fill: '#cbd5e1' };
                        })()}
                      />
                      <YAxis 
                        tick={{ fill: '#cbd5e1' }}
                        label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#cbd5e1' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #475569',
                          color: '#cbd5e1',
                          borderRadius: '6px'
                        }}
                        cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                      />
                      <Legend 
                        wrapperStyle={{ color: '#cbd5e1' }}
                        iconType="rect"
                      />
                      {(() => {
                        // Determine which bars to render based on chart data structure
                        if (!chartData || chartData.length === 0) {
                          return null;
                        }
                        
                        const firstDataPoint = chartData[0];
                        if (!firstDataPoint || typeof firstDataPoint !== 'object') {
                          return null;
                        }
                        
                        const colors = [
                          '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', 
                          '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
                          '#f97316', '#84cc16', '#06b6d4', '#a855f7',
                        ];
                        
                        // If data has "level" key (dB levels on X-axis), determine what bars represent
                        if ('level' in firstDataPoint) {
                          // Get all keys except 'level'
                          const barKeys = Object.keys(firstDataPoint).filter(
                            key => key !== 'level'
                          );
                          
                          // Check if these keys are metrics (prioritize metrics over noise types)
                          const areMetrics = barKeys.some(key => 
                            detectedColumns.metrics && detectedColumns.metrics.includes(key)
                          );
                          
                          // If keys are metrics, use them as bars (this is the case when noise type + dB levels are selected)
                          if (areMetrics && detectedColumns.metrics && detectedColumns.metrics.length > 0) {
                            // Filter to only show metrics that exist in the data
                            const metricsInData = detectedColumns.metrics.filter(metric => 
                              barKeys.includes(metric)
                            );
                            return metricsInData.map((metric, index) => (
                              <Bar 
                                key={`metric-${metric}`}
                                dataKey={metric} 
                                fill={colors[index % colors.length]}
                                name={metric}
                                radius={[4, 4, 0, 0]}
                              />
                            ));
                          }
                          
                          // Check if these keys are noise types (fallback case)
                          const areNoiseTypes = barKeys.some(key => 
                            allNoiseTypes.includes(key)
                          );
                          
                          // If keys are noise types, use them as bars
                          if (areNoiseTypes && detectedColumns.noiseType) {
                            return barKeys.map((noise, index) => (
                              <Bar 
                                key={`noise-${noise}`}
                                dataKey={noise} 
                                fill={colors[index % colors.length]}
                                name={noise}
                                radius={[4, 4, 0, 0]}
                              />
                            ));
                          }
                        }
                        
                        // If data has "metric" key, determine what the bars represent
                        if ('metric' in firstDataPoint) {
                          // Get all keys except 'metric', 'value', 'level'
                          const barKeys = Object.keys(firstDataPoint).filter(
                            key => key !== 'metric' && key !== 'value' && key !== 'level'
                          );
                          
                          if (barKeys.length > 0) {
                            // Check if these keys are dB levels (by checking if they match dB level patterns)
                            const areDbLevels = barKeys.some(key => 
                              allDbLevels.includes(key) || /^\d+db$/i.test(key) || /^\d+snr$/i.test(key)
                            );
                            
                            // Check if these keys are noise types (by checking if they match noise type patterns)
                            const areNoiseTypes = barKeys.some(key => 
                              allNoiseTypes.includes(key)
                            );
                            
                            // If they're dB levels, use them as bars
                            if (areDbLevels && detectedColumns.dbLevel) {
                              // Sort dB levels for consistent ordering
                              const sortedDbLevels = barKeys.sort((a, b) => {
                                const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
                                const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
                                return aNum - bNum;
                              });
                              
                              return sortedDbLevels.map((level, index) => (
                                <Bar 
                                  key={`dblevel-${level}`}
                                  dataKey={level} 
                                  fill={colors[index % colors.length]}
                                  name={level}
                                  radius={[4, 4, 0, 0]}
                                />
                              ));
                            }
                            
                            // Otherwise, treat them as noise types
                            return barKeys.map((noise, index) => (
                              <Bar 
                                key={`noise-${noise}`}
                                dataKey={noise} 
                                fill={colors[index % colors.length]}
                                name={noise}
                                radius={[4, 4, 0, 0]}
                              />
                            ));
                          }
                        }
                        
                        // Default: single bar for overall average
                        if ('value' in firstDataPoint) {
                          return (
                            <Bar 
                              key="average-value"
                              dataKey="value" 
                              fill="#6366f1" 
                              name="Average Score"
                              radius={[4, 4, 0, 0]}
                            />
                          );
                        }
                        
                        return null;
                      })()}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-slate-800 rounded-lg p-8 text-center">
                  {filteredData.length === 0 ? (
                    <div className="text-slate-400">
                      <p className="text-lg mb-2 font-semibold">No Data Available</p>
                      <p className="text-sm">The selected filters do not match any data in the Excel file.</p>
                      <div className="mt-3 text-xs text-slate-500 space-y-1">
                        {selectedNoiseTypes.length > 0 && (
                          <p>Selected Noise Types: {selectedNoiseTypes.join(', ')}</p>
                        )}
                        {selectedDbLevels.length > 0 && (
                          <p>Selected dB Levels: {selectedDbLevels.join(', ')}</p>
                        )}
                        {selectedNoiseTypes.length === 0 && selectedDbLevels.length === 0 && (
                          <p>Please select at least one noise type or dB level to view the chart.</p>
                        )}
                      </div>
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="text-slate-400">
                      <p className="text-lg mb-2 font-semibold">No Chart Data Available</p>
                      <p className="text-sm">Unable to calculate chart data from the filtered results.</p>
                      <div className="mt-3 text-xs text-slate-500 space-y-1">
                        <p>Filtered Rows: {filteredData.length}</p>
                        <p>Metrics Detected: {detectedColumns.metrics?.length || 0}</p>
                        <p>Noise Type Column: {detectedColumns.noiseType || 'Not found'}</p>
                        <p>dB Level Column: {detectedColumns.dbLevel || 'Not found'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400">
                      <p className="text-lg mb-2 font-semibold">Chart Data Issue</p>
                      <p className="text-sm">The chart data structure is invalid. Please try adjusting your filters.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Data Info */}
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <p className="text-sm text-slate-300">
                <span className="font-medium">Detected Columns:</span> Noise Type: {detectedColumns.noiseType || 'Not found'}, 
                dB/SNR Level: {detectedColumns.dbLevel || 'Not found'}, 
                Metrics: {detectedColumns.metrics.length} found
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Total Rows: {excelData.length} | Filtered Rows: {filteredData.length}
              </p>
            </div>
          </div>
        )}

        {/* dB Level Comparison Chart - X-axis: Metrics, Bars: dB Levels */}
        {excelData.length > 0 && detectedColumns.dbLevel && (
          <div className="mt-6 bg-slate-700 rounded-lg p-6 border border-slate-600">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-slate-100 mb-3">
                  dB/SNR Level Comparison Chart
                </h4>
                
                {/* Compact Filters Inside Chart */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  {/* Compact Noise Type Filter for Chart */}
                  {detectedColumns.noiseType && (
                    <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-slate-200">
                          Noise Type Filter
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {selectedNoiseTypesForChart.length}/{allNoiseTypes.length}
                          </span>
                          <button
                            onClick={() => {
                              if (selectedNoiseTypesForChart.length === allNoiseTypes.length) {
                                setSelectedNoiseTypesForChart([]);
                              } else {
                                setSelectedNoiseTypesForChart([...allNoiseTypes]);
                              }
                            }}
                            className="text-xs px-2 py-0.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded transition-colors"
                          >
                            {selectedNoiseTypesForChart.length === allNoiseTypes.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Compact Search Box */}
                      <div className="relative mb-2">
                        <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          value={noiseTypeSearch}
                          onChange={(e) => setNoiseTypeSearch(e.target.value)}
                          placeholder="Search..."
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-600 text-slate-100 border border-slate-500 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                        />
                      </div>

                      {/* Compact Checkbox List - Grid Layout with Dynamic Columns */}
                      <div className="max-h-32 overflow-y-auto bg-slate-900/50 rounded p-2 border border-slate-600">
                        {allNoiseTypes.filter(type => 
                          !noiseTypeSearch || type.toLowerCase().includes(noiseTypeSearch.toLowerCase())
                        ).length > 0 ? (
                          <div className={`grid gap-2 ${
                            allNoiseTypes.length <= 4 ? 'grid-cols-2' :
                            allNoiseTypes.length <= 8 ? 'grid-cols-3' :
                            allNoiseTypes.length <= 12 ? 'grid-cols-4' :
                            allNoiseTypes.length <= 16 ? 'grid-cols-5' : 'grid-cols-6'
                          }`}>
                            {allNoiseTypes.filter(type => 
                              !noiseTypeSearch || type.toLowerCase().includes(noiseTypeSearch.toLowerCase())
                            ).map((type) => (
                              <label
                                key={type}
                                className="flex items-center space-x-1.5 p-1 rounded hover:bg-slate-700/50 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedNoiseTypesForChart.includes(type)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedNoiseTypesForChart([...selectedNoiseTypesForChart, type]);
                                    } else {
                                      setSelectedNoiseTypesForChart(selectedNoiseTypesForChart.filter(t => t !== type));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 text-indigo-600 bg-slate-600 border-slate-500 rounded focus:ring-1 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                                />
                                <span className="text-xs text-slate-200 truncate">{type}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-2">No noise types found</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Compact dB/SNR Level Filter for Chart */}
                  {detectedColumns.dbLevel && (
                    <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-slate-200">
                          dB/SNR Level Filter
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {selectedDbLevelsForChart.length}/{allDbLevels.length}
                          </span>
                          <button
                            onClick={() => {
                              if (selectedDbLevelsForChart.length === allDbLevels.length) {
                                setSelectedDbLevelsForChart([]);
                              } else {
                                setSelectedDbLevelsForChart([...allDbLevels]);
                              }
                            }}
                            className="text-xs px-2 py-0.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded transition-colors"
                          >
                            {selectedDbLevelsForChart.length === allDbLevels.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Compact Search Box */}
                      <div className="relative mb-2">
                        <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          value={dbLevelSearchForChart}
                          onChange={(e) => setDbLevelSearchForChart(e.target.value)}
                          placeholder="Search..."
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-600 text-slate-100 border border-slate-500 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                        />
                      </div>

                      {/* Compact Checkbox List - Grid Layout with Dynamic Columns */}
                      <div className="max-h-32 overflow-y-auto bg-slate-900/50 rounded p-2 border border-slate-600">
                        {allDbLevels.filter(level => 
                          !dbLevelSearchForChart || level.toLowerCase().includes(dbLevelSearchForChart.toLowerCase())
                        ).length > 0 ? (
                          <div className={`grid gap-2 ${
                            allDbLevels.length <= 4 ? 'grid-cols-2' :
                            allDbLevels.length <= 8 ? 'grid-cols-3' :
                            allDbLevels.length <= 12 ? 'grid-cols-4' :
                            allDbLevels.length <= 16 ? 'grid-cols-5' : 'grid-cols-6'
                          }`}>
                            {allDbLevels.filter(level => 
                              !dbLevelSearchForChart || level.toLowerCase().includes(dbLevelSearchForChart.toLowerCase())
                            ).map((level) => (
                              <label
                                key={level}
                                className="flex items-center space-x-1.5 p-1 rounded hover:bg-slate-700/50 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedDbLevelsForChart.includes(level)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedDbLevelsForChart([...selectedDbLevelsForChart, level]);
                                    } else {
                                      setSelectedDbLevelsForChart(selectedDbLevelsForChart.filter(l => l !== level));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 text-indigo-600 bg-slate-600 border-slate-500 rounded focus:ring-1 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                                />
                                <span className="text-xs text-slate-200 truncate">{level}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-2">No dB levels found</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chart Display */}
            {dbLevelChartData.length > 0 && selectedDbLevelsForChart.length > 0 && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    {selectedDbLevelsForChart.length > 0 && (
                      <p className="text-xs text-slate-400">
                        Selected dB Levels: {selectedDbLevelsForChart.join(', ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={exportDbLevelChartAsPNG}
                    disabled={dbLevelChartData.length === 0}
                    className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiImage className="mr-2" />
                    Export PNG
                  </button>
                </div>
            
            <div ref={dbLevelChartRef} className="bg-slate-800 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={dbLevelChartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis 
                    dataKey="metric"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fill: '#cbd5e1', fontSize: 12 }}
                    interval={0}
                    label={{ value: 'Metrics', position: 'insideBottom', offset: -5, fill: '#cbd5e1' }}
                  />
                  <YAxis 
                    tick={{ fill: '#cbd5e1' }}
                    label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#cbd5e1' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569',
                      color: '#cbd5e1',
                      borderRadius: '6px'
                    }}
                    cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#cbd5e1' }}
                    iconType="rect"
                  />
                  {selectedDbLevelsForChart.map((level, index) => {
                    const colors = [
                      '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', 
                      '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
                      '#f97316', '#84cc16', '#06b6d4', '#a855f7',
                    ];
                    return (
                      <Bar 
                        key={`dblevel-${level}`}
                        dataKey={level} 
                        fill={colors[index % colors.length]}
                        name={level}
                        radius={[4, 4, 0, 0]}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
              </>
            )}
          </div>
        )}

        {!selectedReport && !loading && (
          <div className="text-center py-8 text-slate-400">
            <p>Select an Excel file above to view visualizations</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelMetricVisualization;

