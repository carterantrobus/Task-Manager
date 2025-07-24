// Import the monster data
import { MONSTERS, DEFAULT_THEME, getMonsterById, getNextMonster } from '../frontend/monsterData';

// Update monster state management
const [currentMonsterId, setCurrentMonsterId] = useState(1);
const [monsterHealth, setMonsterHealth] = useState(MONSTERS[0].health);
const [unlockedThemes, setUnlockedThemes] = useState([]);
const [currentTheme, setCurrentTheme] = useState(-1); // -1 for default blue
const monster = getMonsterById(currentMonsterId);

// Load monster progress and themes from localStorage
useEffect(() => {
  const saved = localStorage.getItem('stm_monster_progress');
  if (saved) {
    const { id, health } = JSON.parse(saved);
    setCurrentMonsterId(id);
    setMonsterHealth(health);
  }
  
  const unlocked = localStorage.getItem('stm_unlocked_themes');
  if (unlocked) {
    setUnlockedThemes(JSON.parse(unlocked));
  } else {
    setUnlockedThemes([]); // Start with no themes unlocked
  }
  
  const theme = localStorage.getItem('stm_theme');
  if (theme) setCurrentTheme(Number(theme));
}, []);

// Save monster progress
useEffect(() => {
  localStorage.setItem('stm_monster_progress', JSON.stringify({ 
    id: currentMonsterId, 
    health: monsterHealth 
  }));
}, [currentMonsterId, monsterHealth]);

// Save unlocked themes
useEffect(() => {
  localStorage.setItem('stm_unlocked_themes', JSON.stringify(unlockedThemes));
}, [unlockedThemes]);

// On task completion, damage monster
const handleCompleteTask = async (id) => {
  await toggleComplete(id);
  
  // Only count if marking as complete
  const task = tasks.find(t => t.id === id);
  if (!task || task.completed) return;
  
  // Damage monster
  let newHealth = monsterHealth - 1;
  if (newHealth <= 0) {
    // Monster defeated!
    const nextMonster = getNextMonster(currentMonsterId);
    if (nextMonster) {
      setCurrentMonsterId(nextMonster.id);
      setMonsterHealth(nextMonster.health);
      
      // Only unlock theme every 5 monsters (when id is divisible by 5)
      if (currentMonsterId % 5 === 0) {
        if (!unlockedThemes.includes(currentMonsterId)) {
          setUnlockedThemes([...unlockedThemes, currentMonsterId]);
          
          // Special alert for milestone monsters
          if (currentMonsterId === 50) {
            alert(`🎉 MAJOR ACHIEVEMENT! You defeated the Ancient Dragon! A legendary theme has been unlocked!`);
          } else if (currentMonsterId === 100) {
            alert(`🏆 ULTIMATE VICTORY! You've conquered the Cosmic Devourer! The ultimate theme has been unlocked!`);
          } else {
            alert(`You defeated the ${monster.name}! New theme unlocked!`);
          }
        }
      } else {
        alert(`You defeated the ${monster.name}! Next monster approaching...`);
      }
    } else {
      // Player has defeated all monsters
      alert(`Congratulations! You've defeated all monsters! You are the ultimate task master!`);
    }
  } else {
    setMonsterHealth(newHealth);
  }
};

// Theme classes - use monster theme or default
const theme = currentTheme === -1 ? DEFAULT_THEME : 
  (getMonsterById(currentTheme)?.theme || DEFAULT_THEME);

// Theme switcher UI - only show unlocked themes (every 5th monster)
<div className="flex gap-2 items-center flex-wrap">
  <span className="text-xs">Theme:</span>
  <button
    onClick={() => setCurrentTheme(-1)}
    className={`w-8 h-8 rounded-full border-2 ${currentTheme === -1 ? 'border-blue-700' : 'border-gray-300'} bg-blue-200`}
    title="Switch to default blue theme"
  ></button>
  {unlockedThemes.map(id => {
    const monsterTheme = getMonsterById(id)?.theme;
    if (!monsterTheme) return null;
    
    return (
      <button
        key={id}
        onClick={() => setCurrentTheme(id)}
        className={`w-8 h-8 rounded-full border-2 ${currentTheme === id ? 'border-blue-700' : 'border-gray-300'} ${monsterTheme.bg.split(' ')[0]}`}
        title={`Switch to ${getMonsterById(id).name} theme`}
      >
        {id === 50 && '⭐'}
        {id === 100 && '🏆'}
      </button>
    );
  })}
</div>
