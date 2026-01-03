
import { RawEntry, PlacedEntry, CrosswordData, Difficulty, GridCell } from "../types";

export const generateCrosswordLayout = (
  rawEntries: RawEntry[], 
  initialSize: number,
  topic: string,
  difficulty: Difficulty
): CrosswordData => {
  // Ordiniamo per lunghezza decrescente per massimizzare le possibilità di incrocio delle parole lunghe
  const sorted = [...rawEntries].sort((a, b) => b.word.length - a.word.length);
  
  let bestPlaced: PlacedEntry[] = [];
  let bestGrid: (string | null)[][] = [];
  let bestDensity = 0;

  // Portiamo le iterazioni a 50 per una ricerca più esaustiva dello schema denso
  const MAX_ATTEMPTS = 50;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const currentPlaced: PlacedEntry[] = [];
    const workSize = initialSize * 3; // Griglia di lavoro ampia per evitare bordi
    const grid: (string | null)[][] = Array(workSize).fill(null).map(() => Array(workSize).fill(null));

    // Fix: Updated return type to always be an object to allow safe destructuring
    const canPlace = (word: string, x: number, y: number, dir: 'H' | 'V'): { isValid: boolean; intersections: number } => {
      if (x < 0 || y < 0 || (dir === 'H' ? x + word.length : x) >= workSize || (dir === 'V' ? y + word.length : y) >= workSize) return { isValid: false, intersections: 0 };

      let intersections = 0;

      if (dir === 'H') {
        // Regola Enigmistica Italiana: no lettere adiacenti prima o dopo la parola
        if (x > 0 && grid[y][x - 1] !== null) return { isValid: false, intersections: 0 };
        if (x + word.length < workSize && grid[y][x + word.length] !== null) return { isValid: false, intersections: 0 };

        for (let i = 0; i < word.length; i++) {
          const char = word[i];
          const current = grid[y][x + i];
          
          if (current !== null) {
            if (current !== char) return { isValid: false, intersections: 0 };
            intersections++;
          } else {
            // Regola Enigmistica Italiana: no parole fantasma (parallele adiacenti)
            if (y > 0 && grid[y - 1][x + i] !== null) return { isValid: false, intersections: 0 };
            if (y < workSize - 1 && grid[y + 1][x + i] !== null) return { isValid: false, intersections: 0 };
          }
        }
      } else {
        // Verticale
        if (y > 0 && grid[y - 1][x] !== null) return { isValid: false, intersections: 0 };
        if (y + word.length < workSize && grid[y + word.length][x] !== null) return { isValid: false, intersections: 0 };

        for (let i = 0; i < word.length; i++) {
          const char = word[i];
          const current = grid[y + i][x];
          
          if (current !== null) {
            if (current !== char) return { isValid: false, intersections: 0 };
            intersections++;
          } else {
            if (x > 0 && grid[y + i][x - 1] !== null) return { isValid: false, intersections: 0 };
            if (x < workSize - 1 && grid[y + i][x + 1] !== null) return { isValid: false, intersections: 0 };
          }
        }
      }
      
      // La prima parola non richiede intersezioni, le successive sì (almeno 1)
      return { isValid: currentPlaced.length === 0 || intersections > 0, intersections };
    };

    const place = (entry: RawEntry, x: number, y: number, dir: 'H' | 'V') => {
      if (dir === 'H') {
        for (let i = 0; i < entry.word.length; i++) grid[y][x + i] = entry.word[i];
      } else {
        for (let i = 0; i < entry.word.length; i++) grid[y + i][x] = entry.word[i];
      }
      currentPlaced.push({ ...entry, x, y, direction: dir, number: 0 });
    };

    // Strategia di Seeding Dinamico: alterna rotazione e offset della prima parola
    const seedIdx = attempt % Math.min(sorted.length, 5);
    const first = sorted[seedIdx];
    const initialDir: 'H' | 'V' = attempt % 2 === 0 ? 'H' : 'V';
    const centerX = Math.floor(workSize / 2);
    const centerY = Math.floor(workSize / 2);
    
    place(first, 
      initialDir === 'H' ? centerX - Math.floor(first.word.length / 2) : centerX,
      initialDir === 'V' ? centerY - Math.floor(first.word.length / 2) : centerY,
      initialDir
    );

    const remaining = sorted.filter((_, idx) => idx !== seedIdx);
    
    // Algoritmo di posizionamento Best-Fit
    while (true) {
      let bestGlobalFit = null;
      let maxScore = -1;

      // Cerchiamo la "migliore parola" da inserire tra quelle rimanenti
      for (let rIdx = 0; rIdx < remaining.length; rIdx++) {
        const entry = remaining[rIdx];
        
        // Per ogni parola già piazzata, cerchiamo punti di contatto
        for (const p of currentPlaced) {
          for (let j = 0; j < p.word.length; j++) {
            for (let k = 0; k < entry.word.length; k++) {
              if (p.word[j] === entry.word[k]) {
                const newDir = p.direction === 'H' ? 'V' : 'H';
                const newX = newDir === 'H' ? p.x + j - k : p.x + j;
                const newY = newDir === 'H' ? p.y : p.y + j - k;

                const { isValid, intersections } = canPlace(entry.word, newX, newY, newDir);
                if (isValid) {
                  // Punteggio: preferiamo più intersezioni e parole lunghe per "bloccare" lo schema
                  const score = intersections * 10 + (entry.word.length / 2);
                  if (score > maxScore) {
                    maxScore = score;
                    bestGlobalFit = { entry, x: newX, y: newY, dir: newDir, rIdx };
                  }
                }
              }
            }
          }
        }
      }

      if (bestGlobalFit) {
        place(bestGlobalFit.entry, bestGlobalFit.x, bestGlobalFit.y, bestGlobalFit.dir);
        remaining.splice(bestGlobalFit.rIdx, 1);
      } else {
        break; // Non ci sono più incastri validi
      }
    }

    // Valutazione Densità Finale Iterazione
    if (currentPlaced.length > 0) {
      let minX = workSize, maxX = 0, minY = workSize, maxY = 0;
      currentPlaced.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        if (p.direction === 'H') {
          maxX = Math.max(maxX, p.x + p.word.length - 1);
          maxY = Math.max(maxY, p.y);
        } else {
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y + p.word.length - 1);
        }
      });

      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const area = width * height;
      
      let actualLetters = 0;
      for (let iy = minY; iy <= maxY; iy++) {
        for (let ix = minX; ix <= maxX; ix++) {
          if (grid[iy][ix] !== null) actualLetters++;
        }
      }
      
      const density = actualLetters / area;
      // Obiettivo: più parole possibile, poi densità più alta (meno caselle nere)
      if (currentPlaced.length > bestPlaced.length || (currentPlaced.length === bestPlaced.length && density > bestDensity)) {
        bestPlaced = currentPlaced.map(p => ({ ...p, x: p.x - minX, y: p.y - minY }));
        bestDensity = density;
        
        const cropped: (string | null)[][] = Array(height).fill(null).map(() => Array(width).fill(null));
        for (let iy = 0; iy < height; iy++) {
          for (let ix = 0; ix < width; ix++) {
            cropped[iy][ix] = grid[minY + iy][minX + ix];
          }
        }
        bestGrid = cropped;
      }
    }
    
    // Se abbiamo raggiunto una densità eccellente (es. > 85% lettere), terminiamo in anticipo
    if (bestPlaced.length === sorted.length && bestDensity > 0.85) break;
  }

  const finalHeight = bestGrid.length;
  const finalWidth = bestGrid[0]?.length || 0;

  const finalGrid: GridCell[][] = Array(finalHeight).fill(null).map((_, y) => 
    Array(finalWidth).fill(null).map((_, x) => ({
      char: bestGrid[y][x],
      isBlack: bestGrid[y][x] === null,
      userInput: '',
      solutionVisible: false
    }))
  );

  let currentNumber = 1;
  const numberedEntries: PlacedEntry[] = [];
  
  for (let y = 0; y < finalHeight; y++) {
    for (let x = 0; x < finalWidth; x++) {
      const starts = bestPlaced.filter(p => p.x === x && p.y === y);
      if (starts.length > 0) {
        finalGrid[y][x].number = currentNumber;
        starts.forEach(p => {
          numberedEntries.push({ ...p, number: currentNumber });
        });
        currentNumber++;
      }
    }
  }

  return {
    grid: finalGrid,
    entries: numberedEntries,
    size: Math.max(finalWidth, finalHeight),
    topic,
    difficulty
  };
};
