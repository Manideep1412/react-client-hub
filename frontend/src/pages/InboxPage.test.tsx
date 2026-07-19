import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import InboxPage from './InboxPage';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../components/chat/ConversationList', () => ({
  default: () => <div data-testid="conversation-list" />,
}));

vi.mock('../components/chat/ChatWindow', () => ({
  default: () => <div data-testid="chat-window" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderInbox(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/inbox"     element={<InboxPage />} />
        <Route path="/inbox/:id" element={<InboxPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('InboxPage', () => {
  it('always renders ConversationList', () => {
    renderInbox('/inbox');
    expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
  });

  it('shows placeholder when no conversation is selected', () => {
    renderInbox('/inbox');
    expect(screen.getByText('Select a conversation')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-window')).not.toBeInTheDocument();
  });

  it('renders ChatWindow when a conversation id is present', () => {
    renderInbox('/inbox/42');
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    expect(screen.queryByText('Select a conversation')).not.toBeInTheDocument();
  });
});
