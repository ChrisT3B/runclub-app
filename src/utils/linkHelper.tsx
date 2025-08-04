// src/utils/linkHelper.tsx
import React from 'react';

/**
 * Converts URLs in text to clickable links
 * @param text - The text that may contain URLs
 * @returns JSX with clickable links
 */
export const renderTextWithLinks = (text: string): React.ReactNode => {
  if (!text) return text;

  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Split text by URLs and create JSX elements
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--red-primary)',
            textDecoration: 'underline',
            wordBreak: 'break-all'
          }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

/**
 * More advanced version that handles multiple types of links
 * Including email addresses and phone numbers
 */
export const renderTextWithAllLinks = (text: string): React.ReactNode => {
  if (!text) return text;

  // Combined regex for URLs, emails, and phone numbers
  const linkRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:\+44|0)[0-9\s-]+)/g;
  
  const parts = text.split(linkRegex);
  
  return parts.map((part, index) => {
    // Check if it's a URL
    if (part.match(/https?:\/\/[^\s]+/)) {
      return (
        <a 
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--red-primary)',
            textDecoration: 'underline',
            wordBreak: 'break-all'
          }}
        >
          {part}
        </a>
      );
    }
    
    // Check if it's an email
    if (part.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)) {
      return (
        <a 
          key={index}
          href={`mailto:${part}`}
          style={{
            color: 'var(--red-primary)',
            textDecoration: 'underline'
          }}
        >
          {part}
        </a>
      );
    }
    
    // Check if it's a phone number
    if (part.match(/(?:\+44|0)[0-9\s-]+/)) {
      // Clean up phone number for tel: link
      const cleanPhone = part.replace(/\s|-/g, '');
      return (
        <a 
          key={index}
          href={`tel:${cleanPhone}`}
          style={{
            color: 'var(--red-primary)',
            textDecoration: 'underline'
          }}
        >
          {part}
        </a>
      );
    }
    
    return part;
  });
};

/**
 * Simple component that renders text with clickable links
 */
export const TextWithLinks: React.FC<{ text: string; className?: string }> = ({ 
  text, 
  className 
}) => {
  return (
    <div className={className}>
      {renderTextWithLinks(text)}
    </div>
  );
};