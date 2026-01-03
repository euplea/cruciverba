
import { RawEntry, PlacedEntry, CrosswordData, Difficulty, GridCell } from "../types";

export const generateCrosswordLayout = (
  rawEntries: RawEntry[], 
  size: number,
  topic: string,
  difficulty: Difficulty
): CrosswordData => {
  // Sorting words by length to place longer words first (better for intersections)
  const sorted = [...rawEntries].sort((a, b) => b.word.length - a.word.length);
  const placed: PlacedEntry[] = [];
  
  const grid: (string | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));

  const canPlace = (word: string, x: number, y: number, dir: 'H' | 'V') => {
    if (dir === 'H') {
      if (x + word.length > size) return false;
      for (let i = 0; i < word.length; i++) {
        const current = grid[y][x + i];
        if (current !== null && current !== word[i]) return false;
        
        // Check adjacent cells to avoid "ghost" words
        if (current === null) {
          // Check top/bottom
          if (y > 0 && grid[y - 1][x + i] !== null) {
              // Only allowed if it's an intersection (which we handle by 'current !== null' logic)
              // This is a simplified check for a 'criss-cross' style
          }
        }
      }
    } else {
      if (y + word.length > size) return false;
      for (let i = 0; i < word.length; i++) {
        const current = grid[y + i][x];
        if (current !== null && current !== word[i]) return false;
      }
    }
    return true;
  };

  const place = (entry: RawEntry, x: number, y: number, dir: 'H' | 'V', num: number) => {
    if (dir === 'H') {
      for (let i = 0; i < entry.word.length; i++) grid[y][x + i] = entry.word[i];
    } else {
      for (let i = 0; i < entry.word.length; i++) grid[y + i][x] = entry.word[i];
    }
    placed.push({ ...entry, x, y, direction: dir, number: num });
  };

  let wordCount = 1;
  // Place first word in middle
  const first = sorted[0];
  place(first, Math.floor((size - first.word.length) / 2), Math.floor(size / 2), 'H', wordCount++);

  // Try to place others by intersection
  for (let i = 1; i < sorted.length; i++) {
    const entry = sorted[i];
    let found = false;

    // Try all placed words for intersection
    for (const p of placed) {
      for (let j = 0; j < p.word.length; j++) {
        for (let k = 0; k < entry.word.length; k++) {
          if (p.word[j] === entry.word[k]) {
            // Intersection found at p index j and entry index k
            const newDir = p.direction === 'H' ? 'V' : 'H';
            const newX = newDir === 'H' ? p.x + j - k : p.x + j;
            const newY = newDir === 'H' ? p.y : p.y + j - k;

            if (newX >= 0 && newY >= 0 && canPlace(entry.word, newX, newY, newDir)) {
              // Also check if we aren't creating unwanted neighbors
              // (Simplified for this version)
              place(entry, newX, newY, newDir, wordCount++);
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
      if (found) break;
    }
  }

  // Convert to final grid format
  const finalGrid: GridCell[][] = Array(size).fill(null).map((_, y) => 
    Array(size).fill(null).map((_, x) => ({
      char: grid[y][x],
      isBlack: grid[y][x] === null,
      userInput: '',
      solutionVisible: false
    }))
  );

  // Add numbers to grid cells
  placed.forEach(p => {
    finalGrid[p.y][p.x].number = p.number;
  });

  return {
    grid: finalGrid,
    entries: placed,
    size,
    topic,
    difficulty
  };
};
