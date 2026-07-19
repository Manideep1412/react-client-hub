import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

// ── Hoisted — available inside vi.mock factories ───────────────────────────────
const mockNavigate = vi.hoisted(() => vi.fn());
const mockSetAuth  = vi.hoisted(() => vi.fn());
const mockLogin    = vi.hoisted(() => vi.fn());

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async (importOriginal) => {
  const real = await importOriginal<typeof import('react-router-dom')>();
  return { ...real, useNavigate: () => mockNavigate };
});

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: any) => any) =>
    selector({ token: null, user: null, setAuth: mockSetAuth, logout: vi.fn() })
  ),
}));

vi.mock('../services/api', () => ({
  login: mockLogin,
}));

vi.mock('../components/ui/Spinner', () => ({
  default: () => <div data-testid="spinner" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

// The form has no for/id label associations, so query by pre-filled display value
const getEmailInput    = () => screen.getByDisplayValue('admin@clienthub.dev');
const getPasswordInput = () => screen.getByDisplayValue('Admin@123');
const getSubmitBtn     = () => screen.getByRole('button', { name: /sign in/i });

const AUTH_RESPONSE = {
  token: 'jwt-token',
  user:  { id: 1, email: 'admin@clienthub.dev', fullName: 'Admin', role: 'Agent', isOnline: false },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the sign-in heading and form', () => {
    renderLogin();
    expect(screen.getByText('ClientHub')).toBeInTheDocument();
    expect(getSubmitBtn()).toBeInTheDocument();
  });

  it('prefills email and password with demo credentials', () => {
    renderLogin();
    expect(getEmailInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
  });

  it('navigates to /inbox on successful login', async () => {
    mockLogin.mockResolvedValueOnce(AUTH_RESPONSE);
    renderLogin();

    fireEvent.click(getSubmitBtn());

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email:    'admin@clienthub.dev',
        password: 'Admin@123',
      });
      expect(mockSetAuth).toHaveBeenCalledWith(AUTH_RESPONSE.token, AUTH_RESPONSE.user);
      expect(mockNavigate).toHaveBeenCalledWith('/inbox', { replace: true });
    });
  });

  it('shows error message when login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('401'));
    renderLogin();

    fireEvent.click(getSubmitBtn());

    await waitFor(() =>
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument()
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows spinner and disables button while login is in flight', async () => {
    let resolve!: (v: unknown) => void;
    mockLogin.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    renderLogin();

    const btn = getSubmitBtn();
    fireEvent.click(btn);

    await waitFor(() => expect(screen.getByTestId('spinner')).toBeInTheDocument());
    expect(btn).toBeDisabled();

    resolve(AUTH_RESPONSE); // clean up
  });

  it('email field updates on user input', () => {
    renderLogin();
    const input = getEmailInput();
    fireEvent.change(input, { target: { value: 'new@test.com' } });
    expect(input).toHaveValue('new@test.com');
  });

  it('clears error at the start of the next submit attempt', async () => {
    mockLogin
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(AUTH_RESPONSE);

    renderLogin();
    const btn = getSubmitBtn();

    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText('Invalid email or password.')).toBeInTheDocument());

    fireEvent.click(btn);
    await waitFor(() =>
      expect(screen.queryByText('Invalid email or password.')).not.toBeInTheDocument()
    );
  });
});
