import React, { useState } from 'react';

interface PointsEditorProps {
  initialStructure: Record<string, number> | null;
  onSave: (structure: Record<string, number>) => Promise<void>;
}

export const PointsEditor: React.FC<PointsEditorProps> = ({ initialStructure, onSave }) => {
  const buildInitial = (): number[] => {
    const arr: number[] = [];
    for (let i = 1; i <= 20; i++) {
      arr.push(initialStructure?.[String(i)] ?? 0);
    }
    return arr;
  };

  const [values, setValues] = useState<number[]>(buildInitial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleChange = (index: number, val: string) => {
    const num = parseInt(val, 10);
    setValues(prev => {
      const next = [...prev];
      next[index] = isNaN(num) ? 0 : Math.max(0, num);
      return next;
    });
  };

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setSaving(true);

    const result: Record<string, number> = {};
    values.forEach((v, i) => {
      if (v > 0) result[String(i + 1)] = v;
    });

    try {
      await onSave(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="points-editor">
        {values.map((val, i) => (
          <div key={i} className="points-editor__row">
            <span className="points-editor__position">{i + 1}.</span>
            <input
              type="number"
              className="points-editor__input"
              min={0}
              value={val}
              onChange={e => handleChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      {error && <div className="league-form-error">{error}</div>}
      {saved && <div style={{ color: 'var(--success-color)', fontSize: 'var(--font-sm)', marginBottom: '8px' }}>Saved &#10003;</div>}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Points Table'}
      </button>
    </div>
  );
};
