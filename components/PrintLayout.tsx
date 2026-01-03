
import React from 'react';
import { CrosswordData, PrintConfig } from '../types';
import CrosswordView from './CrosswordView';

interface PrintLayoutProps {
  data: CrosswordData;
  config: PrintConfig;
}

const PrintLayout: React.FC<PrintLayoutProps> = ({ data, config }) => {
  const horizontal = data.entries.filter(e => e.direction === 'H').sort((a, b) => a.number - b.number);
  const vertical = data.entries.filter(e => e.direction === 'V').sort((a, b) => a.number - b.number);

  return (
    <div className={`print-only p-8 bg-white text-black ${config.format === 'A4' ? 'page-a4' : 'page-a3'}`}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold uppercase tracking-widest">Cruciverba AI</h1>
        <p className="text-lg mt-2 italic">Tema: {data.topic} | Difficoltà: {data.difficulty}</p>
        {config.showSolution && <p className="text-red-600 font-bold mt-2">SOLUZIONI</p>}
      </div>

      <div className="flex justify-center mb-8">
        <CrosswordView 
          data={data} 
          onCellChange={() => {}} 
          showSolution={config.showSolution} 
          isPrintMode={true} 
        />
      </div>

      <div className="grid grid-cols-2 gap-8 mt-12 text-sm">
        <div>
          <h2 className="font-bold border-b-2 border-black mb-4 pb-1 uppercase tracking-wider">Orizzontali</h2>
          <ul className="space-y-2">
            {horizontal.map(e => (
              <li key={`h-${e.number}`} className="flex gap-2">
                <span className="font-bold min-w-[20px]">{e.number}.</span>
                <span>{e.clue}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-bold border-b-2 border-black mb-4 pb-1 uppercase tracking-wider">Verticali</h2>
          <ul className="space-y-2">
            {vertical.map(e => (
              <li key={`v-${e.number}`} className="flex gap-2">
                <span className="font-bold min-w-[20px]">{e.number}.</span>
                <span>{e.clue}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-auto pt-12 text-center text-xs text-gray-500">
        Generato con Cruciverba AI - {new Date().toLocaleDateString('it-IT')}
      </div>
    </div>
  );
};

export default PrintLayout;
