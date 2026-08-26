// Losowa kolejność utworów bez powtórek: pula gra się w całości, potem jest
// tasowana ponownie. Generator losowy jest wstrzykiwany, żeby testy mogły
// sprawdzać kolejność deterministycznie.
function usableTracks(tracks) {
  if (!Array.isArray(tracks)) return [];
  return tracks.filter((track) => typeof track === "string" && track.trim());
}

function pick(random, limit) {
  const value = Number(random());
  if (!Number.isFinite(value) || value < 0 || value >= 1) return 0;
  return Math.floor(value * limit);
}

function shuffle(tracks, random) {
  const order = [...tracks];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = pick(random, index + 1);
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}

export function createPlaylist(tracks, random = Math.random) {
  const pool = usableTracks(tracks);
  let queue = [];
  let previous = null;

  function refill() {
    queue = shuffle(pool, random);
    // Bez tej poprawki dwie rundy mogłyby się skleić tym samym utworem.
    if (pool.length > 1 && queue[0] === previous) {
      [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
    }
  }

  return {
    next() {
      if (pool.length === 0) return null;
      if (queue.length === 0) refill();
      previous = queue.shift();
      return previous;
    },
  };
}
