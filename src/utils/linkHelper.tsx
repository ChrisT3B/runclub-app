// src/utils/linkHelper.tsx
import React from 'react';

/**
 * Enhanced function that converts both markdown formatting AND URLs to proper JSX
 * FIXED: Better regex patterns and processing order to prevent formatting issues
 */
const renderTextWithLinksAndMarkdown = (text: string): React.ReactNode => {
  if (!text) return text;

  // Split text into lines for processing
  const lines = text.split('\n');
  
  return lines.map((line, lineIndex) => {
    if (line.trim() === '') {
      return <br key={lineIndex} />;
    }

    // FIXED: Process markdown formatting with more robust regex patterns
    let processedLine = line
      // Bold: **text** - improved regex to handle edge cases
      .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
      // Italic: *text* - ensure it doesn't interfere with bold
      .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
      // Bullets: • text
      .replace(/^• (.+)$/gm, '<li style="list-style-type: disc; margin-left: 20px;">$1</li>')
      // Numbers: 1. text
      .replace(/^\d+\. (.+)$/gm, '<li style="list-style-type: decimal; margin-left: 20px;">$1</li>');

    // Then, process URLs within the already-processed line
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    
    // Split by URLs while preserving existing HTML tags
    const parts = processedLine.split(urlRegex);
    
    const processedParts = parts.map((part, partIndex) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={`${lineIndex}-${partIndex}`}
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
      // For non-URL parts, render as HTML (to preserve markdown formatting)
      if (part.includes('<')) {
        return (
          <span 
            key={`${lineIndex}-${partIndex}`}
            dangerouslySetInnerHTML={{ __html: part }}
          />
        );
      }
      return part;
    });

    return (
      <div key={lineIndex} style={{ marginBottom: '4px' }}>
        {processedParts}
      </div>
    );
  });
};

/**
 * Converts URLs in text to clickable links AND processes markdown formatting
 * This is the main function that RunCard and other components use
 * @param text - The text that may contain URLs and markdown
 * @returns JSX with clickable links and formatted text
 */
export const renderTextWithLinks = (text: string): React.ReactNode => {
  // Use the enhanced version that handles both links and markdown
  return renderTextWithLinksAndMarkdown(text);
};

/**
 * More advanced version that handles multiple types of links
 * Including email addresses and phone numbers, plus markdown formatting
 */
export const renderTextWithAllLinks = (text: string): React.ReactNode => {
  if (!text) return text;

  // Split text into lines for processing
  const lines = text.split('\n');
  
  return lines.map((line, lineIndex) => {
    if (line.trim() === '') {
      return <br key={lineIndex} />;
    }

    // FIXED: Process markdown formatting with improved regex patterns
    let processedLine = line
      // Bold: **text** - improved regex
      .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
      // Italic: *text* - ensure it doesn't interfere with bold
      .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
      // Bullets: • text
      .replace(/^• (.+)$/gm, '<li style="list-style-type: disc; margin-left: 20px;">$1</li>')
      // Numbers: 1. text
      .replace(/^\d+\. (.+)$/gm, '<li style="list-style-type: decimal; margin-left: 20px;">$1</li>');

    // Combined regex for URLs, emails, and phone numbers
    const linkRegex = /(https?:\/\/[^\s<]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:\+44|0)[0-9\s-]+)/g;
    
    const parts = processedLine.split(linkRegex);
    
    const processedParts = parts.map((part, partIndex) => {
      // Check if it's a URL
      if (part.match(/https?:\/\/[^\s<]+/)) {
        return (
          <a 
            key={`${lineIndex}-${partIndex}`}
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
            key={`${lineIndex}-${partIndex}`}
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
        const cleanPhone = part.replace(/\s|-/g, '');
        return (
          <a 
            key={`${lineIndex}-${partIndex}`}
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
      
      // For non-link parts, render as HTML (to preserve markdown formatting)
      if (part.includes('<')) {
        return (
          <span 
            key={`${lineIndex}-${partIndex}`}
            dangerouslySetInnerHTML={{ __html: part }}
          />
        );
      }
      return part;
    });

    return (
      <div key={lineIndex} style={{ marginBottom: '4px' }}>
        {processedParts}
      </div>
    );
  });
};

/**
 * Simple component that renders text with clickable links and markdown formatting
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