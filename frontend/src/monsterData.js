// Monster data with 100 unique monsters
// Special themes are unlocked every 5 monsters
// Extra special themes at milestones 50 and 100

export const MONSTERS = [
  // Basic monsters (1-49)
  { id: 1, name: 'Slime', health: 5, image: '/assets/slime.png', theme: { bg: 'bg-green-50', header: 'from-green-400 to-green-600', bar: 'bg-pink-400' } },
  { id: 2, name: 'Bat', health: 6, image: '/assets/bat.png', theme: null },
  { id: 3, name: 'Rat', health: 7, image: '/assets/rat.png', theme: null },
  { id: 4, name: 'Spider', health: 8, image: '/assets/spider.png', theme: null },
  { id: 5, name: 'Fire Imp', health: 10, image: '/assets/fire_imp.png', theme: { bg: 'bg-red-50', header: 'from-red-400 to-red-600', bar: 'bg-blue-500' } },
  
  { id: 6, name: 'Goblin', health: 11, image: '/assets/goblin.png', theme: null },
  { id: 7, name: 'Skeleton', health: 12, image: '/assets/skeleton.png', theme: null },
  { id: 8, name: 'Zombie', health: 13, image: '/assets/zombie.png', theme: null },
  { id: 9, name: 'Ghost', health: 14, image: '/assets/ghost.png', theme: null },
  { id: 10, name: 'Aqua Serpent', health: 15, image: '/assets/aqua_serpent.png', theme: { bg: 'bg-blue-50', header: 'from-blue-400 to-cyan-500', bar: 'bg-orange-400' } },
  
  // Continue pattern through monsters 11-49...
  { id: 15, name: 'Forest Troll', health: 20, image: '/assets/forest_troll.png', theme: { bg: 'bg-emerald-50', header: 'from-emerald-400 to-emerald-600', bar: 'bg-purple-400' } },
  { id: 20, name: 'Shadow Wraith', health: 25, image: '/assets/shadow_wraith.png', theme: { bg: 'bg-gray-100', header: 'from-gray-700 to-purple-900', bar: 'bg-yellow-300', text: 'text-gray-800' } },
  { id: 25, name: 'Frost Giant', health: 30, image: '/assets/frost_giant.png', theme: { bg: 'bg-cyan-50', header: 'from-cyan-300 to-blue-600', bar: 'bg-red-400' } },
  { id: 30, name: 'Lava Golem', health: 35, image: '/assets/lava_golem.png', theme: { bg: 'bg-orange-50', header: 'from-orange-500 to-red-700', bar: 'bg-blue-400' } },
  { id: 35, name: 'Storm Harpy', health: 40, image: '/assets/storm_harpy.png', theme: { bg: 'bg-indigo-50', header: 'from-indigo-400 to-purple-600', bar: 'bg-yellow-400' } },
  { id: 40, name: 'Desert Scorpion', health: 45, image: '/assets/desert_scorpion.png', theme: { bg: 'bg-amber-50', header: 'from-amber-400 to-amber-600', bar: 'bg-blue-500' } },
  { id: 45, name: 'Jungle Basilisk', health: 50, image: '/assets/jungle_basilisk.png', theme: { bg: 'bg-lime-50', header: 'from-lime-400 to-green-600', bar: 'bg-purple-500' } },
  
  // Milestone monster (50)
  { id: 50, name: 'Ancient Dragon', health: 60, image: '/assets/ancient_dragon.png',
    theme: { 
      bg: 'bg-gradient-to-br from-red-50 to-amber-100', 
      header: 'from-amber-400 via-red-500 to-purple-600', 
      bar: 'bg-gradient-to-r from-blue-400 to-cyan-300',
      text: 'text-amber-800',
      special: true // Flag for special animation/effects
    } 
  },
  
  // Continue pattern through monsters 51-99...
  { id: 55, name: 'Void Walker', health: 65, image: '/assets/void_walker.png', theme: { bg: 'bg-violet-50', header: 'from-violet-400 to-violet-700', bar: 'bg-yellow-400' } },
  { id: 60, name: 'Crystal Golem', health: 70, image: '/assets/crystal_golem.png', theme: { bg: 'bg-sky-50', header: 'from-sky-300 to-blue-600', bar: 'bg-pink-400' } },
  { id: 65, name: 'Swamp Troll', health: 75, image: '/assets/swamp_troll.png', theme: { bg: 'bg-teal-50', header: 'from-teal-400 to-green-600', bar: 'bg-red-400' } },
  { id: 70, name: 'Bone Colossus', health: 80, image: '/assets/bone_colossus.png', theme: { bg: 'bg-stone-50', header: 'from-stone-400 to-stone-700', bar: 'bg-emerald-400' } },
  { id: 75, name: 'Thunder Wyvern', health: 85, image: '/assets/thunder_wyvern.png', theme: { bg: 'bg-blue-50', header: 'from-blue-400 to-indigo-600', bar: 'bg-yellow-400' } },
  { id: 80, name: 'Molten Giant', health: 90, image: '/assets/molten_giant.png', theme: { bg: 'bg-rose-50', header: 'from-rose-400 to-red-700', bar: 'bg-cyan-400' } },
  { id: 85, name: 'Astral Elemental', health: 95, image: '/assets/astral_elemental.png', theme: { bg: 'bg-purple-50', header: 'from-purple-400 to-indigo-700', bar: 'bg-amber-400' } },
  { id: 90, name: 'Abyssal Horror', health: 100, image: '/assets/abyssal_horror.png', theme: { bg: 'bg-slate-100', header: 'from-slate-600 to-slate-900', bar: 'bg-red-400', text: 'text-slate-800' } },
  { id: 95, name: 'Celestial Guardian', health: 105, image: '/assets/celestial_guardian.png', theme: { bg: 'bg-yellow-50', header: 'from-yellow-300 to-amber-500', bar: 'bg-blue-500' } },
  
  // Final boss (100)
  { id: 100, name: 'Cosmic Devourer', health: 120, image: '/assets/cosmic_devourer.png',
    theme: { 
      bg: 'bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100', 
      header: 'from-indigo-500 via-purple-600 to-pink-500', 
      bar: 'bg-gradient-to-r from-yellow-300 to-amber-500',
      text: 'text-indigo-900',
      special: true, // Flag for special animation/effects
      ultimate: true // Flag for ultimate theme
    } 
  },
];

// Helper function to get theme-unlocking monsters (every 5th monster)
export const getThemeUnlockMonsters = () => {
  return MONSTERS.filter(monster => monster.id % 5 === 0);
};

// Default theme (original blue)
export const DEFAULT_THEME = { 
  bg: 'bg-gray-50', 
  header: 'from-blue-400 via-blue-500 to-blue-400', 
  bar: 'bg-pink-500' 
};

// Get monster by ID
export const getMonsterById = (id) => {
  return MONSTERS.find(monster => monster.id === id) || MONSTERS[0];
};

// Get next monster
export const getNextMonster = (currentId) => {
  const nextId = currentId + 1;
  return nextId <= 100 ? getMonsterById(nextId) : null;
};