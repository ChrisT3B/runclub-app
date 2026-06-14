import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { X, Download, Copy, Check } from 'lucide-react';
import { LeagueShareVariant } from '../types/leagueShare';
import { LeagueShareCard } from './LeagueShareCard';
import '../leagues-share.css';

interface LeagueShareModalProps {
  variants: LeagueShareVariant[];   // one entry for single-table leagues, two for race (M/F)
  onClose:  () => void;
}

export const LeagueShareModal: React.FC<LeagueShareModalProps> = ({ variants, onClose }) => {
  const [activeVariant, setActiveVariant] = useState(0);
  const [topN, setTopN] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const variant = variants[activeVariant];
  const data = variant.data;
  const maxN = Math.max(1, data.entries.length);
  const effectiveTopN = Math.min(topN, maxN);

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale:           2,           // retina quality
        useCORS:         true,
        backgroundColor: '#ffffff',
        width:           600,
      });
      const namePart = data.leagueName.replace(/\s+/g, '-').toLowerCase();
      const labelPart = variants.length > 1 ? `-${variant.label.toLowerCase()}` : '';
      const link = document.createElement('a');
      link.download = `${namePart}${labelPart}-standings.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = async () => {
    const lines = [
      `🏃 ${data.leagueName}`,
      `Updated: ${data.updatedDate}`,
      '',
      ...data.entries.slice(0, effectiveTopN).map(e => {
        const extras = [e.date, e.time].filter(Boolean).join(' ');
        return extras
          ? `${e.rank}. ${e.name} — ${extras} — ${e.detail}`
          : `${e.rank}. ${e.name} — ${e.detail}`;
      }),
      '',
      'Full standings: app.runalcester.co.uk',
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="league-share-overlay" onClick={onClose}>
      <div className="league-share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="league-share-modal__header">
          <h3 className="league-share-modal__title">Share {data.leagueName}</h3>
          <button className="league-share-modal__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {variants.length > 1 && (
          <div className="league-share-modal__tabs">
            {variants.map((v, i) => (
              <button
                key={v.label}
                className={`league-share-modal__tab ${i === activeVariant ? 'is-active' : ''}`}
                onClick={() => setActiveVariant(i)}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        <div className="league-share-modal__controls">
          <label htmlFor="share-top-n">Show top</label>
          <input
            id="share-top-n"
            type="number"
            min={1}
            max={maxN}
            value={topN}
            onChange={(e) => setTopN(Math.max(1, Math.min(maxN, Number(e.target.value) || 1)))}
          />
        </div>

        <div className="league-share-modal__preview">
          <div className="league-share-modal__preview-inner">
            <LeagueShareCard data={data} topN={effectiveTopN} cardRef={cardRef} />
          </div>
        </div>

        <div className="league-share-modal__actions">
          <button className="btn btn-secondary" onClick={handleCopyText}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPNG} disabled={isGenerating}>
            <Download size={16} />
            {isGenerating ? 'Generating…' : 'Download PNG'}
          </button>
        </div>
      </div>
    </div>
  );
};
