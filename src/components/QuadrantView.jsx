import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../api/axiosClient';

const QuadrantView = ({ quadrantData, onFileClick, filteredMetric }) => {
  const [hoveredDot, setHoveredDot] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Helper function to check if a quadrant matches the filtered metric
  const isFilteredQuadrant = (quadrantKey) => {
    if (!filteredMetric) return false;
    const metricLower = filteredMetric.toLowerCase();
    
    if (quadrantKey === 'noise' && (metricLower.includes('noise') || metricLower.includes('suppression'))) {
      return true;
    }
    if (quadrantKey === 'chops' && metricLower.includes('chop')) {
      return true;
    }
    if (quadrantKey === 'comprehensibility' && metricLower.includes('comprehens')) {
      return true;
    }
    if (quadrantKey === 'quality' && metricLower.includes('quality')) {
      return true;
    }
    return false;
  };

  // Quadrant configuration
  const quadrants = [
    {
      key: 'noise',
      title: 'Q1: Noise Suppression (1-5)',
      data: quadrantData?.noise || []
    },
    {
      key: 'chops',
      title: 'Q2: Speech Chops (1-5)',
      data: quadrantData?.chops || []
    },
    {
      key: 'comprehensibility',
      title: 'Q3: Speech Comprehensibility (1-5)',
      data: quadrantData?.comprehensibility || []
    },
    {
      key: 'quality',
      title: 'Q4: Voice Quality (1-5)',
      data: quadrantData?.quality || []
    }
  ];

  // Generate color based on score (1=red, 5=green)
  const getColorFromScore = (score) => {
    if (score < 1) score = 1;
    if (score > 5) score = 5;
    
    // Normalize to 0-1 range
    const normalized = (score - 1) / 4;
    
    // Red (1) to Green (5) gradient
    // Red: rgb(220, 38, 38) -> Green: rgb(34, 197, 94)
    const red = Math.round(220 - (normalized * 186));
    const green = Math.round(38 + (normalized * 159));
    const blue = Math.round(38 + (normalized * 56));
    
    return `rgb(${red}, ${green}, ${blue})`;
  };

  // Calculate color counts for all 5 score ranges
  const getColorCounts = (data) => {
    const counts = { score1: 0, score2: 0, score3: 0, score4: 0, score5: 0 };
    data.forEach(file => {
      const score = Math.round(file.score); // Round to nearest integer
      if (score === 1) counts.score1++;
      else if (score === 2) counts.score2++;
      else if (score === 3) counts.score3++;
      else if (score === 4) counts.score4++;
      else if (score >= 5) counts.score5++;
    });
    return counts;
  };

  // Generate better distributed positions to ensure all dots are visible and stay inside
  const getRandomPosition = (index, total) => {
    // Use a better distribution algorithm to avoid overlaps
    // Create a grid-like distribution with some randomness
    const cols = Math.ceil(Math.sqrt(total * 1.5)); // Slightly more columns for better spread
    const rows = Math.ceil(total / cols);
    
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    // Add some randomness to avoid perfect grid, but keep it smaller to stay inside
    const randomOffsetX = ((index * 17 + 23) % 8) - 4; // -4 to +4
    const randomOffsetY = ((index * 31 + 41) % 8) - 4; // -4 to +4
    
    // Calculate position with less padding (15-85% range) to use more space
    const baseX = 15 + (col / (cols - 1 || 1)) * 70; // 15% to 85%
    const baseY = 15 + (row / (rows - 1 || 1)) * 70; // 15% to 85%
    
    // Constrain to stay within bounds (accounting for smaller dot size ~8px)
    const x = Math.max(10, Math.min(90, baseX + randomOffsetX));
    const y = Math.max(10, Math.min(90, baseY + randomOffsetY));
    
    return { x: `${x}%`, y: `${y}%` };
  };

  const handleDotClick = (file) => {
    if (onFileClick) {
      onFileClick(file);
    } else if (file.downloadUrl) {
      // Fallback: trigger download
      window.open(`${API_BASE_URL}${file.downloadUrl}`, '_blank');
    }
  };

  const handleDotHover = (e, file) => {
    setHoveredDot(file);
    setTooltipPosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleDotLeave = () => {
    setHoveredDot(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h3 className="text-xl font-bold text-gray-900 mb-3">
        Quadrant Performance View
      </h3>
      
      {/* Color Legend */}
      <div className="mb-3 flex items-center justify-end">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Score:</span>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorFromScore(1) }}></div>
            <span>1</span>
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorFromScore(2) }}></div>
            <span>2</span>
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorFromScore(3) }}></div>
            <span>3</span>
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorFromScore(4) }}></div>
            <span>4</span>
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorFromScore(5) }}></div>
            <span>5</span>
          </div>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-4">
        {quadrants.map((quadrant) => {
          const isFiltered = isFilteredQuadrant(quadrant.key);
          return (
            <div
              key={quadrant.key}
              className={`border-2 rounded-lg p-3 relative transition-all duration-300 ${
                isFiltered
                  ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-200'
                  : 'border-gray-300 bg-gray-50'
              }`}
              style={{ 
                minHeight: '350px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <h4 className={`text-sm font-semibold mb-1.5 text-center ${
                isFiltered ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {quadrant.title}
                {isFiltered && (
                  <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                    Filtered
                  </span>
                )}
              </h4>
            <div className="text-xs text-gray-600 mb-1.5 text-center space-y-1">
              <p>Files: {quadrant.data.length}</p>
              {quadrant.data.length > 0 && (() => {
                const colorCounts = getColorCounts(quadrant.data);
                return (
                  <div className="flex items-center justify-center gap-1.5 text-xs flex-wrap">
                    <span className="flex items-center gap-0.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColorFromScore(1) }}></div>
                      <span>{colorCounts.score1}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColorFromScore(2) }}></div>
                      <span>{colorCounts.score2}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColorFromScore(3) }}></div>
                      <span>{colorCounts.score3}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColorFromScore(4) }}></div>
                      <span>{colorCounts.score4}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColorFromScore(5) }}></div>
                      <span>{colorCounts.score5}</span>
                    </span>
                  </div>
                );
              })()}
            </div>
            
            {/* Dots Container */}
            <div 
              className="relative w-full h-full overflow-hidden rounded" 
              style={{ 
                minHeight: '280px',
                padding: '8px',
                boxSizing: 'border-box'
              }}
            >
              {quadrant.data.map((file, index) => {
                const position = getRandomPosition(index, quadrant.data.length);
                const color = getColorFromScore(file.score);
                
                return (
                  <div
                    key={`${quadrant.key}-${index}-${file.fileName}`}
                    className="absolute cursor-pointer transition-transform hover:scale-150 hover:z-10"
                    style={{
                      left: position.x,
                      top: position.y,
                      transform: 'translate(-50%, -50%)',
                      zIndex: hoveredDot?.fileName === file.fileName ? 20 : (index + 1),
                      pointerEvents: 'auto',
                      willChange: 'transform'
                    }}
                    onMouseEnter={(e) => handleDotHover(e, file)}
                    onMouseLeave={handleDotLeave}
                    onClick={() => handleDotClick(file)}
                    title={`${file.fileName} - Score: ${file.score}`}
                  >
                    <div
                      className="w-2 h-2 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: color }}
                    ></div>
                  </div>
                );
              })}
              
              {quadrant.data.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm px-4 text-center">
                  No files match the filter criteria
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredDot && (
        <div
          className="fixed bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 pointer-events-none"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y + 10}px`,
            maxWidth: '300px'
          }}
        >
          <div className="font-semibold mb-1">{hoveredDot.fileName}</div>
          <div>Score: {hoveredDot.score}</div>
          <div className="text-gray-400 text-xs mt-1">Click to download</div>
        </div>
      )}
    </div>
  );
};

export default QuadrantView;

