import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { FiSearch, FiArrowLeft } from 'react-icons/fi';
import Logo from './Logo';

const NavigationBar = ({
  projectName,
  searchTerm,
  onSearchChange,
  showSearch = true,
  rightButton,
  onBack
}) => {
  const { logout } = useContext(AuthContext);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Back arrow + Logo */}
          <div className="flex items-center flex-shrink-0 space-x-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className="p-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-colors"
              >
                <FiArrowLeft size={16} />
              </button>
            )}
            <Logo />
          </div>

          {/* Center: Current project name */}
          {projectName && (
            <div className="flex-1 flex justify-center px-4">
              <div className="flex items-center space-x-2.5 hover:shadow-none">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-600"></div>
                <h2 className="text-base font-semibold text-slate-700 truncate" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{projectName}</h2>
              </div>
            </div>
          )}

          {/* Right: Custom button + Search bar + Logout button */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            {rightButton && rightButton}
            {showSearch && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm || ''}
                  onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                  className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-60 text-sm transition-all bg-white hover:bg-slate-50"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                />
                <FiSearch className="absolute left-2.5 top-2.5 text-slate-400" size={16} />
              </div>
            )}
            <button
              onClick={logout}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 border-2 hover:shadow-md"
              style={{ 
                color: '#4F46E5',
                borderColor: '#4F46E5',
                backgroundColor: 'transparent',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#EEF2FF';
                e.target.style.borderColor = '#4F46E5';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = '#4F46E5';
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavigationBar;

