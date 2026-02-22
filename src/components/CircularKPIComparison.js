import React, { useEffect, useState } from 'react';
import { FiAward, FiTrendingDown } from 'react-icons/fi';

const CircularKPIComparison = ({ versionScores }) => {
  const [animatedScores, setAnimatedScores] = useState({});

  useEffect(() => {
    // Animate scores on mount
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    
    const initialScores = {};
    versionScores.forEach((version, idx) => {
      initialScores[idx] = 0;
    });
    setAnimatedScores(initialScores);
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      const newScores = {};
      versionScores.forEach((version, idx) => {
        newScores[idx] = version.averageScore * progress;
      });
      setAnimatedScores(newScores);
      
      if (currentStep >= steps) {
        clearInterval(interval);
        const finalScores = {};
        versionScores.forEach((version, idx) => {
          finalScores[idx] = version.averageScore;
        });
        setAnimatedScores(finalScores);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [versionScores]);

  // Find best and worst versions
  const bestVersion = versionScores.reduce((best, current) => 
    current.averageScore > best.averageScore ? current : best, versionScores[0]);
  const worstVersion = versionScores.reduce((worst, current) => 
    current.averageScore < worst.averageScore ? current : worst, versionScores[0]);

  const colors = [
    { gradient: 'from-blue-500 to-cyan-500', solid: '#3b82f6' },
    { gradient: 'from-purple-500 to-pink-500', solid: '#8b5cf6' },
    { gradient: 'from-teal-500 to-green-500', solid: '#14b8a6' },
    { gradient: 'from-orange-500 to-red-500', solid: '#f59e0b' },
  ];

  const CircularProgress = ({ version, index, isBest, isWorst }) => {
    const score = animatedScores[index] || 0;
    const percentage = (score / 5.0) * 100;
    const color = colors[index % colors.length];
    
    const size = 160;
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            <defs>
              <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color.gradient.includes('blue') ? '#3b82f6' : 
                                             color.gradient.includes('purple') ? '#8b5cf6' :
                                             color.gradient.includes('teal') ? '#14b8a6' : '#f59e0b'} />
                <stop offset="100%" stopColor={color.gradient.includes('cyan') ? '#06b6d4' :
                                               color.gradient.includes('pink') ? '#ec4899' :
                                               color.gradient.includes('green') ? '#10b981' : '#ef4444'} />
              </linearGradient>
            </defs>
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#gradient-${index})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-100 ease-out"
              style={{
                filter: isBest ? 'drop-shadow(0 0 15px rgba(34, 197, 94, 0.6)) drop-shadow(0 0 25px rgba(34, 197, 94, 0.4))' :
                         isWorst ? 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.6)) drop-shadow(0 0 25px rgba(239, 68, 68, 0.4))' :
                         'none',
                transition: 'stroke-dashoffset 0.1s ease-out, filter 0.3s ease-out'
              }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-3xl font-bold text-white mb-1">
              {percentage.toFixed(0)}%
            </div>
            <div className="text-sm text-slate-400">
              {score.toFixed(2)}/5
            </div>
          </div>
          {/* Best/Worst badge */}
          {isBest && (
            <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-2 shadow-lg">
              <FiAward className="text-white" size={20} />
            </div>
          )}
          {isWorst && (
            <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-2 shadow-lg">
              <FiTrendingDown className="text-white" size={20} />
            </div>
          )}
        </div>
        {/* Version name */}
        <div className="mt-4 text-center">
          <div className={`text-base font-semibold ${
            isBest ? 'text-green-400' : 
            isWorst ? 'text-red-400' : 
            'text-slate-300'
          }`}>
            {version.name}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Avg: {version.averageScore.toFixed(2)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl p-8">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-2 mb-2">
          <FiAward className="text-yellow-400" />
          Overall Performance Comparison
        </h3>
        <p className="text-slate-400 text-sm">Compare overall performance across versions</p>
      </div>
      
      <div className="flex flex-wrap justify-center items-start gap-8 lg:gap-12">
        {versionScores.map((version, idx) => {
          const isBest = version.name === bestVersion.name;
          const isWorst = version.name === worstVersion.name && versionScores.length > 1;
          
          return (
            <CircularProgress
              key={idx}
              version={version}
              index={idx}
              isBest={isBest}
              isWorst={isWorst}
            />
          );
        })}
      </div>
      
      {/* Summary */}
      <div className="mt-8 pt-6 border-t border-slate-700">
        <div className="flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg border border-green-500/30">
            <FiAward className="text-green-400" />
            <span className="text-sm font-semibold text-green-400">
              Best: {bestVersion.name} ({bestVersion.averageScore.toFixed(2)})
            </span>
          </div>
          {versionScores.length > 1 && worstVersion.name !== bestVersion.name && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg border border-red-500/30">
              <FiTrendingDown className="text-red-400" />
              <span className="text-sm font-semibold text-red-400">
                Worst: {worstVersion.name} ({worstVersion.averageScore.toFixed(2)})
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CircularKPIComparison;

