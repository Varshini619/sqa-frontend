import React from 'react';
import { useNavigate } from 'react-router-dom';

const Logo = ({ className = "" }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/home')}
      className={`flex items-center hover:opacity-80 transition-opacity focus:outline-none ${className}`}
    >
      <img 
        src="/logo.png" 
        alt="IPHIPI Logo" 
        className="h-12 w-auto"
      />
    </button>
  );
};

export default Logo;

