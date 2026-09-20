import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

interface LeaderboardRecord {
  id: string;
  rank?: number;
  username: string;
  realmName: string;
  waveReached: number;
  score: number;
  cultivatorRank: string;
  favoriteGuardian: string;
  timestamp: string;
  isPlayer?: boolean;
  guardiansLineup?: string[];
}

// In-memory persistent store seeded with legendary cultivators
let serverLeaderboard: LeaderboardRecord[] = [
  {
    id: 'c1',
    username: 'Xue_Lian_SwordGod',
    realmName: 'Abyssal Realm',
    waveReached: 48,
    score: 215400,
    cultivatorRank: 'Heavenly Ascension',
    favoriteGuardian: 'Dragon Ascendant',
    timestamp: '1 hour ago',
    guardiansLineup: ['Dragon Ascendant', 'Flame Sovereign', 'Frost Empress']
  },
  {
    id: 'c2',
    username: 'RURU_Immortal',
    realmName: 'Thundercloud Peaks',
    waveReached: 42,
    score: 186900,
    cultivatorRank: 'Soul Transformation',
    favoriteGuardian: 'Thunder Immortal',
    timestamp: '3 hours ago',
    guardiansLineup: ['Thunder Immortal', 'Wind Blade Saint', 'Flame Sovereign']
  },
  {
    id: 'c3',
    username: 'GhostBlade_99',
    realmName: 'Moonlit Bamboo',
    waveReached: 39,
    score: 164200,
    cultivatorRank: 'Nascent Soul',
    favoriteGuardian: 'Wind Blade Saint',
    timestamp: '5 hours ago',
    guardiansLineup: ['Wind Blade Saint', 'Frost Empress', 'Thunder Immortal']
  },
  {
    id: 'c4',
    username: 'LotusMistress_Yao',
    realmName: 'Infernal Caldera',
    waveReached: 36,
    score: 148100,
    cultivatorRank: 'Core Formation',
    favoriteGuardian: 'Frost Empress',
    timestamp: '8 hours ago',
    guardiansLineup: ['Frost Empress', 'Flame Sovereign', 'Dragon Ascendant']
  },
  {
    id: 'c5',
    username: 'IronPavilion_Master',
    realmName: 'Jade Forest Shrine',
    waveReached: 32,
    score: 129000,
    cultivatorRank: 'Foundation Est.',
    favoriteGuardian: 'Flame Sovereign',
    timestamp: '12 hours ago',
    guardiansLineup: ['Flame Sovereign', 'Wind Blade Saint', 'Frost Empress']
  },
  {
    id: 'c6',
    username: 'Azure_Cloud_Walker',
    realmName: 'Thundercloud Peaks',
    waveReached: 28,
    score: 114500,
    cultivatorRank: 'Foundation Est.',
    favoriteGuardian: 'Thunder Immortal',
    timestamp: '1 day ago',
    guardiansLineup: ['Thunder Immortal', 'Dragon Ascendant', 'Frost Empress']
  }
];

// Cloud saves in-memory store
const serverCloudSaves: Record<string, { saveState: any; updatedAt: string }> = {};

// --- API ROUTES ---

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get Leaderboard
app.get('/api/leaderboard', (req: Request, res: Response) => {
  const category = (req.query.category as string) || 'global';
  let sorted = [...serverLeaderboard].sort((a, b) => b.score - a.score);

  if (category === 'endless') {
    sorted = sorted.filter(e => e.realmName.toLowerCase().includes('trial') || e.realmName.toLowerCase().includes('abyssal') || e.waveReached >= 20);
  }

  const withRanks = sorted.map((item, index) => ({
    ...item,
    rank: index + 1
  }));

  res.json({
    success: true,
    leaderboard: withRanks
  });
});

// Post score to Leaderboard
app.post('/api/leaderboard', (req: Request, res: Response) => {
  const { username, realmName, waveReached, score, cultivatorRank, favoriteGuardian } = req.body;

  if (!username || typeof score !== 'number') {
    res.status(400).json({ success: false, error: 'Invalid score submission payload' });
    return;
  }

  // Check if player already exists in leaderboard, update if higher
  const existingIdx = serverLeaderboard.findIndex(e => e.username === username || (e.isPlayer && username.includes('You')));
  const newRecord: LeaderboardRecord = {
    id: existingIdx >= 0 ? serverLeaderboard[existingIdx].id : `c_${Date.now()}`,
    username,
    realmName: realmName || 'Sacred Trial',
    waveReached: waveReached || 1,
    score,
    cultivatorRank: cultivatorRank || 'Spirit Awakening',
    favoriteGuardian: favoriteGuardian || 'Flame Sovereign',
    timestamp: 'Just now',
    isPlayer: true
  };

  if (existingIdx >= 0) {
    if (score >= serverLeaderboard[existingIdx].score) {
      serverLeaderboard[existingIdx] = newRecord;
    }
  } else {
    serverLeaderboard.push(newRecord);
  }

  // Keep top 50
  serverLeaderboard.sort((a, b) => b.score - a.score);
  if (serverLeaderboard.length > 50) {
    serverLeaderboard = serverLeaderboard.slice(0, 50);
  }

  const rank = serverLeaderboard.findIndex(e => e.id === newRecord.id) + 1;

  res.json({
    success: true,
    message: 'Score submitted to Celestial Tablet',
    rank,
    record: newRecord
  });
});

// Asynchronous Competitive Ghost Duel
app.post('/api/duel', (req: Request, res: Response) => {
  const { opponentId, playerScore, playerCultivationRank, playerGuardians } = req.body;
  const opponent = serverLeaderboard.find(e => e.id === opponentId || e.username === opponentId);

  if (!opponent) {
    res.status(404).json({ success: false, error: 'Challenged cultivator not found' });
    return;
  }

  // Calculate duel outcome based on scores, cultivation rank, and tactical match
  const playerBase = playerScore || 10000;
  const opponentBase = opponent.score;
  const scoreRatio = playerBase / (opponentBase || 1);
  const winProbability = Math.min(0.95, Math.max(0.1, 0.45 + (scoreRatio - 1) * 0.5));
  const playerWon = Math.random() < winProbability;

  const shardsReward = playerWon ? Math.min(100, Math.max(30, Math.round(opponent.waveReached * 1.5))) : 10;

  res.json({
    success: true,
    playerWon,
    shardsReward,
    opponentName: opponent.username,
    opponentRank: opponent.cultivatorRank,
    combatLog: playerWon
      ? `Your elemental formation broke through ${opponent.username}'s spirit barrier! Received +${shardsReward} Celestial Shards.`
      : `${opponent.username}'s defensive array held strong against your assault. Refine your Dao and challenge again!`
  });
});

// Cloud Save: Save
app.post('/api/cloud-save', (req: Request, res: Response) => {
  const { userId, saveState } = req.body;
  if (!userId || !saveState) {
    res.status(400).json({ success: false, error: 'userId and saveState required' });
    return;
  }

  serverCloudSaves[userId] = {
    saveState,
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: 'Cultivation progress synchronized to the Celestial Cloud',
    updatedAt: serverCloudSaves[userId].updatedAt
  });
});

// Cloud Save: Load
app.get('/api/cloud-save/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const cloudRecord = serverCloudSaves[userId];

  if (!cloudRecord) {
    res.status(404).json({ success: false, error: 'No cloud record found for this cultivator ID' });
    return;
  }

  res.json({
    success: true,
    saveState: cloudRecord.saveState,
    updatedAt: cloudRecord.updatedAt
  });
});

// --- VITE DEV / PRODUCTION MIDDLEWARE ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Emberfall Engine] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
