import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { MONSTERS, DEFAULT_THEME, getMonsterById, getNextMonster, getThemeUnlockMonsters } from '../monsterData';
import { useAuth } from '../contexts/AuthContext';

const API_URL = "http://monstager.netlify.app/tasks";
const LOCAL_TASKS_KEY = 'stm_tasks';
const LOCAL_PENDING_KEY = 'stm_pending';

const priorityColors = {
    low: "bg-green-100 border-green-200",
    medium: "bg-yellow-100 border-yellow-200",
    high: "bg-red-100 border-red-200"
};

const statusOptions = ["To Do", "In Progress", "Done"];

const MONSTER_PROGRESS_KEY = 'stm_monster_progress';
const UNLOCKED_THEMES_KEY = 'stm_unlocked_themes';

export default function TaskApp() {
    const { getAuthHeaders } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [input, setInput] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [priority, setPriority] = useState("medium");
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [status, setStatus] = useState("To Do");
    const [dueDate, setDueDate] = useState("");
    const [view, setView] = useState('list');
    const [calendarDate, setCalendarDate] = useState(new Date());

    // Monster battle state
    const [monsterId, setMonsterId] = useState(1);
    const [monsterHealth, setMonsterHealth] = useState(MONSTERS[0].health);
    const [unlockedThemes, setUnlockedThemes] = useState([-1]); // -1 for default theme
    const [currentTheme, setCurrentTheme] = useState(-1); // -1 for default blue
    const [isMonsterHit, setIsMonsterHit] = useState(false);
    const [isMonsterDefeated, setIsMonsterDefeated] = useState(false);
    const monster = getMonsterById(monsterId);

    // Sound effects using Web Audio API
    const playSound = (frequency, duration, type = 'sine') => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (error) {
            console.log('Sound not supported:', error);
        }
    };

    const playHitSound = () => {
        playSound(800, 0.1, 'square'); // Sharp hit sound
    };

    const playDefeatSound = () => {
        // Play a victory sequence
        setTimeout(() => playSound(523, 0.2), 0);    // C
        setTimeout(() => playSound(659, 0.2), 200);  // E
        setTimeout(() => playSound(784, 0.3), 400);  // G
    };

    const playThemeUnlockSound = () => {
        // Play a special unlock sequence
        setTimeout(() => playSound(659, 0.15), 0);   // E
        setTimeout(() => playSound(784, 0.15), 150); // G
        setTimeout(() => playSound(1047, 0.2), 300); // C (high)
    };

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await fetch(API_URL, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch tasks");
            const data = await res.json();
            setTasks(data);
            setError("");
        } catch (err) {
            setError("Failed to load tasks. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const addTask = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        setLoading(true);
        const newTaskObj = {
            task: input,
            priority,
            status,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            createdAt: new Date().toISOString()
        };
        if (navigator.onLine) {
            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify(newTaskObj)
                });
                if (!res.ok) throw new Error("Failed to add task");
                const newTask = await res.json();
                setTasks([...tasks, newTask]);
                setInput("");
                setPriority("medium");
                setStatus("To Do");
                setDueDate("");
                setError("");
            } catch (err) {
                setError("Failed to add task. Please try again.");
            } finally {
                setLoading(false);
            }
        } else {
            // Offline: add to local tasks and pending
            const offlineTask = { ...newTaskObj, id: `offline-${Date.now()}` };
            setTasks([...tasks, offlineTask]);
            const pending = getPending();
            pending.push({ type: 'add', task: offlineTask });
            savePending(pending);
            setInput("");
            setPriority("medium");
            setStatus("To Do");
            setDueDate("");
            setError("(Offline) Task will sync when online.");
            setLoading(false);
        }
    };

    const deleteTask = async (id) => {
        if (navigator.onLine) {
            try {
                const res = await fetch(`${API_URL}/${id}`, {
                    method: "DELETE",
                    headers: getAuthHeaders()
                });
                if (!res.ok) throw new Error("Failed to delete task");
                setTasks(tasks.filter(task => task.id !== id));
                setError("");
            } catch (err) {
                setError("Failed to delete task. Please try again.");
            }
        } else {
            // Offline: remove from local tasks and add to pending
            setTasks(tasks.filter(task => task.id !== id));
            const pending = getPending();
            pending.push({ type: 'delete', id });
            savePending(pending);
            setError("(Offline) Delete will sync when online.");
        }
    };

    const toggleComplete = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...task,
                    completed: !task.completed
                })
            });
            if (!res.ok) throw new Error("Failed to update task");
            const updatedTask = await res.json();
            setTasks(tasks.map(t => t.id === id ? updatedTask : t));
            setError("");
        } catch (err) {
            setError("Failed to update task. Please try again.");
        }
    };

    const handleEdit = (id) => {
        setEditingTaskId(id);
        const taskToEdit = tasks.find(task => task.id === id);
        if (taskToEdit) {
            setInput(taskToEdit.task);
            setPriority(taskToEdit.priority);
            setStatus(taskToEdit.status || "To Do");
            setDueDate(taskToEdit.dueDate ? taskToEdit.dueDate.slice(0, 10) : "");
        }
    };

    const saveEdit = async () => {
        if (!input.trim()) return;
        setLoading(true);
        const updatedTaskObj = {
            task: input,
            priority,
            status,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            completed: tasks.find(t => t.id === editingTaskId)?.completed || false
        };
        if (navigator.onLine) {
            try {
                const res = await fetch(`${API_URL}/${editingTaskId}`, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify(updatedTaskObj)
                });
                if (!res.ok) throw new Error("Failed to update task");
                const updatedTask = await res.json();
                setTasks(tasks.map(t => t.id === editingTaskId ? updatedTask : t));
                setEditingTaskId(null);
                setInput("");
                setPriority("medium");
                setStatus("To Do");
                setDueDate("");
                setError("");
            } catch (err) {
                setError("Failed to update task. Please try again.");
            } finally {
                setLoading(false);
            }
        } else {
            // Offline: update local tasks and pending
            setTasks(tasks.map(t => t.id === editingTaskId ? { ...t, ...updatedTaskObj } : t));
            const pending = getPending();
            pending.push({ type: 'edit', id: editingTaskId, task: updatedTaskObj });
            savePending(pending);
            setEditingTaskId(null);
            setInput("");
            setPriority("medium");
            setStatus("To Do");
            setDueDate("");
            setError("(Offline) Edit will sync when online.");
            setLoading(false);
        }
    };

    const cancelEdit = () => {
        setEditingTaskId(null);
        setInput("");
        setPriority("medium");
        setStatus("To Do");
        setDueDate("");
    };

    const filteredTasks = tasks
        .filter(task => {
            if (filter === "completed") return task.completed;
            if (filter === "active") return !task.completed;
            return true;
        })
        .filter(task => 
            task.task.toLowerCase().includes(searchTerm.toLowerCase())
        );

    useEffect(() => {
        fetchTasks();
    }, []);

    // Sync pending changes when back online
    useEffect(() => {
        window.addEventListener('online', syncPending);
        return () => window.removeEventListener('online', syncPending);
    }, [tasks]);

    // On mount, load from localStorage if offline
    useEffect(() => {
        if (!navigator.onLine) {
            const cached = localStorage.getItem(LOCAL_TASKS_KEY);
            if (cached) setTasks(JSON.parse(cached));
        }
    }, []);

    // Save tasks to localStorage on every change
    useEffect(() => {
        localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
    }, [tasks]);

    // Save pending changes to localStorage
    function savePending(pending) {
        localStorage.setItem(LOCAL_PENDING_KEY, JSON.stringify(pending));
    }
    function getPending() {
        return JSON.parse(localStorage.getItem(LOCAL_PENDING_KEY) || '[]');
    }

    // Sync pending changes to backend
    async function syncPending() {
        if (!navigator.onLine) return;
        const pending = getPending();
        if (pending.length === 0) return;
        for (const change of pending) {
            try {
                if (change.type === 'add') {
                    await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(change.task)
                    });
                } else if (change.type === 'edit') {
                    await fetch(`${API_URL}/${change.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(change.task)
                    });
                } else if (change.type === 'delete') {
                    await fetch(`${API_URL}/${change.id}`, {
                        method: 'DELETE' });
                }
            } catch (e) { /* ignore, will retry later */ }
        }
        localStorage.removeItem(LOCAL_PENDING_KEY);
        fetchTasks();
    }

    // Load monster progress and themes from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(MONSTER_PROGRESS_KEY);
        if (saved) {
            const { id, health } = JSON.parse(saved);
            setMonsterId(id);
            setMonsterHealth(health);
        }
        const unlocked = localStorage.getItem(UNLOCKED_THEMES_KEY);
        if (unlocked) setUnlockedThemes(JSON.parse(unlocked));
        const theme = localStorage.getItem('stm_theme');
        if (theme) setCurrentTheme(Number(theme));
    }, []);
    // Save monster progress
    useEffect(() => {
        localStorage.setItem(MONSTER_PROGRESS_KEY, JSON.stringify({ id: monsterId, health: monsterHealth }));
    }, [monsterId, monsterHealth]);
    // Save unlocked themes
    useEffect(() => {
        localStorage.setItem(UNLOCKED_THEMES_KEY, JSON.stringify(unlockedThemes));
    }, [unlockedThemes]);
    // Save theme
    useEffect(() => {
        localStorage.setItem('stm_theme', currentTheme);
    }, [currentTheme]);

    const [showThemeModal, setShowThemeModal] = useState(false);
    const themeModalRef = useRef(null);

    // Close modal on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (themeModalRef.current && !themeModalRef.current.contains(event.target)) {
                setShowThemeModal(false);
            }
        }
        if (showThemeModal) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showThemeModal]);

    // On task completion, damage monster
    const handleCompleteTask = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task || task.completed) return;
        // Update status to 'Done' when completing
        if (navigator.onLine) {
            try {
                const res = await fetch(`${API_URL}/${id}`, {
                    method: "PUT",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...task, completed: true, status: 'Done' })
                });
                if (!res.ok) throw new Error("Failed to update task");
                const updatedTask = await res.json();
                setTasks(tasks.map(t => t.id === id ? updatedTask : t));
            } catch (err) {
                setError("Failed to update task. Please try again.");
            }
        } else {
            // Offline: update local tasks and pending
            setTasks(tasks.map(t => t.id === id ? { ...t, completed: true, status: 'Done' } : t));
            const pending = getPending();
            pending.push({ type: 'edit', id, task: { ...task, completed: true, status: 'Done' } });
            savePending(pending);
            setError("(Offline) Completion will sync when online.");
        }
        // Monster logic with animations and sounds
        let newHealth = monsterHealth - 1;
        if (newHealth <= 0) {
            // Monster defeated!
            setIsMonsterDefeated(true);
            playDefeatSound();
            // Unlock theme for the monster just defeated (current monster)
            const shouldUnlockTheme = (monsterId % 5 === 0 || monsterId === 1) && !unlockedThemes.includes(monsterId);
            if (shouldUnlockTheme) {
                setUnlockedThemes([...unlockedThemes, monsterId]);
                playThemeUnlockSound();
            }
            setTimeout(() => {
                const nextMonster = getNextMonster(monsterId);
                if (nextMonster) {
                    setMonsterId(nextMonster.id);
                    setMonsterHealth(nextMonster.health);
                    setIsMonsterDefeated(false);
                    // Special milestone messages
                    if (nextMonster.id === 50) {
                        alert(`🎉 MILESTONE! You defeated the ${monster.name}! Ancient Dragon theme unlocked! 🌟`);
                    } else if (nextMonster.id === 100) {
                        alert(`🏆 ULTIMATE ACHIEVEMENT! You defeated the ${monster.name}! Cosmic Devourer theme unlocked! ⭐`);
                    } else if (shouldUnlockTheme) {
                        alert(`You defeated the ${monster.name}! New theme unlocked!`);
                    } else {
                        alert(`You defeated the ${monster.name}!`);
                    }
                } else {
                    // All monsters defeated!
                    alert(`🎊 CONGRATULATIONS! You've defeated all 100 monsters! You are the ultimate task master! 🏆`);
                }
            }, 1000); // Wait for defeat animation
        } else {
            setMonsterHealth(newHealth);
            // Hit animation and sound
            setIsMonsterHit(true);
            playHitSound();
            setTimeout(() => setIsMonsterHit(false), 300);
        }
    };

    // View Switcher
    const viewButtons = [
        { key: 'list', label: 'List' },
        { key: 'board', label: 'Board' },
        { key: 'status', label: 'Status' },
        { key: 'calendar', label: 'Calendar' },
    ];

    // List View
    function ListView({ tasks, ...props }) {
        return (
            <ul className="space-y-3">
                {tasks.map((task) => props.renderTask(task))}
            </ul>
        );
    }

    // Board View (Kanban)
    function BoardView({ tasks, ...props }) {
        const statuses = statusOptions;
        return (
            <div className="flex gap-4 overflow-x-auto">
                {statuses.map(status => (
                    <div key={status} className="flex-1 min-w-[220px] bg-gray-100 rounded-md p-2">
                        <h3 className="font-bold text-center mb-2">{status}</h3>
                        {tasks.filter(t => t.status === status).length === 0 ? (
                            <div className="text-gray-400 text-center">No tasks</div>
                        ) : (
                            tasks.filter(t => t.status === status).map(task => props.renderTask(task))
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Status View (grouped, not board)
    function StatusView({ tasks, ...props }) {
        const statuses = statusOptions;
        return (
            <div>
                {statuses.map(status => (
                    <div key={status} className="mb-6">
                        <h3 className="font-semibold mb-2">{status}</h3>
                        <ul className="space-y-2">
                            {tasks.filter(t => t.status === status).length === 0 ? (
                                <li className="text-gray-400">No tasks</li>
                            ) : (
                                tasks.filter(t => t.status === status).map(task => props.renderTask(task))
                            )}
                        </ul>
                    </div>
                ))}
            </div>
        );
    }

    // Calendar View
    function CalendarView({ tasks, ...props }) {
        // Map dueDates to tasks
        const dateTasks = {};
        tasks.forEach(task => {
            if (task.dueDate) {
                const dateKey = new Date(task.dueDate).toDateString();
                if (!dateTasks[dateKey]) dateTasks[dateKey] = [];
                dateTasks[dateKey].push(task);
            }
        });
        return (
            <div className="flex flex-col md:flex-row gap-6">
                <Calendar
                    onChange={setCalendarDate}
                    value={calendarDate}
                    tileContent={({ date, view }) => {
                        const key = date.toDateString();
                        return dateTasks[key] ? (
                            <div className="bg-blue-200 rounded-full w-2 h-2 mx-auto mt-1"></div>
                        ) : null;
                    }}
                />
                <div className="flex-1">
                    <h3 className="font-semibold mb-2">Tasks on {calendarDate.toLocaleDateString()}</h3>
                    <ul className="space-y-2">
                        {(dateTasks[calendarDate.toDateString()] || []).length === 0 ? (
                            <li className="text-gray-400">No tasks</li>
                        ) : (
                            dateTasks[calendarDate.toDateString()].map(task => props.renderTask(task))
                        )}
                    </ul>
                </div>
            </div>
        );
    }

    // RenderTask helper to keep task rendering logic DRY
    function renderTask(task) {
        return (
            <motion.li
                key={task.id}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`${priorityColors[task.priority]} p-4 rounded-lg border flex items-center gap-4 transition-all duration-200`}
            >
                <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleCompleteTask(task.id)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={task.completed}
                />
                {editingTaskId === task.id ? (
                    <div className="flex flex-wrap items-center gap-2 w-full">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            className="flex-1 min-w-[120px] px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={saveEdit}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200 font-semibold"
                            disabled={loading}
                            style={{ minWidth: 80 }}
                        >
                            {loading ? "Saving..." : "Save"}
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors duration-200 font-semibold"
                            disabled={loading}
                            style={{ minWidth: 80 }}
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <>
                        <span className={`flex-1 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                            {task.task}
                        </span>
                        <span className="text-sm text-gray-500">
                            {task.priority}
                        </span>
                        <span className="text-sm text-gray-500">
                            {task.status || "To Do"}
                        </span>
                        <span className="text-sm text-gray-500">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                        </span>
                        <button
                            onClick={() => handleEdit(task.id)}
                            className={`text-blue-500 hover:text-blue-700 transition-colors duration-200 ${task.status === 'Done' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Edit task"
                            disabled={task.status === 'Done'}
                        >
                            ✏️
                        </button>
                        <button
                            onClick={() => deleteTask(task.id)}
                            className="text-red-500 hover:text-red-700 transition-colors duration-200"
                            title="Delete task"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </>
                )}
            </motion.li>
        );
    }

    // Theme classes
    const theme = currentTheme === -1 ? DEFAULT_THEME : getMonsterById(currentTheme)?.theme || DEFAULT_THEME;
    const headerClass = `p-6 bg-gradient-to-r ${theme.header}`;
    const bgClass = `${theme.bg}`;
    const textClass = theme.text || '';
    const barClass = theme.bar || 'bg-pink-500';

    // Theme-aware button colors
    const getThemeColors = () => {
        if (currentTheme === -1) {
            return {
                primary: 'blue',
                bg: 'bg-blue-300',
                hover: 'hover:bg-blue-200',
                active: 'bg-white text-blue-600',
                text: 'text-white'
            };
        }
        const monsterTheme = getMonsterById(currentTheme);
        if (!monsterTheme?.theme) return {
            primary: 'blue',
            bg: 'bg-blue-300',
            hover: 'hover:bg-blue-200',
            active: 'bg-white text-blue-600',
            text: 'text-white'
        };
        
        // Extract color from header gradient
        const headerClass = monsterTheme.theme.header;
        if (headerClass.includes('green')) return { primary: 'green', bg: 'bg-green-300', hover: 'hover:bg-green-200', active: 'bg-white text-green-600', text: 'text-white' };
        if (headerClass.includes('red')) return { primary: 'red', bg: 'bg-red-300', hover: 'hover:bg-red-200', active: 'bg-white text-red-600', text: 'text-white' };
        if (headerClass.includes('purple')) return { primary: 'purple', bg: 'bg-purple-300', hover: 'hover:bg-purple-200', active: 'bg-white text-purple-600', text: 'text-white' };
        if (headerClass.includes('yellow')) return { primary: 'yellow', bg: 'bg-yellow-300', hover: 'hover:bg-yellow-200', active: 'bg-white text-yellow-600', text: 'text-white' };
        if (headerClass.includes('cyan')) return { primary: 'cyan', bg: 'bg-cyan-300', hover: 'hover:bg-cyan-200', active: 'bg-white text-cyan-600', text: 'text-white' };
        if (headerClass.includes('amber')) return { primary: 'amber', bg: 'bg-amber-300', hover: 'hover:bg-amber-200', active: 'bg-white text-amber-600', text: 'text-white' };
        if (headerClass.includes('lime')) return { primary: 'lime', bg: 'bg-lime-300', hover: 'hover:bg-lime-200', active: 'bg-white text-lime-600', text: 'text-white' };
        if (headerClass.includes('emerald')) return { primary: 'emerald', bg: 'bg-emerald-300', hover: 'hover:bg-emerald-200', active: 'bg-white text-emerald-600', text: 'text-white' };
        if (headerClass.includes('indigo')) return { primary: 'indigo', bg: 'bg-indigo-300', hover: 'hover:bg-indigo-200', active: 'bg-white text-indigo-600', text: 'text-white' };
        if (headerClass.includes('violet')) return { primary: 'violet', bg: 'bg-violet-300', hover: 'hover:bg-violet-200', active: 'bg-white text-violet-600', text: 'text-white' };
        if (headerClass.includes('sky')) return { primary: 'sky', bg: 'bg-sky-300', hover: 'hover:bg-sky-200', active: 'bg-white text-sky-600', text: 'text-white' };
        if (headerClass.includes('teal')) return { primary: 'teal', bg: 'bg-teal-300', hover: 'hover:bg-teal-200', active: 'bg-white text-teal-600', text: 'text-white' };
        if (headerClass.includes('stone')) return { primary: 'stone', bg: 'bg-stone-300', hover: 'hover:bg-stone-200', active: 'bg-white text-stone-600', text: 'text-white' };
        if (headerClass.includes('rose')) return { primary: 'rose', bg: 'bg-rose-300', hover: 'hover:bg-rose-200', active: 'bg-white text-rose-600', text: 'text-white' };
        if (headerClass.includes('slate')) return { primary: 'slate', bg: 'bg-slate-300', hover: 'hover:bg-slate-200', active: 'bg-white text-slate-600', text: 'text-white' };
        
        return { primary: 'blue', bg: 'bg-blue-300', hover: 'hover:bg-blue-200', active: 'bg-white text-blue-600', text: 'text-white' };
    };
    
    const themeColors = getThemeColors();

    return (
        <div className={`max-w-full w-full mx-auto ${bgClass} min-h-screen ${textClass}`}>
            <div className="bg-white rounded-md">
                 <div className={headerClass}>
                    {/* Monster Battle UI with animations */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="font-bold text-lg mb-1">{monster.name}</div>
                        {/* Monster Image with animations */}
                        <motion.div 
                            className="text-6xl mb-4"
                            animate={isMonsterHit ? {
                                x: [-10, 10, -10, 10, 0],
                                scale: [1, 1.1, 1],
                                filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                            } : isMonsterDefeated ? {
                                scale: [1, 1.5, 0],
                                rotate: [0, 360],
                                opacity: [1, 0]
                            } : {
                                scale: 1,
                                opacity: 1
                            }}
                            transition={{ duration: isMonsterDefeated ? 1 : 0.3 }}
                        >
                            {monster.image && monster.image.startsWith('/assets') ? (
                                <img src={monster.image} alt={monster.name} className="w-20 h-20 object-contain mx-auto" />
                            ) : (
                                <span>{monster.image || '👾'}</span>
                            )}
                        </motion.div>
                        <div className="w-full max-w-xs bg-gray-200 rounded-full h-6 mb-2">
                            <motion.div 
                                className={`${barClass} h-6 rounded-full`}
                                initial={{ width: `${(monsterHealth / monster.health) * 100}%` }}
                                animate={{ width: `${(monsterHealth / monster.health) * 100}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                        </div>
                        <div className="text-sm mb-2">{monsterHealth} / {monster.health} HP</div>
                        {/* Monster Battle UI theme switcher */}
                        <div className="flex gap-2 items-center">
                            <span className="text-xs">Theme:</span>
                            <button
                                onClick={() => setShowThemeModal(true)}
                                className={`w-8 h-8 rounded-full border-2 ${currentTheme === -1 ? 'border-blue-700' : 'border-gray-300'} bg-blue-200`}
                                title="Show theme collection"
                            ></button>
                        </div>
                        {/* Theme Modal */}
                        {showThemeModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                                <div ref={themeModalRef} className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
                                    <h2 className="text-xl font-bold mb-4 text-center">Your Themes</h2>
                                    <div className="grid grid-cols-4 gap-4 mb-4">
                                        <button
                                            onClick={() => { setCurrentTheme(-1); setShowThemeModal(false); }}
                                            className={`w-12 h-12 rounded-full border-4 ${currentTheme === -1 ? 'border-blue-700' : 'border-gray-300'} bg-blue-200 flex items-center justify-center`}
                                            title="Default Blue Theme"
                                        >
                                            <span className="text-xs">Blue</span>
                                        </button>
                                        {unlockedThemes.filter(id => id !== -1).map(id => {
                                            const monsterTheme = getMonsterById(id);
                                            return (
                                                <button
                                                    key={id}
                                                    onClick={() => { setCurrentTheme(id); setShowThemeModal(false); }}
                                                    className={`w-12 h-12 rounded-full border-4 ${currentTheme === id ? 'border-blue-700' : 'border-gray-300'} ${monsterTheme?.theme?.bg || 'bg-gray-200'} flex items-center justify-center`}
                                                    title={monsterTheme?.name || 'Unknown'}
                                                >
                                                    {monsterTheme?.image && monsterTheme.image.startsWith('/assets') ? (
                                                        <img src={monsterTheme.image} alt={monsterTheme.name} className="w-8 h-8 object-contain mx-auto" />
                                                    ) : (
                                                        <span className="text-2xl">{monsterTheme?.image || '🎨'}</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setShowThemeModal(false)}
                                        className="block mx-auto mt-2 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* View Switcher - moved here for visibility */}
                    <div className="flex justify-center gap-2 mb-6 z-10 relative">
                        {viewButtons.map(btn => (
                            <button
                                key={btn.key}
                                onClick={() => {
                                    console.log('Switching to view:', btn.key);
                                    setView(btn.key);
                                }}
                                className={`px-4 py-2 rounded-md font-semibold transition-colors duration-200 ${view === btn.key ? themeColors.active : `${themeColors.bg} ${themeColors.text} ${themeColors.hover}`}`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                    
                    {/* Search and Filter */}
                    <div className="flex gap-4 mb-4">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Search tasks..."
                        />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    {/* Add Task Form */}
                    <form onSubmit={addTask} className="flex gap-2 flex-wrap py-2">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            className="flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add a task..."
                        />
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                            className="bg-white text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 font-semibold"
                            disabled={loading}
                        >
                            {loading ? "Adding..." : "Add"}
                        </button>
                    </form>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    {loading && tasks.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-500">Loading tasks...</p>
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No tasks yet. Add your first task above!</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {/* Render selected view */}
                            {view === 'list' && (
                                <ListView tasks={filteredTasks} renderTask={renderTask} />
                            )}
                            {view === 'board' && (
                                <BoardView tasks={filteredTasks} renderTask={renderTask} />
                            )}
                            {view === 'status' && (
                                <StatusView tasks={filteredTasks} renderTask={renderTask} />
                            )}
                            {view === 'calendar' && (
                                <CalendarView tasks={filteredTasks} renderTask={renderTask} />
                            )}
                            {/* Fallback to list view if no view is selected */}
                            {!view && (
                                <ListView tasks={filteredTasks} renderTask={renderTask} />
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}