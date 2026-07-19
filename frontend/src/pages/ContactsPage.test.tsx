import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactsPage from './ContactsPage';
import type { Contact } from '../types';

// ── Hoisted — available inside vi.mock factories ───────────────────────────────
const mockGetContacts   = vi.hoisted(() => vi.fn());
const mockCreateContact = vi.hoisted(() => vi.fn());

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../services/api', () => ({
  getContacts:   mockGetContacts,
  createContact: mockCreateContact,
}));

vi.mock('../components/ui/Avatar', () => ({
  default: ({ name }: { name: string }) => <span data-testid="avatar">{name[0]}</span>,
}));

vi.mock('../components/ui/Spinner', () => ({
  default: () => <div data-testid="spinner" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeContact = (overrides: Partial<Contact> = {}): Contact => ({
  id:                1,
  name:              'Alice Johnson',
  email:             'alice@acme.com',
  company:           'Acme Corp',
  createdAt:         '2024-01-15T00:00:00Z',
  conversationCount: 3,
  ...overrides,
});

const pagedResult = (items: Contact[]) => ({
  items,
  totalCount: items.length,
  totalPages: 1,
  page:       1,
  pageSize:   20,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ContactsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner while loading', () => {
    mockGetContacts.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ContactsPage />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders contact rows after load', async () => {
    mockGetContacts.mockResolvedValueOnce(pagedResult([
      makeContact({ id: 1, name: 'Alice Johnson', email: 'alice@acme.com' }),
      makeContact({ id: 2, name: 'Bob Smith',     email: 'bob@corp.com' }),
    ]));
    render(<ContactsPage />);

    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument());
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@acme.com')).toBeInTheDocument();
  });

  it('shows total contact count in header', async () => {
    mockGetContacts.mockResolvedValueOnce(pagedResult([makeContact(), makeContact({ id: 2 })]));
    render(<ContactsPage />);
    await waitFor(() => expect(screen.getByText(/2 total contacts/i)).toBeInTheDocument());
  });

  it('shows empty state when no contacts found', async () => {
    mockGetContacts.mockResolvedValueOnce(pagedResult([]));
    render(<ContactsPage />);
    await waitFor(() => expect(screen.getByText('No contacts found')).toBeInTheDocument());
  });

  it('re-fetches when search input value changes', async () => {
    mockGetContacts.mockResolvedValue(pagedResult([makeContact()]));
    render(<ContactsPage />);
    await waitFor(() => expect(mockGetContacts).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText('Search contacts...'), {
      target: { value: 'alice' },
    });

    await waitFor(() => expect(mockGetContacts).toHaveBeenCalledTimes(2));
  });

  it('passes search query to getContacts', async () => {
    mockGetContacts.mockResolvedValue(pagedResult([]));
    render(<ContactsPage />);

    fireEvent.change(screen.getByPlaceholderText('Search contacts...'), {
      target: { value: 'alice' },
    });

    await waitFor(() =>
      expect(mockGetContacts).toHaveBeenLastCalledWith({ search: 'alice' })
    );
  });

  it('opens New Contact modal on button click', async () => {
    mockGetContacts.mockResolvedValueOnce(pagedResult([]));
    render(<ContactsPage />);

    fireEvent.click(screen.getByRole('button', { name: /new contact/i }));

    // Modal heading (not the button) confirms the modal is open
    expect(screen.getByRole('heading', { name: 'New Contact' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Alice Johnson')).toBeInTheDocument();
  });

  it('closes modal on Cancel click', async () => {
    mockGetContacts.mockResolvedValueOnce(pagedResult([]));
    render(<ContactsPage />);
    fireEvent.click(screen.getByRole('button', { name: /new contact/i }));
    expect(screen.getByPlaceholderText('Alice Johnson')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() =>
      expect(screen.queryByPlaceholderText('Alice Johnson')).not.toBeInTheDocument()
    );
  });

  it('shows validation error when submitting empty form', async () => {
    mockGetContacts.mockResolvedValueOnce(pagedResult([]));
    render(<ContactsPage />);
    fireEvent.click(screen.getByRole('button', { name: /new contact/i }));

    // fireEvent.submit bypasses jsdom's HTML5 constraint validation so the
    // React onSubmit handler runs with empty fields and sets the error state.
    const submitBtn = screen.getByRole('button', { name: /create contact/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() =>
      expect(screen.getByText('Name and email are required.')).toBeInTheDocument()
    );
    expect(mockCreateContact).not.toHaveBeenCalled();
  });

  it('creates contact and prepends it to the list', async () => {
    const newContact = makeContact({ id: 99, name: 'Charlie', email: 'charlie@test.com', company: undefined });
    mockGetContacts.mockResolvedValueOnce(pagedResult([]));
    mockCreateContact.mockResolvedValueOnce(newContact);
    render(<ContactsPage />);

    fireEvent.click(screen.getByRole('button', { name: /new contact/i }));
    await userEvent.type(screen.getByPlaceholderText('Alice Johnson'),    'Charlie');
    await userEvent.type(screen.getByPlaceholderText('alice@company.com'), 'charlie@test.com');
    fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

    await waitFor(() => {
      expect(mockCreateContact).toHaveBeenCalledWith({
        name: 'Charlie', email: 'charlie@test.com', company: undefined,
      });
    });

    await waitFor(() => expect(screen.getByText('Charlie')).toBeInTheDocument());
    // Modal closes
    expect(screen.queryByPlaceholderText('Alice Johnson')).not.toBeInTheDocument();
  });

  it('shows API error when createContact fails', async () => {
    mockGetContacts.mockResolvedValueOnce(pagedResult([]));
    mockCreateContact.mockRejectedValueOnce({
      response: { data: { error: 'Email already exists.' } },
    });
    render(<ContactsPage />);
    fireEvent.click(screen.getByRole('button', { name: /new contact/i }));

    await userEvent.type(screen.getByPlaceholderText('Alice Johnson'),    'Alice');
    await userEvent.type(screen.getByPlaceholderText('alice@company.com'), 'alice@test.com');
    fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

    await waitFor(() =>
      expect(screen.getByText('Email already exists.')).toBeInTheDocument()
    );
  });

  it('formats createdAt date as YYYY-MM-DD', async () => {
    mockGetContacts.mockResolvedValueOnce(
      pagedResult([makeContact({ createdAt: '2024-03-20T10:00:00Z' })])
    );
    render(<ContactsPage />);
    await waitFor(() => expect(screen.getByText('2024-03-20')).toBeInTheDocument());
  });

  it('shows dash for contacts without a company', async () => {
    mockGetContacts.mockResolvedValueOnce(pagedResult([makeContact({ company: undefined })]));
    render(<ContactsPage />);
    await waitFor(() => expect(screen.getByText('—')).toBeInTheDocument());
  });
});
