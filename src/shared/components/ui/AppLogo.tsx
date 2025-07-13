import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  style?: React.CSSProperties;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  className = '',
  style = {}
}) => {
  const sizes = {
    small: { width: '120px', height: 'auto' },
    medium: { width: '160px', height: 'auto' },
    large: { width: '200px', height: 'auto' }
  };

  return (
    <img 
      src="/assets/images/logo.png"
      alt="Run Alcester"
      style={{ ...sizes[size], ...style }}
      className={className}
    />
  );
};