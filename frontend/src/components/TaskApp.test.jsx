import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TaskApp from './TaskApp';

// Mock fetch globally
global.fetch = jest.fn();

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    li: ({ children, ...props }) => <li {...props}>{children}</li>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('TaskApp Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Test initial render and loading state
  test('renders task manager title', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<TaskApp />);
    expect(screen.getByText('Task Manager')).toBeInTheDocument();
  });

  test('shows loading state initially', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<TaskApp />);
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    });
  });

  test('displays empty state when no tasks', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<TaskApp />);
    
    await waitFor(() => {
      expect(screen.getByText('No tasks yet. Add your first task above!')).toBeInTheDocument();
    });
  });

  // Test task fetching
  test('fetches and displays tasks on mount', async () => {
    const mockTasks = [
      { id: '1', task: 'Test task 1', priority: 'high', completed: false },
      { id: '2', task: 'Test task 2', priority: 'medium', completed: true },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasks,
    });

    render(<TaskApp />);

    await waitFor(() => {
      expect(screen.getByText('Test task 1')).toBeInTheDocument();
      expect(screen.getByText('Test task 2')).toBeInTheDocument();
    });
  });

  test('handles fetch error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<TaskApp />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load tasks. Please try again later.')).toBeInTheDocument();
    });
  });

  // Test adding tasks
  test('adds a new task successfully', async () => {
    // Using userEvent without setup for older version
    
    // Mock initial fetch (empty tasks)
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Mock add task response
    const newTask = { id: '1', task: 'New test task', priority: 'medium', completed: false };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newTask,
    });

    render(<TaskApp />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('No tasks yet. Add your first task above!')).toBeInTheDocument();
    });

    // Add a task
    const input = screen.getByPlaceholderText('Add a task...');
    const addButton = screen.getByText('Add');

    await userEvent.type(input, 'New test task');
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('New test task')).toBeInTheDocument();
    });

    // Verify fetch was called correctly
    expect(fetch).toHaveBeenCalledWith('http://localhost:5000/tasks', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"task":"New test task"'),
    }));
  });

  test('handles add task error', async () => {
    // Using userEvent without setup for older version
    
    // Mock initial fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Mock failed add task
    fetch.mockResolvedValueOnce({
      ok: false,
    });

    render(<TaskApp />);

    await waitFor(() => {
      expect(screen.getByText('No tasks yet. Add your first task above!')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Add a task...');
    const addButton = screen.getByText('Add');

    await userEvent.type(input, 'New test task');
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to add task. Please try again.')).toBeInTheDocument();
    });
  });

  test('does not add empty task', async () => {
    // Using userEvent without setup for older version
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<TaskApp />);

    await waitFor(() => {
      expect(screen.getByText('No tasks yet. Add your first task above!')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add');
    await userEvent.click(addButton);

    // Should not make a POST request for empty task
    expect(fetch).toHaveBeenCalledTimes(1); // Only the initial GET request
  });

  // Test deleting tasks
  test('deletes a task successfully', async () => {
    // Using userEvent without setup for older version
    const mockTasks = [
      { id: '1', task: 'Task to delete', priority: 'high', completed: false },
    ];

    // Mock initial fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasks,
    });

    // Mock delete response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Task Deleted' }),
    });

    render(<TaskApp />);

    await waitFor(() => {
      expect(screen.getByText('Task to delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete task');
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText('Task to delete')).not.toBeInTheDocument();
      expect(screen.getByText('No tasks yet. Add your first task above!')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('http://localhost:5000/tasks/1', {
      method: 'DELETE',
    });
  });

  test('handles delete task error', async () => {
    // Using userEvent without setup for older version
    const mockTasks = [
      { id: '1', task: 'Task to delete', priority: 'high', completed: false },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasks,
    });

    fetch.mockResolvedValueOnce({
      ok: false,
    });

    render(<TaskApp />);

    await waitFor(() => {
      expect(screen.getByText('Task to delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete task');
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to delete task. Please try again.')).toBeInTheDocument();
    });
  });

  // Test task completion toggle
  test('toggles task completion successfully', async () => {
    // Using userEvent without setup for older version
    const mockTasks = [
      { id: '1', task: 'Task to complete', priority: 'medium', completed: false },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasks,
    });

    const updatedTask = { ...mockTasks[0], completed: true };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedTask,
    });

    render(<TaskApp />);

    await waitFor(() => {
      expect(screen.getByText('Task to complete')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    await userEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });

    expect(fetch).toHaveBeenCalledWith('http://localhost:5000/tasks/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...mockTasks[0],
        completed: true,
      }),
    });
  });

  // Test search functionality
  test('filters tasks based on search term', async () => {
    // Using userEvent without setup for older version
    const mockTasks = [
      { id: '1', task: 'Buy groceries', priority: 'high', completed: false },
      { id: '2', task: 'Walk the dog', priority: 'medium', completed: false },
      { id: '3', task: 'Buy books', priority: 'low', completed: true },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasks,
    });

    render(<TaskApp />);

    await waitFor(() => {
      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      expect(screen.getByText('Walk the dog')).toBeInTheDocument();
      expect(screen.getByText('Buy books')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search tasks...');
    await userEvent.type(searchInput, 'buy');

    await waitFor(() => {
      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      expect(screen.getByText('Buy books')).toBeInTheDocument();
      expect(screen.queryByText('Walk the dog')).not.toBeInTheDocument();
    });
  });

  // Test filter functionality
  test('filters tasks by completion status', async () => {
    // Using userEvent without setup for older version
    const mockTasks = [
      { id: '1', task: 'Active task', priority: 'high', completed: false },
      { id: '2', task: 'Completed task', priority: 'medium', completed: true },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasks,
    });

    render(<TaskApp />);

    await waitFor(() => {
      expect(screen.getByText('Active task')).toBeInTheDocument();
      expect(screen.getByText('Completed task')).toBeInTheDocument();
    });

    const filterSelect = screen.getByDisplayValue('All');
    await userEvent.selectOptions(filterSelect, 'completed');

    await waitFor(() => {
      expect(screen.queryByText('Active task')).not.toBeInTheDocument();
      expect(screen.getByText('Completed task')).toBeInTheDocument();
    });

    await userEvent.selectOptions(filterSelect, 'active');

    await waitFor(() => {
      expect(screen.getByText('Active task')).toBeInTheDocument();
      expect(screen.queryByText('Completed task')).not.toBeInTheDocument();
    });
  });

  // Test priority selection
  test('allows selecting different priorities when adding tasks', async () => {
    // Using userEvent without setup for older version
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const newTask = { id: '1', task: 'High priority task', priority: 'high', completed: false };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newTask,
    });

    render(<TaskApp />);

    await waitFor(() => {
      expect(screen.getByText('No tasks yet. Add your first task above!')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Add a task...');
    const prioritySelect = screen.getByDisplayValue('Medium');
    const addButton = screen.getByText('Add');

    await userEvent.type(input, 'High priority task');
    await userEvent.selectOptions(prioritySelect, 'high');
    await userEvent.click(addButton);

    expect(fetch).toHaveBeenCalledWith('http://localhost:5000/tasks', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"task":"High priority task"'),
    }));
  });
});