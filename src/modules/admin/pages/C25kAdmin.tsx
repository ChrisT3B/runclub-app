import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { supabase } from '../../../services/supabase';
import { InvitationService, InvitationResult } from '../../../services/invitationService';
import { C25kDemoService } from '../services/c25kDemoService';
import { C25kRegistration, C25kHealthScreening, C25kRegistrationStatus } from '../../../types/c25k';
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal';

type TabType = 'invitations' | 'applications';

interface C25kMemberInfo {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  address_postcode: string | null;
}

interface C25kRegistrationWithDetails extends C25kRegistration {
  member?: C25kMemberInfo;
  health_screening?: C25kHealthScreening;
}

const C25K_REGISTER_URL = `${import.meta.env.VITE_APP_URL || window.location.origin}/c25k`;

type StatusFilterValue = 'all' | C25kRegistrationStatus;

const FILTER_LABELS: Record<StatusFilterValue, string> = {
  'all': 'All Applications',
  'pending_payment': 'Pending Payment',
  'awaiting_health_review': 'Health Review',
  'physio_in_progress': 'Physio In Progress',
  'confirmed': 'Confirmed',
  'waitlist': 'Waitlist',
  'cancelled': 'Cancelled'
};

const AVAILABLE_FILTERS: StatusFilterValue[] = [
  'all', 'pending_payment', 'awaiting_health_review', 'physio_in_progress', 'confirmed'
];

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'pending_payment': return 'status-badge--pending';
    case 'awaiting_health_review': return 'status-badge--cancelled';
    case 'physio_in_progress': return 'status-badge--booked';
    case 'confirmed': return 'status-badge--confirmed';
    case 'waitlist': return 'status-badge--suspended';
    case 'cancelled': return 'status-badge--cancelled';
    default: return 'status-badge--suspended';
  }
};

const getStatusLabel = (status: string): string => {
  return FILTER_LABELS[status as StatusFilterValue] || status;
};

export const C25kAdmin: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate: _onNavigate }) => {
  const { state } = useAuth();
  const adminId = state.member?.id;

  const [activeTab, setActiveTab] = useState<TabType>('invitations');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // --- Applications Tab State ---
  const [registrations, setRegistrations] = useState<C25kRegistrationWithDetails[]>([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [paymentDates, setPaymentDates] = useState<Record<string, string>>({});
  const [confirmingPaymentIds, setConfirmingPaymentIds] = useState<Set<string>>(new Set());
  const [updatingPhysioIds, setUpdatingPhysioIds] = useState<Set<string>>(new Set());
  const [selectedHealthScreening, setSelectedHealthScreening] = useState<{
    screening: C25kHealthScreening;
    memberName: string;
  } | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    type: 'payment' | 'physio_start' | 'physio_complete';
    registrationId: string;
    memberName: string;
    allHealthNo?: boolean;
    paymentDate?: string;
  } | null>(null);

  // --- Invitations Tab State ---
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [invResults, setInvResults] = useState<Array<{ email: string; result: InvitationResult }>>([]);
  const [showInvResults, setShowInvResults] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [cleaningDemo, setCleaningDemo] = useState(false);
  const [hasDemoData, setHasDemoData] = useState(false);

  // --- Close filter dropdown on outside click ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Data Loading ---
  const loadRegistrations = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('c25k_registrations')
        .select(`
          *,
          member:members!c25k_registrations_member_id_fkey(id, full_name, email, phone, date_of_birth, address_postcode)
        `)
        .eq('programme_year', 2026)
        .order('created_at', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError } = await query as {
        data: Array<C25kRegistration & { member: C25kMemberInfo }> | null;
        error: any;
      };
      if (fetchError) throw fetchError;

      const registrationsWithHealth = await Promise.all(
        (data || []).map(async (reg) => {
          const { data: health } = await supabase
            .from('c25k_health_screening')
            .select('*')
            .eq('member_id', reg.member_id)
            .single() as { data: C25kHealthScreening | null; error: any };

          return { ...reg, health_screening: health || undefined };
        })
      );

      setRegistrations(registrationsWithHealth);
      if (statusFilter === 'all') setTotalApplications(registrationsWithHealth.length);
    } catch (err) {
      console.error('Error loading registrations:', err);
      setError('Failed to load registrations');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === 'applications') {
      loadRegistrations();
    }
  }, [activeTab, loadRegistrations]);

  // Load application count on mount (lightweight — no joins)
  useEffect(() => {
    supabase
      .from('c25k_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('programme_year', 2026)
      .then(({ count }) => { if (count !== null) setTotalApplications(count); });
    C25kDemoService.hasDemoData().then(setHasDemoData);
  }, []);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 5000); return () => clearTimeout(t); }
  }, [success]);

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 8000); return () => clearTimeout(t); }
  }, [error]);

  // --- Payment Confirmation ---
  const handleConfirmPayment = async (registrationId: string, memberName: string, allHealthNo: boolean | undefined, paymentDate: string) => {
    if (!paymentDate || !adminId) return;
    try {
      setConfirmingPaymentIds(prev => new Set(prev).add(registrationId));
      setError('');
      const newStatus = allHealthNo ? 'confirmed' : 'awaiting_health_review';
      const { error: updateError } = await supabase
        .from('c25k_registrations')
        .update({
          payment_confirmed: true,
          payment_confirmed_at: new Date().toISOString(),
          payment_confirmed_by: adminId,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', registrationId);
      if (updateError) throw updateError;
      setSuccess(
        allHealthNo
          ? `Payment confirmed for ${memberName} - Confirmed for programme!`
          : `Payment confirmed for ${memberName} - Awaiting physio health review`
      );
      await loadRegistrations();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm payment');
    } finally {
      setConfirmingPaymentIds(prev => { const n = new Set(prev); n.delete(registrationId); return n; });
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirmation) return;
    const { type, registrationId, memberName, allHealthNo, paymentDate } = pendingConfirmation;
    setPendingConfirmation(null);
    if (type === 'payment') await handleConfirmPayment(registrationId, memberName, allHealthNo, paymentDate!);
    else if (type === 'physio_start') await handlePhysioStatusChange(registrationId, 'physio_in_progress', memberName);
    else if (type === 'physio_complete') await handlePhysioStatusChange(registrationId, 'confirmed', memberName);
  };

  const handlePhysioStatusChange = async (registrationId: string, newStatus: 'physio_in_progress' | 'confirmed', memberName: string) => {
    if (!adminId) return;
    try {
      setUpdatingPhysioIds(prev => new Set(prev).add(registrationId));
      setError('');
      const { error: updateError } = await supabase
        .from('c25k_registrations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', registrationId);
      if (updateError) throw updateError;
      setSuccess(`${memberName} - ${newStatus === 'physio_in_progress' ? 'Physio Check Started' : 'Physio Check Complete - Confirmed'}`);
      await loadRegistrations();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingPhysioIds(prev => { const n = new Set(prev); n.delete(registrationId); return n; });
    }
  };

  // --- Invitations Handlers ---
  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(C25K_REGISTER_URL); }
    catch { const ta = document.createElement('textarea'); ta.value = C25K_REGISTER_URL; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const handleSendInvitations = async () => {
    const emails = emailInput.split(/[\n,;]/).map(e => e.trim()).filter(e => e.includes('@'));
    if (emails.length === 0) { alert('Please enter at least one valid email'); return; }
    setSending(true); setProgress({ current: 0, total: emails.length }); setInvResults([]); setShowInvResults(true);
    for (let i = 0; i < emails.length; i++) {
      const result = await InvitationService.sendInvitation(emails[i], adminId, true);
      setProgress({ current: i + 1, total: emails.length });
      setInvResults(prev => [...prev, { email: emails[i], result }]);
      if (i < emails.length - 1) await new Promise(r => setTimeout(r, 1000));
    }
    setSending(false);
  };

  const handleCreateDemo = async () => {
    if (hasDemoData || !state.user?.id || !state.member?.full_name) return;
    if (!window.confirm('Create C25k demo runs?')) return;
    setCreatingDemo(true);
    try { const r = await C25kDemoService.createDemoData(state.user.id, state.member.full_name); if (r.success) { alert(r.message); setHasDemoData(true); } else alert(`Failed: ${r.error}`); }
    catch (e: any) { alert(e.message); } finally { setCreatingDemo(false); }
  };

  const handleCleanupDemo = async () => {
    if (!window.confirm('Remove all demo runs?')) return;
    setCleaningDemo(true);
    try { const r = await C25kDemoService.cleanupDemoData(); if (r.success) { alert(r.message); setHasDemoData(false); } else alert(`Failed: ${r.error}`); }
    catch (e: any) { alert(e.message); } finally { setCleaningDemo(false); }
  };

  // --- Helpers ---
  const calculateAge = (dob: string | null | undefined): string => {
    if (!dob) return '-';
    return String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getResultIcon = (result: InvitationResult) => {
    if (!result.success) return '✗';
    switch (result.action) { case 'invitation_sent': return '✉'; case 'password_reset': return '🔑'; case 'reminder_sent': return '🔔'; default: return '✓'; }
  };

  const handleFilterSelect = (value: StatusFilterValue) => {
    setStatusFilter(value);
    setFilterOpen(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">C25k Administration</h1>
        <p className="page-description">Manage C25k 2026 programme invitations and applications</p>
      </div>

      {/* Messages */}
      {success && <div className="member-list-alert member-list-alert--info">{success}</div>}
      {error && <div className="member-list-alert member-list-alert--error">{error}</div>}

      {/* Tabs */}
      <div className="filter-tabs" style={{ borderBottom: '2px solid var(--gray-200)', marginBottom: 'var(--space-6)', gap: 0 }}>
        {(['invitations', 'applications'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`filter-tab ${activeTab === tab ? 'filter-tab--active' : ''}`}
            style={{ borderRadius: 0, border: 'none', borderBottom: activeTab === tab ? '3px solid var(--red-primary)' : '3px solid transparent' }}
          >
            {tab === 'invitations' ? '📧 Invitations' : `📋 Applications (${totalApplications})`}
          </button>
        ))}
      </div>

      {/* ======== APPLICATIONS TAB ======== */}
      {activeTab === 'applications' && (
        <div>
          {/* Filter — dropdown style matching RunFilters */}
          <div className="filter-container" ref={filterRef}>
            <div className="filter-selector" onClick={() => setFilterOpen(!filterOpen)}>
              <div className="filter-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" />
                </svg>
              </div>
              <div className="filter-content">
                <span className="filter-label">{FILTER_LABELS[statusFilter]}</span>
                <span className="filter-count">({registrations.length})</span>
              </div>
              <div className={`filter-arrow ${filterOpen ? 'filter-arrow--open' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </div>
            </div>
            {filterOpen && (
              <div className="filter-dropdown">
                {AVAILABLE_FILTERS.map(f => (
                  <div
                    key={f}
                    className={`filter-option ${statusFilter === f ? 'filter-option--active' : ''}`}
                    onClick={() => handleFilterSelect(f)}
                  >
                    <span className="filter-option-label">{FILTER_LABELS[f]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Applications List */}
          {isLoading ? (
            <div className="member-list-loading">Loading applications...</div>
          ) : registrations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📋</div>
              <div className="empty-state__title">No applications found</div>
              <div className="empty-state__message">
                {statusFilter !== 'all' ? `No applications with status "${FILTER_LABELS[statusFilter]}"` : 'No C25k applications yet'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {registrations.map(reg => {
                const member = reg.member;
                const health = reg.health_screening;
                const allHealthNo = health?.all_answered_no;
                const age = calculateAge(member?.date_of_birth);

                return (
                  <div key={reg.id} className="card" style={{ borderLeft: `4px solid`, borderLeftColor: `var(--${reg.status === 'confirmed' ? 'success' : reg.status === 'pending_payment' ? 'warning' : reg.status === 'physio_in_progress' ? 'info' : 'danger'}-color)` }}>
                    <div className="card-content" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      {/* Row 1: Name + Age + Date */}
                      <div className="responsive-header" style={{ marginBottom: 'var(--space-1)' }}>
                        <div>
                          <span className="member-name">{member?.full_name || '-'}</span>
                          <span className="member-phone" style={{ marginLeft: 'var(--space-2)' }}>Age {age}</span>
                        </div>
                        <span className="member-phone">{formatDate(reg.created_at)}</span>
                      </div>
                      {/* Email */}
                      <div className="member-table__cell--small-gray" style={{ marginBottom: 'var(--space-2)' }}>
                        {member?.email || '-'}
                      </div>

                      {/* Row 2: Badges + Action */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {/* Payment / status badge */}
                        {reg.payment_type === 'existing_member_free' && (
                          <span className="status-badge status-badge--confirmed status-badge--small">FREE</span>
                        )}
                        {reg.payment_type !== 'existing_member_free' && reg.payment_confirmed && (
                          <span className="status-badge status-badge--confirmed status-badge--small">£30 Paid</span>
                        )}
                        {reg.status === 'pending_payment' && !reg.payment_confirmed && reg.payment_type !== 'existing_member_free' && (
                          <span className="status-badge status-badge--pending status-badge--small">Pending Payment</span>
                        )}

                        {/* Health badge (clickable) — show after payment confirmed */}
                        {health && reg.status !== 'pending_payment' && (
                          <button
                            onClick={() => setSelectedHealthScreening({ screening: health, memberName: member?.full_name || 'Member' })}
                            className={`status-badge status-badge--small ${allHealthNo ? 'status-badge--confirmed' : 'status-badge--cancelled'}`}
                            style={{ border: 'none', cursor: 'pointer' }}
                          >
                            {allHealthNo ? '✓ Health Clear' : '⚠ Health Review'}
                          </button>
                        )}

                        {/* Status badge — for physio workflow states */}
                        {(reg.status === 'awaiting_health_review' || reg.status === 'physio_in_progress') && (
                          <span className={`status-badge status-badge--small ${getStatusBadgeClass(reg.status)}`}>
                            {getStatusLabel(reg.status)}
                          </span>
                        )}

                        {/* Spacer */}
                        <div style={{ flex: 1 }} />

                        {/* Action */}
                        {reg.status === 'pending_payment' && !reg.payment_confirmed && reg.payment_type !== 'existing_member_free' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)' }}>Payment date:</span>
                            <input
                              type="date"
                              className="form-input"
                              value={paymentDates[reg.id!] || ''}
                              onChange={(e) => {
                                const date = e.target.value;
                                setPaymentDates(prev => ({ ...prev, [reg.id!]: date }));
                                if (date) {
                                  setPendingConfirmation({ type: 'payment', registrationId: reg.id!, memberName: member?.full_name || 'Member', allHealthNo, paymentDate: date });
                                }
                              }}
                              disabled={confirmingPaymentIds.has(reg.id!)}
                              style={{ width: 'auto', padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--font-sm)' }}
                            />
                          </div>
                        )}

                        {reg.status === 'awaiting_health_review' && (
                          <button
                            className="action-btn action-btn--secondary"
                            style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--font-sm)' }}
                            onClick={() => setPendingConfirmation({ type: 'physio_start', registrationId: reg.id!, memberName: member?.full_name || 'Member' })}
                            disabled={updatingPhysioIds.has(reg.id!)}
                          >
                            Start Physio Check
                          </button>
                        )}

                        {reg.status === 'physio_in_progress' && (
                          <button
                            className="action-btn action-btn--primary"
                            style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--font-sm)' }}
                            onClick={() => setPendingConfirmation({ type: 'physio_complete', registrationId: reg.id!, memberName: member?.full_name || 'Member' })}
                            disabled={updatingPhysioIds.has(reg.id!)}
                          >
                            Complete Physio Check
                          </button>
                        )}

                        {reg.status === 'confirmed' && (
                          <span className="status-badge status-badge--confirmed status-badge--small">✓ Ready</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======== INVITATIONS TAB ======== */}
      {activeTab === 'invitations' && (
        <div>
          {/* Demo Mode */}
          <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid var(--warning-color)' }}>
            <div className="card-content">
              <h3 className="card-title" style={{ color: '#92400e' }}>🎭 Demo Mode</h3>
              <p className="card-description" style={{ color: '#78350f', marginBottom: 'var(--space-4)' }}>
                Create demo runs to demonstrate the C25k feature with buddy system.
              </p>
              <div className="member-actions">
                <button onClick={handleCreateDemo} disabled={hasDemoData || creatingDemo || cleaningDemo}
                  className="action-btn action-btn--primary" style={{ background: hasDemoData ? 'var(--gray-500)' : 'var(--success-color)', borderColor: hasDemoData ? 'var(--gray-500)' : 'var(--success-color)' }}>
                  {creatingDemo ? 'Creating...' : '🎬 Create Demo Runs'}
                </button>
                {hasDemoData && (
                  <button onClick={handleCleanupDemo} disabled={creatingDemo || cleaningDemo}
                    className="action-btn action-btn--danger">
                    {cleaningDemo ? 'Cleaning...' : '🧹 Clean Up Demo'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Shareable Link */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="card-content">
              <h3 className="card-title">Shareable C25k Registration Link</h3>
              <p className="card-description" style={{ marginBottom: 'var(--space-4)' }}>
                Share this link on social media, WhatsApp, or in messages.
              </p>
              <div className="responsive-header">
                <code className="form-input" style={{ flex: 1, fontFamily: 'monospace', fontSize: 'var(--font-sm)', wordBreak: 'break-all', background: 'var(--gray-50)' }}>
                  {C25K_REGISTER_URL}
                </code>
                <button onClick={handleCopyLink} className="action-btn action-btn--primary"
                  style={linkCopied ? { background: 'var(--success-color)', borderColor: 'var(--success-color)' } : {}}>
                  {linkCopied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>

          {/* Email Invitations */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="card-content">
              <h3 className="card-title">Send C25k Programme Invitations</h3>
              <p className="card-description" style={{ marginBottom: 'var(--space-4)' }}>
                Invited members will be automatically flagged as C25k participants.
              </p>
              <div className="form-group">
                <textarea
                  className="form-input"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={'Enter email addresses (one per line)\n\nExample:\njohn@example.com\njane@example.com'}
                  rows={8}
                  disabled={sending}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
              <div className="member-actions">
                <button onClick={handleSendInvitations} disabled={sending || !emailInput.trim()} className="action-btn action-btn--primary">
                  {sending ? `Sending (${progress.current}/${progress.total})...` : 'Send C25k Invitations'}
                </button>
                {(invResults.length > 0 || emailInput) && (
                  <button onClick={() => { setEmailInput(''); setInvResults([]); setShowInvResults(false); }}
                    disabled={sending} className="action-btn action-btn--secondary">Clear</button>
                )}
              </div>
            </div>
          </div>

          {/* Invitation Results */}
          {showInvResults && invResults.length > 0 && (
            <div className="card">
              <div className="card-content">
                <h3 className="card-title">Results ({invResults.length}/{progress.total})</h3>
                <div className="table-container">
                  <table className="member-table">
                    <thead className="member-table__header">
                      <tr>
                        <th className="member-table__header-cell" style={{ width: '40px' }}></th>
                        <th className="member-table__header-cell">Email</th>
                        <th className="member-table__header-cell">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invResults.map((item, i) => (
                        <tr key={i} className="member-table__row">
                          <td className="member-table__cell" style={{ textAlign: 'center' }}>{getResultIcon(item.result)}</td>
                          <td className="member-table__cell" style={{ fontFamily: 'monospace' }}>{item.email}</td>
                          <td className="member-table__cell" style={{ color: item.result.success ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: '500' }}>
                            {item.result.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======== CONFIRMATION MODAL ======== */}
      <ConfirmationModal
        isOpen={!!pendingConfirmation}
        title={
          pendingConfirmation?.type === 'payment' ? 'Confirm Payment' :
          pendingConfirmation?.type === 'physio_start' ? 'Start Physio Check' :
          'Complete Physio Check'
        }
        message={
          pendingConfirmation?.type === 'payment'
            ? `Confirm £30 payment received from ${pendingConfirmation.memberName} on ${pendingConfirmation.paymentDate ? new Date(pendingConfirmation.paymentDate).toLocaleDateString('en-GB') : ''}?`
            : pendingConfirmation?.type === 'physio_start'
            ? `Start physiotherapist review for ${pendingConfirmation?.memberName}?`
            : `Mark physio check as complete for ${pendingConfirmation?.memberName}? This will confirm them for the programme.`
        }
        confirmText={
          pendingConfirmation?.type === 'payment' ? 'Confirm Payment' :
          pendingConfirmation?.type === 'physio_start' ? 'Start Check' :
          'Complete & Confirm'
        }
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingConfirmation(null)}
      />

      {/* ======== HEALTH SCREENING DETAIL MODAL ======== */}
      {selectedHealthScreening && (
        <div
          onClick={() => setSelectedHealthScreening(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 'var(--z-modal, 100)' as any, padding: 'var(--space-4)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                Health Screening - {selectedHealthScreening.memberName}
              </h3>
              <button onClick={() => setSelectedHealthScreening(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--gray-500)' }}>
                ×
              </button>
            </div>
            <div className="card-content">
              {/* Overall status */}
              <div className={`member-list-alert ${selectedHealthScreening.screening.all_answered_no ? 'member-list-alert--info' : 'member-list-alert--error'}`}>
                {selectedHealthScreening.screening.all_answered_no
                  ? '✓ All questions answered NO - Cleared for activity'
                  : '⚠ One or more questions answered YES - Physio review required'}
              </div>

              {/* Individual questions */}
              {[
                { key: 'heart_condition', text: 'Heart condition or high blood pressure?' },
                { key: 'chest_pain', text: 'Chest pain at rest or during activity?' },
                { key: 'dizziness_loss_consciousness', text: 'Dizziness or loss of consciousness (last 12 months)?' },
                { key: 'chronic_medical_condition', text: 'Diagnosed with a chronic medical condition?' },
                { key: 'prescribed_medications', text: 'Currently taking prescribed medications?' },
                { key: 'bone_joint_soft_tissue', text: 'Bone, joint, or soft tissue problem?' },
                { key: 'medically_supervised_only', text: 'Doctor said medically supervised activity only?' }
              ].map((q, i) => {
                const answered = selectedHealthScreening.screening[q.key as keyof C25kHealthScreening] as boolean;
                return (
                  <div key={q.key} style={{
                    padding: 'var(--space-3)',
                    marginBottom: 'var(--space-2)',
                    borderRadius: 'var(--radius-md)',
                    background: answered ? 'var(--red-light)' : 'var(--gray-50)',
                    border: `1px solid ${answered ? 'var(--danger-color)' : 'var(--gray-200)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 'var(--space-3)'
                  }}>
                    <span style={{ fontSize: 'var(--font-sm)' }}>{i + 1}. {q.text}</span>
                    <span className={`status-badge status-badge--small ${answered ? 'status-badge--cancelled' : 'status-badge--confirmed'}`}
                      style={answered ? { background: 'var(--danger-color)', color: 'white' } : { background: 'var(--success-color)', color: 'white' }}>
                      {answered ? 'YES' : 'NO'}
                    </span>
                  </div>
                );
              })}

              {/* Additional info */}
              {selectedHealthScreening.screening.additional_info && (
                <div className="urgent-alert" style={{ marginTop: 'var(--space-4)' }}>
                  <div className="urgent-alert__content">
                    <div className="urgent-alert__title">Additional Information</div>
                    <div className="urgent-alert__message">{selectedHealthScreening.screening.additional_info}</div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 'var(--space-4)', textAlign: 'right' }}>
                <button onClick={() => setSelectedHealthScreening(null)} className="action-btn action-btn--secondary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default C25kAdmin;
