import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock fetch globally
global.fetch = jest.fn();

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    li: ({ children, ...props }) => <li {...props}>{children}</li>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

test('renders task manager app', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [],
  });

  render(<App />);
  
  expect(screen.getByText('Task Manager')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText('No tasks yet. Add your first task above!')).toBeInTheDocument();
  });
});
