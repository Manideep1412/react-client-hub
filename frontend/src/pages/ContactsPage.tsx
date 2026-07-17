import { useEffect, useState } from 'react';
import { createContact, getContacts } from '../services/api';
import type { Contact } from '../types';
import Avatar from '../components/ui/Avatar';
import Spinner from '../components/ui/Spinner';

/* ─────────────── New Contact Modal ─────────────── */
function NewContactModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Contact) => void;
}) {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [company, setCompany] = useState('');
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setErr('Name and email are required.'); return; }
    setBusy(true); setErr('');
    try {
      const c = await createContact({ name: name.trim(), email: email.trim(), company: company.trim() || undefined });
      onCreated(c);
    } catch (ex: any) {
      setErr(ex?.response?.data?.error ?? 'Failed to create contact. Please try again.');
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">New Contact</h3>
          <button
            type="button" onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Full name <span className="text-red-400">*</span>
            </label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Alice Johnson"
              className="input text-xs w-full" autoFocus required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="alice@company.com"
              className="input text-xs w-full" required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Company <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              value={company} onChange={e => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className="input text-xs w-full"
            />
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={busy}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
            >
              {busy ? 'Creating…' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── Contacts Page ─────────────── */
export default function ContactsPage() {
  const [contacts,   setContacts]   = useState<Contact[]>([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [showModal,  setShowModal]  = useState(false);

  function load(q: string) {
    setLoading(true);
    getContacts({ search: q || undefined })
      .then(r => { setContacts(r.items); setTotal(r.totalCount); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(search); }, [search]);

  function handleCreated(c: Contact) {
    setContacts(prev => [c, ...prev]);
    setTotal(t => t + 1);
    setShowModal(false);
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Contacts</h1>
            <p className="text-xs text-gray-400 mt-0.5">{total} total contacts</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search contacts..." className="input pl-8 py-1.5 text-xs w-56"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Contact
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Spinner /></div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No contacts found</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Conversations</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contacts.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.name} size="sm" />
                          <span className="font-medium text-gray-900">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.email}</td>
                      <td className="px-4 py-3 text-gray-500">{c.company ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="badge bg-blue-50 text-blue-700 border border-blue-100">{c.conversationCount}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                        {new Date(c.createdAt.endsWith('Z') ? c.createdAt : c.createdAt + 'Z').toLocaleDateString('en-CA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <NewContactModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </>
  );
}
