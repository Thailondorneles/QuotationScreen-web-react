import React from 'react';
import '../style/loadingOverlay.css'; 

const LoadingOverlay = ({ isOpen }) => {
  if (!isOpen) return null;
  return (
    <div className="loading-overlay">
      <div className="loading-spinner"></div>
    </div>
  );
};

export default LoadingOverlay;