import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { formatDistanceToNowStrict } from 'date-fns';
import { createConversation, getContacts, getConversations } from '../../services/api';
import { useChatStore } from '../../store/chatStore';
import type { Contact, Conversation } from '../../types';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';

const STATUS_TABS = [
  { label: 'Open',     value: 'open' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed',   value: 'closed' },
];

function relTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

/* ─────────────── New Conversation Modal ─────────────── */
function NewConvModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Conversation) => void;
}) {
  const [q,         setQ]         = useState('');
  const [contacts,  setContacts]  = useState<Contact[]>([]);
  const [picked,    setPicked]    = useState<Contact | null>(null);
  const [subject,   setSubject]   = useState('');
  const [body,      setBody]      = useState('');
  const [busy,      setBusy]      = useState(false);
  const [searching, setSearching] = useState(false);
  const [err,       setErr]       = useState('');

  useEffect(() => {
    if (!q.trim()) { setContacts([]); return; }
    setSearching(true);
    const t = setTimeout(() =>
      getContacts({ search: q })
        .then(r => { setContacts(r.items); setSearching(false); })
        .catch(() => setSearching(false)),
      300
    );
    return () => clearTimeout(t);
  }, [q]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked)        { setErr('Please select a contact.'); return; }
    if (!subject.trim()) { setErr('Please enter a subject.'); return; }
    setBusy(true); setErr('');
    try {
      const conv = await createConversation({
        contactId: picked.id,
        subject:   subject.trim(),
        body:      body.trim() || '(no initial message)',
      });
      onCreated(conv);
    } catch {
      setErr('Failed to create conversation. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">New Conversation</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Contact picker */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contact</label>
            {picked ? (
              <div className="flex items-center gap-2.5 px-3 py-2 bg-brand-50 border border-brand-200 rounded-lg">
                <Avatar name={picked.name} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{picked.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{picked.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPicked(null); setQ(''); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Change contact"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search by name or email…"
                  className="input text-xs w-full"
                  autoFocus
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner className="w-3.5 h-3.5" />
                  </div>
                )}
                {contacts.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {contacts.map(c => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => { setPicked(c); setQ(''); setContacts([]); }}
                          className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <Avatar name={c.name} size="xs" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{c.name}</p>
                            <p className="text-[11px] text-gray-500 truncate">{c.email}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {q.trim() && !searching && contacts.length === 0 && (
                  <p className="absolute left-0 right-0 top-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow text-xs text-gray-400">
                    No contacts found
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="What is this conversation about?"
              className="input text-xs w-full"
            />
          </div>

          {/* Optional first message */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              First message <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write an opening message…"
              rows={3}
              className="input text-xs w-full resize-none"
            />
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
            >
              {busy ? 'Creating…' : 'Create Conversation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── Conversation List ─────────────── */
export default function ConversationList() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { conversations, setConversations, setActiveConversation, upsertConversation } = useChatStore();
  const [status,    setStatus]    = useState('open');
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    getConversations({ status, search: search || undefined })
      .then(r => { setConversations(r.items); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status, search]);

  function select(c: Conversation) {
    setActiveConversation(c.id);
    navigate(`/inbox/${c.id}`);
  }

  function handleCreated(conv: Conversation) {
    upsertConversation(conv);
    setShowModal(false);
    select(conv);
  }

  const activeId = id ? Number(id) : null;

  return (
    <>
      <div className={`${id ? 'hidden sm:flex' : 'flex'} w-full sm:w-72 h-full bg-white border-r border-gray-100 flex-col flex-shrink-0`}>
        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
            <button
              onClick={() => setShowModal(true)}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="New conversation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="input pl-8 py-1.5 text-xs"
            />
          </div>

          {/* Status tabs */}
          <div className="flex gap-1">
            {STATUS_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setStatus(t.value)}
                className={clsx(
                  'flex-1 py-1 text-xs font-medium rounded-md transition-colors',
                  status === t.value
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Spinner /></div>
          ) : conversations.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">No conversations found</div>
          ) : (
            conversations.map(c => (
              <button
                key={c.id}
                onClick={() => select(c)}
                className={clsx(
                  'w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                  activeId === c.id && 'bg-blue-50 border-l-2 border-l-brand-500'
                )}
              >
                <div className="flex items-start gap-2.5">
                  <Avatar name={c.contactName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-semibold text-gray-900 truncate">{c.contactName}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{relTime(c.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium truncate mb-1">{c.subject}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-gray-400 truncate">{c.lastMessage ?? '—'}</p>
                      {c.unreadCount > 0 && (
                        <span className="ml-1 min-w-[16px] h-4 px-1 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <NewConvModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </>
  );
}
