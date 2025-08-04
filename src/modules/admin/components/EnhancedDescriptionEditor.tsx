// src/modules/admin/components/EnhancedDescriptionEditor.tsx
import React, { useState, useRef, useCallback } from 'react';
import { Bold, Italic, List, ListOrdered, Eye, EyeOff } from 'lucide-react';

interface EnhancedDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  id?: string;
  name?: string;
}

export const EnhancedDescriptionEditor: React.FC<EnhancedDescriptionEditorProps> = ({
  value,
  onChange,
  placeholder = "Run description, route info, what to bring...",
  className = "form-input",
  rows = 5,
  id,
  name
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Format text with basic markdown-like syntax
  const formatText = useCallback((format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    let newText = '';
    let newCursorPos = start;

    switch (format) {
      case 'bold':
        if (selectedText) {
          newText = value.substring(0, start) + `**${selectedText}**` + value.substring(end);
          newCursorPos = end + 4;
        } else {
          newText = value.substring(0, start) + '****' + value.substring(end);
          newCursorPos = start + 2;
        }
        break;
      case 'italic':
        if (selectedText) {
          newText = value.substring(0, start) + `*${selectedText}*` + value.substring(end);
          newCursorPos = end + 2;
        } else {
          newText = value.substring(0, start) + '**' + value.substring(end);
          newCursorPos = start + 1;
        }
        break;
      case 'bullet':
        const bulletText = selectedText || 'List item';
        const beforeStart = value.substring(0, start);
        const needsNewline = beforeStart && !beforeStart.endsWith('\n');
        const prefix = needsNewline ? '\n• ' : '• ';
        newText = value.substring(0, start) + prefix + bulletText + value.substring(end);
        newCursorPos = start + prefix.length;
        break;
      case 'numbered':
        const numberedText = selectedText || 'List item';
        const beforeStartNum = value.substring(0, start);
        const needsNewlineNum = beforeStartNum && !beforeStartNum.endsWith('\n');
        const prefixNum = needsNewlineNum ? '\n1. ' : '1. ';
        newText = value.substring(0, start) + prefixNum + numberedText + value.substring(end);
        newCursorPos = start + prefixNum.length;
        break;
    }

    onChange(newText);
    
    // Restore cursor position after state update
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [value, onChange]);

  // Convert basic markdown to HTML for preview
  const renderPreview = (text: string) => {
    if (!text.trim()) {
      return (
        <div style={{ 
          color: 'var(--gray-400)', 
          fontStyle: 'italic',
          padding: '12px 0'
        }}>
          No description provided
        </div>
      );
    }
    
    return text
      .split('\n')
      .map((line, index) => {
        let processedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
          .replace(/^• (.*)/, '<li style="list-style-type: disc; margin-left: 20px;">$1</li>')
          .replace(/^\d+\. (.*)/, '<li style="list-style-type: decimal; margin-left: 20px;">$1</li>');
        
        if (line.trim() === '') {
          return <br key={index} />;
        }
        
        return (
          <div 
            key={index} 
            dangerouslySetInnerHTML={{ __html: processedLine }}
            style={{ marginBottom: '4px' }}
          />
        );
      });
  };

  const toolbarButtonStyle: React.CSSProperties = {
    padding: '6px 8px',
    background: 'white',
    border: '1px solid var(--gray-300)',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--gray-600)',
    transition: 'all 0.15s ease'
  };

  const activeButtonStyle: React.CSSProperties = {
    ...toolbarButtonStyle,
    background: 'var(--gray-100)',
    borderColor: 'var(--gray-400)'
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Formatting Toolbar */}
      <div style={{ 
        display: 'flex', 
        gap: '6px', 
        marginBottom: '8px',
        padding: '8px',
        background: 'var(--gray-50)',
        borderRadius: '6px',
        border: '1px solid var(--gray-200)',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => formatText('bold')}
          style={toolbarButtonStyle}
          title="Bold (**text**)"
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <Bold size={14} />
          <span>Bold</span>
        </button>
        
        <button
          type="button"
          onClick={() => formatText('italic')}
          style={toolbarButtonStyle}
          title="Italic (*text*)"
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <Italic size={14} />
          <span>Italic</span>
        </button>
        
        <button
          type="button"
          onClick={() => formatText('bullet')}
          style={toolbarButtonStyle}
          title="Bullet List (• item)"
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <List size={14} />
          <span>Bullets</span>
        </button>
        
        <button
          type="button"
          onClick={() => formatText('numbered')}
          style={toolbarButtonStyle}
          title="Numbered List (1. item)"
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <ListOrdered size={14} />
          <span>Numbers</span>
        </button>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            style={showPreview ? activeButtonStyle : toolbarButtonStyle}
            title={showPreview ? "Hide Preview" : "Show Preview"}
            onMouseEnter={(e) => !showPreview && (e.currentTarget.style.background = 'var(--gray-100)')}
            onMouseLeave={(e) => !showPreview && (e.currentTarget.style.background = 'white')}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showPreview ? 'Edit' : 'Preview'}</span>
          </button>
        </div>
      </div>

      {/* Editor/Preview Area */}
      <div style={{ position: 'relative' }}>
        {!showPreview ? (
          <textarea
            ref={textareaRef}
            id={id}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={className}
            rows={rows}
            placeholder={placeholder}
            style={{ 
              resize: 'vertical',
              minHeight: '120px',
              fontFamily: 'var(--font-body)',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap' // This preserves line breaks and spaces
            }}
          />
        ) : (
          <div style={{
            border: '1px solid var(--gray-300)',
            borderRadius: '6px',
            padding: '12px',
            minHeight: '120px',
            background: 'white',
            fontFamily: 'var(--font-body)',
            lineHeight: '1.5',
            fontSize: '14px',
            whiteSpace: 'pre-wrap' // This preserves line breaks in preview too
          }}>
            {renderPreview(value)}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div style={{ 
        fontSize: '12px', 
        color: 'var(--gray-500)', 
        marginTop: '6px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <span>💡 <strong>Formatting:</strong> **bold**, *italic*, • bullets, 1. numbers</span>
        <span>↵ Line breaks are preserved</span>
      </div>
    </div>
  );
};