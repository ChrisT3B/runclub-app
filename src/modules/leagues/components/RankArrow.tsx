import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RankFields, getRankMovement } from '../types';

interface RankArrowProps {
  entry: RankFields;
}

export function RankArrow({ entry }: RankArrowProps) {
  const movement = getRankMovement(entry);
  if (movement === 'up')   return <TrendingUp   size={16} className="league-arrow league-arrow--up" />;
  if (movement === 'down') return <TrendingDown  size={16} className="league-arrow league-arrow--down" />;
  return <Minus size={16} className="league-arrow league-arrow--none" />;
}
