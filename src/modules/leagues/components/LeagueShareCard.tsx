import React from 'react';
import { LeagueShareData } from '../types/leagueShare';

interface LeagueShareCardProps {
  data:    LeagueShareData;
  topN:    number;
  cardRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Pure presentational standings card used as the html2canvas render target.
 *
 * Inline styles ONLY — deliberate exception to the no-inline-styles rule:
 * html2canvas cannot reliably read CSS variables or external stylesheets, so
 * the card must be fully self-contained.
 */
export const LeagueShareCard: React.FC<LeagueShareCardProps> = ({ data, topN, cardRef }) => {
  const visible = data.entries.slice(0, topN);
  const showDate = visible.some(e => e.date);
  const showTime = visible.some(e => e.time);

  return (
    <div
      ref={cardRef}
      style={{
        width:         '600px',
        backgroundColor: '#ffffff',
        padding:       '40px',
        fontFamily:    'system-ui, -apple-system, sans-serif',
        boxSizing:     'border-box',
      }}
    >
      <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
        {data.leagueName}
      </div>
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '28px' }}>
        Updated: {data.updatedDate}
      </div>

      <div style={{ borderTop: '2px solid #111827', marginBottom: '16px' }} />

      {visible.map((entry) => (
        <div
          key={entry.rank}
          style={{
            display:      'flex',
            alignItems:   'baseline',
            padding:      '10px 0',
            borderBottom: '1px solid #f3f4f6',
          }}
        >
          <div style={{ width: '36px', fontSize: '15px', fontWeight: 700, color: '#111827', flexShrink: 0 }}>
            {entry.rank}
          </div>
          <div style={{ flex: 1, fontSize: '15px', color: '#111827' }}>
            {entry.name}
          </div>
          {showDate && (
            <div style={{ width: '92px', fontSize: '14px', color: '#6b7280', marginLeft: '12px', flexShrink: 0, textAlign: 'right' }}>
              {entry.date ?? ''}
            </div>
          )}
          {showTime && (
            <div style={{ width: '56px', fontSize: '14px', color: '#6b7280', marginLeft: '12px', flexShrink: 0, textAlign: 'right' }}>
              {entry.time ?? ''}
            </div>
          )}
          <div style={{ width: '72px', fontSize: '15px', fontWeight: 600, color: '#374151', marginLeft: '12px', flexShrink: 0, textAlign: 'right' }}>
            {entry.detail}
          </div>
        </div>
      ))}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#9ca3af' }}>
        Run Alcester Running Club • app.runalcester.co.uk
      </div>
    </div>
  );
};
