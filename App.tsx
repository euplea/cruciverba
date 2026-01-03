
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings, 
  Printer, 
  RefreshCw, 
  Eye, 
  CheckCircle, 
  Trash2, 
  Grid3X3,
  Dna,
  Share2,
  Trophy,
  Type as TypeIcon,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Plus,
  Save,
  Download,
  HelpCircle
} from 'lucide-react';
import { Difficulty, Topic, CrosswordData, PrintConfig, RawEntry, PlacedEntry } from './types';
import { fetchCrosswordContent, fetchWordSuggestions } from './services/geminiService';
import { generateCrosswordLayout } from './utils/crosswordEngine';
import CrosswordView from './components/CrosswordView';
import PrintLayout from './components/PrintLayout';

const TOPICS: Topic[] = [
  'Cultura Generale', 
  'Musica Italiana', 
  'Hits Internazionali', 
  'Storia', 
  'Geografia', 
  'Cronaca Recente', 
  'Custom'
];

const STORAGE_KEY = 'cruciverba_ai_saved_game';

const App: React.FC = () => {
  const [topic, setTopic] = useState<Topic>('Cultura Generale');
  const [customTopic, setCustomTopic] = useState('');
  const [customList, setCustomList] = useState('');
  const [customMode, setCustomMode] = useState<'topic' | 'list'>('topic');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crossword, setCrossword] = useState<CrosswordData | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [printConfig, setPrintConfig] = useState<PrintConfig>({ format: 'A4', showSolution: false });
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [visibleHints, setVisibleHints] = useState<Record<string, boolean>>({});
  
  // States for Suggestions & Validation
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [invalidWords, setInvalidWords] = useState<string[]>([]);
  const debounceTimer = useRef<number | null>(null);

  // Check for saved game on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setHasSavedGame(true);
    }
  }, []);

  const handleSaveGame = () => {
    if (!crossword) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(crossword));
      setHasSavedGame(true);
      alert("Partita salvata con successo nel browser!");
    } catch (e) {
      console.error("Errore nel salvataggio:", e);
      alert("Errore nel salvataggio locale.");
    }
  };

  const handleLoadGame = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: CrosswordData = JSON.parse(saved);
        setCrossword(parsed);
        setTopic(parsed.topic as Topic || 'Cultura Generale');
        setDifficulty(parsed.difficulty);
        setError(null);
        setShowSolution(false);
        setVisibleHints({});
      } catch (e) {
        console.error("Errore nel caricamento:", e);
        alert("Il salvataggio non è valido.");
      }
    }
  };

  const parseManualList = (text: string): { wordsOnly: string[], fullEntries: RawEntry[] } => {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const wordsOnly: string[] = [];
    const fullEntries: RawEntry[] = [];

    lines.forEach(line => {
      if (line.includes(':')) {
        const [word, ...clueParts] = line.split(':');
        const cleanedWord = word.trim().toUpperCase().replace(/[^A-Z]/g, '');
        const clue = clueParts.join(':').trim();
        if (cleanedWord && clue) {
          fullEntries.push({ word: cleanedWord, clue });
        }
      } else {
        const cleanedWord = line.trim().toUpperCase().replace(/[^A-Z]/g, '');
        if (cleanedWord) {
          wordsOnly.push(cleanedWord);
        }
      }
    });

    return { wordsOnly, fullEntries };
  };

  useEffect(() => {
    if (topic === 'Custom' && customMode === 'list') {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);

      debounceTimer.current = window.setTimeout(async () => {
        const { wordsOnly, fullEntries } = parseManualList(customList);
        const currentWords = [...wordsOnly, ...fullEntries.map(e => e.word)];
        
        const lines = customList.split('\n');
        const bad = lines
          .map(l => l.split(':')[0].trim())
          .filter(w => w && /[^A-Za-z\s]/.test(w));
        setInvalidWords(bad);

        if (currentWords.length > 0 || customTopic) {
          setSuggesting(true);
          const res = await fetchWordSuggestions(customTopic || topic, currentWords);
          setSuggestions(res.filter(s => !currentWords.includes(s)));
          setSuggesting(false);
        }
      }, 1000);
    }
    return () => { if (debounceTimer.current) window.clearTimeout(debounceTimer.current); };
  }, [customList, customTopic, customMode, topic]);

  const addSuggestion = (word: string) => {
    setCustomList(prev => prev.trim() + (prev ? '\n' : '') + word);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCrossword(null);
    setShowSolution(false);
    setVisibleHints({});

    try {
      let finalEntries: RawEntry[] = [];
      const finalTopic = topic === 'Custom' ? (customTopic || 'Personalizzato') : topic;

      if (topic === 'Custom' && customMode === 'list') {
        const { wordsOnly, fullEntries } = parseManualList(customList);
        if (wordsOnly.length === 0 && fullEntries.length === 0) {
          throw new Error("Inserisci almeno qualche parola.");
        }
        const allWords = [...wordsOnly, ...fullEntries.map(e => e.word)];
        finalEntries = await fetchCrosswordContent(finalTopic, difficulty, allWords);
      } else {
        finalEntries = await fetchCrosswordContent(finalTopic, difficulty);
      }
      
      let size = difficulty === Difficulty.EASY ? 10 : (difficulty === Difficulty.MEDIUM ? 12 : 15);
      const layout = generateCrosswordLayout(finalEntries, size, finalTopic, difficulty);
      
      if (layout.entries.length === 0) {
        throw new Error("Impossibile incastrare le parole. Prova con altri termini.");
      }
      setCrossword(layout);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Errore nella generazione.");
    } finally {
      setLoading(false);
    }
  };

  const updateCell = (y: number, x: number, value: string) => {
    if (!crossword) return;
    const newGrid = [...crossword.grid];
    newGrid[y][x].userInput = value.slice(-1).toUpperCase();
    newGrid[y][x].isCorrect = undefined;
    setCrossword({ ...crossword, grid: newGrid });
  };

  const handleCheck = () => {
    if (!crossword) return;
    const resetGrid = crossword.grid.map(row => row.map(cell => ({ ...cell, isCorrect: undefined })));
    setCrossword({ ...crossword, grid: resetGrid });
    setTimeout(() => {
      const newGrid = [...resetGrid];
      newGrid.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (!cell.isBlack && cell.userInput !== '') {
            cell.isCorrect = cell.userInput === cell.char;
          }
        });
      });
      setCrossword({ ...crossword, grid: newGrid });
    }, 10);
  };

  const toggleHint = (key: string) => {
    setVisibleHints(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderClue = (e: PlacedEntry) => {
    const key = `${e.direction}-${e.number}`;
    const isHintVisible = visibleHints[key];
    const isWordCorrect = crossword?.grid[e.y][e.x].isCorrect;

    return (
      <li key={key} className="flex flex-col gap-1 py-1 border-b border-gray-50 last:border-0 group">
        <div className="flex gap-3 text-sm leading-relaxed items-start">
          <span className={`font-black h-7 min-w-[28px] flex items-center justify-center rounded text-xs transition-all ${isWordCorrect ? 'text-green-600 bg-green-50' : 'text-blue-600 bg-blue-50'}`}>
            {e.number}
          </span>
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-gray-700 group-hover:text-black transition-colors break-words">
                {e.clue}
              </span>
              <button 
                onClick={() => toggleHint(key)}
                className={`shrink-0 p-1.5 rounded-full transition-all ${isHintVisible ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}
                title="Aiuto?"
              >
                <HelpCircle size={14} />
              </button>
            </div>
            {isHintVisible && e.hint && (
              <div className="text-[11px] font-semibold text-blue-600 italic bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                <span className="opacity-70 mr-1 uppercase text-[9px] tracking-tighter">Suggerimento:</span> {e.hint}
              </div>
            )}
          </div>
        </div>
      </li>
    );
  };

  const horizontal = crossword?.entries.filter(e => e.direction === 'H').sort((a, b) => a.number - b.number);
  const vertical = crossword?.entries.filter(e => e.direction === 'V').sort((a, b) => a.number - b.number);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 no-print sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
              <Grid3X3 size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cruciverba AI</h1>
          </div>
          <div className="flex gap-2">
            {hasSavedGame && (
              <button onClick={handleLoadGame} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <Download size={18} /> Riprendi
              </button>
            )}
            <button 
              onClick={() => { setPrintConfig({ format: 'A4', showSolution: false }); setTimeout(() => window.print(), 100); }}
              disabled={!crossword}
              className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Printer size={18} /> Stampa
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 no-print">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-6"><Settings size={20} className="text-blue-600" />Configurazione</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tema</label>
                  <select value={topic} onChange={(e) => setTopic(e.target.value as Topic)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
                    {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {topic === 'Custom' && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 mt-2">
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                      <button onClick={() => setCustomMode('topic')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${customMode === 'topic' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}><MessageSquare size={14} /> Argomento</button>
                      <button onClick={() => setCustomMode('list')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${customMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}><TypeIcon size={14} /> Lista</button>
                    </div>
                    {customMode === 'topic' ? (
                      <input type="text" placeholder="es. Storia del Rock..." value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-sm rounded-lg block p-2.5" />
                    ) : (
                      <div className="space-y-3">
                        <textarea rows={5} placeholder="PAROLA1&#10;PAROLA2: Indizio..." value={customList} onChange={(e) => setCustomList(e.target.value)} className={`w-full bg-gray-50 border ${invalidWords.length > 0 ? 'border-amber-300' : 'border-gray-300'} text-xs rounded-lg p-2.5 font-mono transition-all`} />
                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                          <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1"><Sparkles size={10} /> Suggerimenti IA</span>{suggesting && <RefreshCw size={10} className="animate-spin text-blue-400" />}</div>
                          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                            {suggestions.map((s, i) => <button key={i} onClick={() => addSuggestion(s)} className="flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 text-blue-700 rounded-md text-[10px] font-semibold hover:bg-blue-600 hover:text-white transition-all shadow-sm">{s} <Plus size={8} /></button>)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Difficoltà</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.values(Difficulty).map(d => <button key={d} onClick={() => setDifficulty(d)} className={`py-2 text-xs font-bold rounded-lg border transition-all ${difficulty === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{d.toUpperCase()}</button>)}
                  </div>
                </div>
                <button onClick={handleGenerate} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200 mt-4"><RefreshCw className={loading ? 'animate-spin' : ''} size={20} />{crossword ? 'Rigenera' : 'Crea'}</button>
              </div>
            </div>
            {crossword && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Trophy size={20} className="text-yellow-500" />Gioca</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowSolution(!showSolution)} className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"><Eye size={14} /> {showSolution ? 'Nascondi' : 'Soluzione'}</button>
                  <button onClick={handleCheck} className="flex items-center justify-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-bold"><CheckCircle size={14} /> Controlla</button>
                  <button onClick={handleSaveGame} className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-bold"><Save size={14} /> Salva</button>
                  <button onClick={() => { if(confirm("Resettare?")) { const newGrid = [...crossword.grid]; newGrid.forEach(r => r.forEach(c => c.userInput = '')); setCrossword({...crossword, grid: newGrid}); } }} className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold"><Trash2 size={14} /> Resetta</button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            {loading ? (
              <div className="bg-white h-[500px] rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="animate-spin text-blue-600" size={48} />
                <p className="font-bold text-gray-900">Generazione Cruciverba...</p>
              </div>
            ) : crossword ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-gray-200 flex justify-center overflow-auto scrollbar-hide">
                  <CrosswordView data={crossword} onCellChange={updateCell} showSolution={showSolution} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-blue-800 border-b pb-2 mb-4 uppercase text-[10px] tracking-widest">Orizzontali</h3>
                    <ul className="divide-y divide-gray-50">{horizontal?.map(renderClue)}</ul>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-blue-800 border-b pb-2 mb-4 uppercase text-[10px] tracking-widest">Verticali</h3>
                    <ul className="divide-y divide-gray-50">{vertical?.map(renderClue)}</ul>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-10 text-center">
                <p className="text-red-600 font-bold">{error}</p>
                <button onClick={handleGenerate} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg font-bold">Riprova</button>
              </div>
            ) : (
              <div className="bg-white h-[500px] rounded-2xl shadow-sm border border-gray-200 border-dashed flex flex-col items-center justify-center text-center p-10">
                <Grid3X3 size={64} className="text-blue-100 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pronto a iniziare?</h3>
                <p className="text-gray-500 text-sm max-w-xs">Scegli un tema o inserisci le tue parole a sinistra per generare un cruciverba personalizzato.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      {crossword && <PrintLayout data={crossword} config={printConfig} />}
    </div>
  );
};

export default App;
