import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { MONSTERS, DEFAULT_THEME, getMonsterById, getNextMonster } from '../monsterData';
import { useAuth } from '../contexts/AuthContext';
import { PencilSimple, Trash } from 'phosphor-react';

const API_URL = "https://api.monstager.xyz/tasks";
const LOCAL_TASKS_KEY = 'stm_tasks';
const LOCAL_PENDING_KEY = 'stm_pending';

const priorityColors = {
    low: "bg-green-100 border-green-200",
    medium: "bg-yellow-100 border-yellow-200",
    high: "bg-red-100 border-red-200"
};

const statusOptions = ["To Do", "In Progress", "Done"];

const MONSTER_PROGRESS_KEY = 'stm_monster_progress';

export default function TaskApp() {
    const { getAuthHeaders } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [input, setInput] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [priority, setPriority] = useState("medium");
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [status, setStatus] = useState("To Do");
    const [dueDate, setDueDate] = useState("");
    const [view, setView] = useState('list');
    const [calendarDate, setCalendarDate] = useState(new Date());

    const [monsterId, setMonsterId] = useState(1);
    const [monsterHealth, setMonsterHealth] = useState(MONSTERS[0].health);
    // eslint-disable-next-line no-unused-vars
    const [unlockedThemes, setUnlockedThemes] = useState([-1]); // -1 for default theme
    // eslint-disable-next-line no-unused-vars
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

    const fetchTasks = useCallback(async () => {
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
    }, [getAuthHeaders]);

    const addTask = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        setLoading(true);
        const newTaskObj = {
            task: input,
            priority,
            status,
            dueDate: null,
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

    const filteredTasks = tasks
        .filter(task => {
            if (filter === "completed") return task.completed;
            if (filter === "active") return !task.completed;
            return true;
        })
        .filter(task => 
            task.task.toLowerCase().includes(searchTerm.toLowerCase())
        );

    // Save pending changes to localStorage
    function savePending(pending) {
        localStorage.setItem(LOCAL_PENDING_KEY, JSON.stringify(pending));
    }
    function getPending() {
        return JSON.parse(localStorage.getItem(LOCAL_PENDING_KEY) || '[]');
    }

    // Sync pending changes to backend
    const syncPending = useCallback(async () => {
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
    }, [fetchTasks]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Sync pending changes when back online
    useEffect(() => {
        window.addEventListener('online', syncPending);
        return () => window.removeEventListener('online', syncPending);
    }, [syncPending]);

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

    // Load monster progress from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(MONSTER_PROGRESS_KEY);
        if (saved) {
            const { id, health } = JSON.parse(saved);
            setMonsterId(id);
            setMonsterHealth(health);
        }
    }, []);

    // Save monster progress
    useEffect(() => {
        localStorage.setItem(MONSTER_PROGRESS_KEY, JSON.stringify({ id: monsterId, health: monsterHealth }));
    }, [monsterId, monsterHealth]);

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

    // Handle task completion - updates task status and triggers monster battle
    const handleCompleteTask = async (id) => {
        const taskToComplete = tasks.find(t => t.id === id);
        if (!taskToComplete) return;
        
        const updatedTask = { ...taskToComplete, completed: !taskToComplete.completed };
        
        if (navigator.onLine) {
            try {
                const res = await fetch(`${API_URL}/${id}`, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ ...updatedTask, status: 'Done' })
                });
                if (!res.ok) throw new Error("Failed to update task");
                const data = await res.json();
                setTasks(tasks.map(t => t.id === id ? data : t));
            } catch (err) {
                setError("Failed to update task. Please try again.");
                return; // Exit early on error
            }
        } else {
            // Offline: update local tasks and pending
            const offlineUpdate = { ...updatedTask, status: 'Done' };
            setTasks(tasks.map(t => t.id === id ? offlineUpdate : t));
            const pending = getPending();
            pending.push({ type: 'edit', id, task: offlineUpdate });
            savePending(pending);
            setError("(Offline) Completion will sync when online.");
        }
        // Monster logic with animations and sounds
        let newHealth = monsterHealth - 1;
        if (newHealth <= 0) {
            // Monster defeated!
            setIsMonsterDefeated(true);
            playDefeatSound();
            setTimeout(() => {
                const nextMonster = getNextMonster(monsterId);
                if (nextMonster) {
                    setMonsterId(nextMonster.id);
                    setMonsterHealth(nextMonster.health);
                    setIsMonsterDefeated(false);
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
                        <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">{status}</h3>
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
                    <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Tasks on {calendarDate.toLocaleDateString()}</h3>
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
    };

    // Task Item Component
    const TaskItem = React.memo(({ task, onComplete }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editData, setEditData] = useState({
            task: task.task,
            priority: task.priority,
            status: task.status || "To Do",
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
        });

        const handleSave = async () => {
            if (!editData.task.trim()) return;
            const updatedTaskObj = {
                task: editData.task,
                priority: editData.priority,
                status: editData.status,
                dueDate: editData.dueDate ? new Date(editData.dueDate).toISOString() : null,
                completed: task.completed || false
            };
            
            if (navigator.onLine) {
                try {
                    const res = await fetch(`${API_URL}/${task.id}`, {
                        method: "PUT",
                        headers: getAuthHeaders(),
                        body: JSON.stringify(updatedTaskObj)
                    });
                    if (!res.ok) throw new Error("Failed to update task");
                    const updatedTask = await res.json();
                    setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
                    setIsEditing(false);
                } catch (err) {
                    setError("Failed to update task. Please try again.");
                }
            } else {
                setTasks(tasks.map(t => t.id === task.id ? { ...t, ...updatedTaskObj } : t));
                const pending = getPending();
                pending.push({ type: 'edit', id: task.id, task: updatedTaskObj });
                savePending(pending);
                setIsEditing(false);
                setError("(Offline) Edit will sync when online.");
            }
        };

        const handleCancel = () => {
            setIsEditing(false);
            setEditData({
                task: task.task,
                priority: task.priority,
                status: task.status || "To Do",
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
            });
        };

        if (isEditing) {
            return (
                <motion.li
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`${priorityColors[task.priority]} p-4 rounded-lg border flex items-center gap-4 transition-all duration-200`}
                >
                    <div className="flex flex-wrap items-center gap-2 w-full">
                        <input
                            value={editData.task}
                            onChange={e => setEditData(prev => ({ ...prev, task: e.target.value }))}
                            className="flex-1 min-w-[120px] px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        <select
                            value={editData.priority}
                            onChange={e => setEditData(prev => ({ ...prev, priority: e.target.value }))}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                        <select
                            value={editData.status}
                            onChange={e => setEditData(prev => ({ ...prev, status: e.target.value }))}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <input
                            type="date"
                            value={editData.dueDate}
                            onChange={e => setEditData(prev => ({ ...prev, dueDate: e.target.value }))}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleSave}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200 font-semibold"
                            disabled={loading}
                            style={{ minWidth: 80 }}
                        >
                            {loading ? "Saving..." : "Save"}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors duration-200 font-semibold"
                            disabled={loading}
                            style={{ minWidth: 80 }}
                        >
                            Cancel
                        </button>
                    </div>
                </motion.li>
            );
        }

        // Handle task completion
        const handleComplete = () => {
            onComplete(task.id);
        };

        return (
            <motion.li
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`${priorityColors[task.priority]} p-4 rounded-lg border flex items-center gap-4 transition-all duration-200`}
            >
                <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={handleComplete}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={task.completed}
                />
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
                    onClick={() => setIsEditing(true)}
                    className={`text-blue-500 hover:text-blue-700 transition-colors duration-200 ${task.status === 'Done' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Edit task"
                    disabled={task.status === 'Done'}
                >
                    <PencilSimple size={20} weight="bold" />
                </button>
                <button
                    onClick={() => deleteTask(task.id)}
                    className="text-red-500 hover:text-red-700 transition-colors duration-200"
                    title="Delete task"
                >
                    <Trash size={20} weight="bold" />
                </button>
            </motion.li>
        );
    });



    // RenderTask helper to keep task rendering logic DRY
    function renderTask(task) {
        return <TaskItem key={task.id} task={task} onComplete={handleCompleteTask} />;
    }

    // Add the missing handleMonsterAttack function
    const handleMonsterAttack = () => {
        setMonsterHealth(prev => {
            const newHealth = Math.max(0, prev - 1);
            if (newHealth <= 0) {
                // Monster defeated!
                setIsMonsterDefeated(true);
                playDefeatSound();
                setTimeout(() => {
                    const nextMonster = getNextMonster(monsterId);
                    if (nextMonster) {
                        setMonsterId(nextMonster.id);
                        setMonsterHealth(nextMonster.health);
                        setIsMonsterDefeated(false);
                    } else {
                        // All monsters defeated!
                        alert(`🎊 CONGRATULATIONS! You've defeated all monsters! You are the ultimate task master! 🏆`);
                    }
                }, 1000);
                return 0;
            }
            return newHealth;
        });
        setIsMonsterHit(true);
        playHitSound();
        setTimeout(() => setIsMonsterHit(false), 300);
    };

    // Theme classes
    const theme = currentTheme === -1 ? DEFAULT_THEME : getMonsterById(currentTheme)?.theme || DEFAULT_THEME;
    const headerClass = `p-6 bg-gradient-to-r ${theme.header}`;
    const bgClass = `${theme.bg}`;
    const textClass = theme.text || '';

    const healthPercent = monsterHealth / monster.health;
    let healthBarColor = 'bg-green-500';
    if (healthPercent < 0.25) {
        healthBarColor = 'bg-red-500';
    } else if (healthPercent < 0.5) {
        healthBarColor = 'bg-yellow-400';
    }

    return (
        <div className={`max-w-full w-full mx-auto ${bgClass} min-h-screen ${textClass}`}>
            <div className="bg-white rounded-md">
                 <div className={headerClass}>
                    {/* Monster Battle UI with animations */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="monster-title text-lg font-bold text-white dark:text-gray-200">{monster.name}</div>
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
                        <div className="w-full max-w-xs mb-2 flex flex-col items-center">
                            <div className="relative w-full">
                                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                    <span className="text-xs font-bold text-white drop-shadow-sm select-none">
                                        {monsterHealth} / {monster.health} HP
                                    </span>
                                </div>
                                {/* Determine health bar color */}
                                <div className="w-full h-7 bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full shadow-inner overflow-hidden relative">
                                    <motion.div
                                        className={`h-full rounded-full ${healthBarColor} shadow-lg`}
                                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                                        initial={{ width: `${(monsterHealth / monster.health) * 100}%` }}
                                        animate={{ width: `${(monsterHealth / monster.health) * 100}%` }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Monster Battle UI theme switcher */}
                        <div className="flex gap-2 items-center">
                            <span className="text-xs">Theme:</span>
                            <button
                                onClick={() => setShowThemeModal(true)}
                                className={`w-8 h-8 rounded-full border-2 ${currentTheme === -1 ? 'border-blue-700 bg-blue-200' : 'border-gray-300'}`}
                                title="Show theme collection"
                                style={currentTheme !== -1 && getMonsterById(currentTheme)?.theme?.bg ? { background: undefined, backgroundColor: undefined } : {}}
                            >
                                {currentTheme === -1 ? (
                                    <span className="block w-full h-full rounded-full bg-blue-200"></span>
                                ) : getMonsterById(currentTheme)?.image && getMonsterById(currentTheme).image.startsWith('/assets') ? (
                                    <img src={getMonsterById(currentTheme).image} alt="theme" className="w-6 h-6 object-contain mx-auto" />
                                ) : getMonsterById(currentTheme)?.theme?.bg ? (
                                    <span className={`block w-full h-full rounded-full ${getMonsterById(currentTheme).theme.bg}`}></span>
                                ) : (
                                    <span className="block w-full h-full rounded-full bg-gray-300"></span>
                                )}
                            </button>
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
                                    setView(btn.key);
                                }}
                                className={`px-4 py-2 rounded-lg font-semibold border border-gray-300 dark:border-gray-700 transition-colors duration-200
                                    ${view === btn.key
                                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-600'}
                                `}
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
                            className="flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            placeholder="Search tasks..."
                        />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
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
                            className="flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            placeholder="Add a task..."
                        />
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        >
                            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        <button 
                            className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 px-6 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-600 font-semibold border border-gray-300 dark:border-gray-700"
                            disabled={loading}
                        >
                            {loading ? "Adding..." : "Add"}
                        </button>
                    </form>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-b-md">
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