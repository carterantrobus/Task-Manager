const backendUrl = 'http://127.0.0.1:5000/';

document.getElementById('taskform').addEventListener('submit', async function(e) {
    e.preventDefault();
    const input = document.getElementById('task-input');
    const task = input.value;
    const response = await fetch(`${backendUrl}/tasks`,  {
        method: 'POST',
        headers: {  'Content-Type': 'application/json'},
        body: JSON.stringify({ task})
    });
    input.value = '';
    loadTasks();
});

async function loadTasks() {
    const response = await fetch(`${backendUrl}/tasks`);
    const tasks = await response.json();
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.textContent = task.task;
        list.appendChild(li);
    });
}

loadTasks();
