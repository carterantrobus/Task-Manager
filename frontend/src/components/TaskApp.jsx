import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "http://localhost:5000/tasks";

const priorityColors = {
    low: "bg-green-100 border-green-200",
    medium: "bg-yellow-100 border-yellow-200",
    high: "bg-red-100 border-red-200"
};

export default function TaskApp() {
    const [tasks, setTasks] = useState([]);
    const [input, setInput] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [priority, setPriority] = useState("medium");
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await fetch(API_URL);
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
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task: input,
                    priority,
                    createdAt: new Date().toISOString()
                })
            });
            if (!res.ok) throw new Error("Failed to add task");
            const newTask = await res.json();
            setTasks([...tasks, newTask]);
            setInput("");
            setPriority("medium");
            setError("");
        } catch (err) {
            setError("Failed to add task. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const deleteTask = async (id) => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete task");
            setTasks(tasks.filter(task => task.id !== id));
            setError("");
        } catch (err) {
            setError("Failed to delete task. Please try again.");
        }
    };

    const toggleComplete = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: "PUT",
                headers: {
                    'Content-Type': 'application/json'
                },
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

    return (
        <div className="max-w-4xl mx-auto mt-10 p-6">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-400">
                    <h1 className="text-3xl font-bold text-white text-center mb-4">Task Manager</h1>
                    
                    {/* Search and Filter */}
                    <div className="flex gap-4 mb-4">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <form onSubmit={addTask} className="flex gap-2">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        <button 
                            className="bg-white text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 font-semibold"
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
                            <ul className="space-y-3">
                                {filteredTasks.map((task) => (
                                    <motion.li
                                        key={task.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -100 }}
                                        className={`${priorityColors[task.priority]} p-4 rounded-lg border flex items-center gap-4 transition-all duration-200`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={task.completed}
                                            onChange={() => toggleComplete(task.id)}
                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className={`flex-1 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                                            {task.task}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {task.priority}
                                        </span>
                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            className="text-red-500 hover:text-red-700 transition-colors duration-200"
                                            title="Delete task"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </motion.li>
                                ))}
                            </ul>
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}