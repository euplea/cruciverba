
import React from 'react';
import { Check } from 'lucide-react';
import { CrosswordData, GridCell } from '../types';

interface CrosswordViewProps {
  data: CrosswordData;
  onCellChange: (y: number, x: number, value: string) => void;
  showSolution: boolean;
  isPrintMode?: boolean;
}

const CrosswordView: React.FC<CrosswordViewProps> = ({ data, onCellChange, showSolution, isPrintMode }) => {
  const cellSize = isPrintMode ? 'w-8 h-8 text-sm' : 'w-10 h-10 md:w-12 md:h-12 text-lg';

  return (
    <div 
      className={`grid gap-0 border-2 border-gray-800 bg-gray-800 inline-block select-none`}
      style={{ 
        gridTemplateColumns: `repeat(${data.size}, minmax(0, 1fr))`
      }}
    >
      {data.grid.map((row, y) => (
        row.map((cell, x) => (
          <div 
            key={`${y}-${x}`}
            className={`
              ${cellSize} flex items-center justify-center relative transition-all duration-300
              ${cell.isBlack ? 'bg-gray-900' : 'bg-white'}
              ${!cell.isBlack ? 'border border-gray-300' : ''}
              ${cell.isCorrect ? 'animate-correct' : ''}
              ${cell.isCorrect === false ? 'bg-red-50 border-red-300' : ''}
            `}
          >
            {!cell.isBlack && (
              <>
                {cell.number && (
                  <span className={`absolute top-0.5 left-0.5 text-[8px] md:text-[10px] font-bold leading-none ${cell.isCorrect ? 'text-green-600' : 'text-gray-400'}`}>
                    {cell.number}
                  </span>
                )}
                
                {cell.isCorrect && (
                  <Check size={8} className="absolute bottom-0.5 right-0.5 text-green-500 opacity-70" />
                )}

                {showSolution || cell.solutionVisible ? (
                  <span className="font-bold text-blue-600 uppercase font-mono">
                    {cell.char}
                  </span>
                ) : (
                  <input
                    type="text"
                    maxLength={1}
                    value={cell.userInput}
                    onChange={(e) => onCellChange(y, x, e.target.value.toUpperCase())}
                    className={`w-full h-full text-center bg-transparent border-none focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono font-bold transition-colors
                      ${cell.isCorrect ? 'text-green-700' : cell.isCorrect === false ? 'text-red-600' : 'text-gray-800'}
                    `}
                    readOnly={isPrintMode || cell.isCorrect}
                  />
                )}
              </>
            )}
          </div>
        ))
      ))}
    </div>
  );
};

export default CrosswordView;
