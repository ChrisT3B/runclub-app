// src/modules/admin/components/AffiliatedApplicationsManagement.tsx
// Admin interface for managing EA affiliated member applications

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { AffiliatedMemberService } from '../../membership/services/affiliatedMemberService';
import { EAApplicationSettingsModal } from './EAApplicationSettingsModal';
import {
  AffiliatedMemberApplication,
  EAApplicationSettings,
  ApplicationStatus,
} from '../../../types/affiliatedMember';

type TabType = 'pending_payment' | 'pending_ea' | 'completed';

export const AffiliatedApplicationsManagement: React.FC = () => {
  const { state } = useAuth();
  const adminId = state.member?.id;

  const [activeTab, setActiveTab] = useState<TabType>('pending_payment');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [settings, setSettings] = useState<EAApplicationSettings | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [pendingPaymentApps, setPendingPaymentApps] = useState<AffiliatedMemberApplication[]>([]);
  const [pendingEAApps, setPendingEAApps] = useState<AffiliatedMemberApplication[]>([]);
  const [completedApps, setCompletedApps] = useState<AffiliatedMemberApplication[]>([]);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<AffiliatedMemberApplication | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Inline confirmation states (Tab 1 - Payment)
  const [paymentDates, setPaymentDates] = useState<Record<string, string>>({});
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [confirmingPaymentIds, setConfirmingPaymentIds] = useState<Set<string>>(new Set());

  // Inline confirmation states (Tab 2 - EA)
  const [eaUrns, setEaUrns] = useState<Record<string, string>>({});
  const [eaNotes, setEaNotes] = useState<Record<string, string>>({});
  const [confirmingEAIds, setConfirmingEAIds] = useState<Set<string>>(new Set());

  // Cancel modal state
  const [cancelReason, setCancelReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadApplications();
      AffiliatedMemberService.getApplicationSettings(selectedYear).then(setSettings);
    }
  }, [selectedYear]);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [years, currentYear] = await Promise.all([
        AffiliatedMemberService.getAvailableYears(),
        AffiliatedMemberService.getCurrentMembershipYear(),
      ]);

      setAvailableYears(years);

      // Default to current fiscal year if it exists in settings, otherwise most recent
      const defaultYear = years.includes(currentYear) ? currentYear : years[0] || currentYear;
      setSelectedYear(defaultYear);

      const appSettings = await AffiliatedMemberService.getApplicationSettings(defaultYear);
      setSettings(appSettings);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load application data.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadApplications = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [submitted, paymentConfirmed, eaConfirmed, cancelled] = await Promise.all([
        AffiliatedMemberService.getApplicationsByStatus('submitted', selectedYear),
        AffiliatedMemberService.getApplicationsByStatus('payment_confirmed', selectedYear),
        AffiliatedMemberService.getApplicationsByStatus('ea_confirmed', selectedYear),
        AffiliatedMemberService.getApplicationsByStatus('cancelled', selectedYear),
      ]);

      setPendingPaymentApps(submitted);
      setPendingEAApps(paymentConfirmed);
      setCompletedApps([...eaConfirmed, ...cancelled].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ));
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      setError('Failed to load applications.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize EA URNs from applications (for renewals)
  useEffect(() => {
    const initialUrns: Record<string, string> = {};
    pendingEAApps.forEach(app => {
      if (app.ea_urn_at_application) {
        initialUrns[app.id] = app.ea_urn_at_application;
      }
    });
    setEaUrns(prev => ({ ...prev, ...initialUrns }));
  }, [pendingEAApps]);

  // Update payment date for a specific application
  const handlePaymentDateChange = (appId: string, date: string) => {
    setPaymentDates(prev => ({
      ...prev,
      [appId]: date,
    }));
  };

  // Update payment notes for a specific application
  const handlePaymentNotesChange = (appId: string, notes: string) => {
    setPaymentNotes(prev => ({
      ...prev,
      [appId]: notes,
    }));
  };

  // Update EA URN for a specific application
  const handleEaUrnChange = (appId: string, urn: string) => {
    setEaUrns(prev => ({
      ...prev,
      [appId]: urn,
    }));
  };

  // Update EA notes for a specific application
  const handleEaNotesChange = (appId: string, notes: string) => {
    setEaNotes(prev => ({
      ...prev,
      [appId]: notes,
    }));
  };

  // Confirm payment when checkbox ticked (Tab 1)
  const handlePaymentCheckboxChange = async (appId: string, isChecked: boolean, appName: string) => {
    if (!isChecked || !adminId) return;

    const paymentDate = paymentDates[appId];
    if (!paymentDate) return;

    try {
      setConfirmingPaymentIds(prev => new Set(prev).add(appId));
      setError('');

      await AffiliatedMemberService.confirmPayment(appId, adminId, {
        application_id: appId,
        payment_date: paymentDate,
        payment_notes: paymentNotes[appId] || undefined,
      });

      setSuccess(`Payment confirmed for ${appName}`);
      // Clear the data for this app
      setPaymentDates(prev => {
        const next = { ...prev };
        delete next[appId];
        return next;
      });
      setPaymentNotes(prev => {
        const next = { ...prev };
        delete next[appId];
        return next;
      });
      await loadApplications();
    } catch (err: any) {
      console.error('Failed to confirm payment:', err);
      setError(err.message || 'Failed to confirm payment. Please try again.');
    } finally {
      setConfirmingPaymentIds(prev => {
        const next = new Set(prev);
        next.delete(appId);
        return next;
      });
    }
  };

  // Confirm EA registration when checkbox ticked (Tab 2)
  const handleEACheckboxChange = async (appId: string, isChecked: boolean, appName: string) => {
    if (!isChecked || !adminId) return;

    const eaUrn = eaUrns[appId]?.trim();
    if (!eaUrn) return;

    try {
      setConfirmingEAIds(prev => new Set(prev).add(appId));
      setError('');

      await AffiliatedMemberService.confirmEARegistration(appId, adminId, {
        application_id: appId,
        new_ea_urn: eaUrn,
        ea_confirmation_notes: eaNotes[appId] || undefined,
      });

      setSuccess(`EA Registration confirmed for ${appName}! Member profile has been automatically updated.`);
      // Clear the data for this app
      setEaUrns(prev => {
        const next = { ...prev };
        delete next[appId];
        return next;
      });
      setEaNotes(prev => {
        const next = { ...prev };
        delete next[appId];
        return next;
      });
      await loadApplications();
    } catch (err: any) {
      console.error('Failed to confirm EA registration:', err);
      setError(err.message || 'Failed to confirm EA registration. Please try again.');
    } finally {
      setConfirmingEAIds(prev => {
        const next = new Set(prev);
        next.delete(appId);
        return next;
      });
    }
  };

  const handleCancelApplication = async () => {
    if (!selectedApplication || !adminId) return;

    if (!cancelReason || cancelReason.trim().length < 5) {
      setError('Please provide a reason for cancellation');
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      await AffiliatedMemberService.adminCancelApplication(
        selectedApplication.id,
        adminId,
        cancelReason.trim()
      );

      setSuccess('Application cancelled successfully.');
      setShowCancelModal(false);
      setSelectedApplication(null);
      setCancelReason('');
      loadApplications();
    } catch (err: any) {
      console.error('Failed to cancel application:', err);
      setError(err.message || 'Failed to cancel application.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await AffiliatedMemberService.exportApplicationsToCSV(selectedYear);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EA_Applications_${selectedYear}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess('CSV exported successfully!');
    } catch (err: any) {
      console.error('Failed to export CSV:', err);
      setError('Failed to export CSV.');
    }
  };

  const filterApplications = (apps: AffiliatedMemberApplication[]) => {
    if (!searchTerm) return apps;
    const search = searchTerm.toLowerCase();
    return apps.filter(
      app =>
        app.member?.full_name?.toLowerCase().includes(search) ||
        app.member?.email?.toLowerCase().includes(search)
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'submitted':
        return { bg: '#fef3c7', color: '#92400e', text: 'Awaiting Payment' };
      case 'payment_confirmed':
        return { bg: '#dbeafe', color: '#1d4ed8', text: 'Payment Confirmed' };
      case 'ea_confirmed':
        return { bg: '#dcfce7', color: '#166534', text: 'EA Confirmed' };
      case 'cancelled':
        return { bg: '#fee2e2', color: '#dc2626', text: 'Cancelled' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280', text: status };
    }
  };

  if (isLoading && !settings) {
    return (
      <div className="card">
        <div className="card-content" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'var(--gray-600)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">EA Applications</h1>
        <p className="page-description">
          Manage England Athletics affiliated member applications
        </p>
      </div>

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
          }}
        >
          {error}
          <button
            onClick={() => setError('')}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            x
          </button>
        </div>
      )}

      {success && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
          }}
        >
          {success}
          <button
            onClick={() => setSuccess('')}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            x
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-content">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'flex-end',
            }}
          >
            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-input"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ flex: '0 0 180px', marginBottom: 0 }}>
              <label className="form-label">Membership Year</label>
              <select
                className="form-input"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={handleExportCSV}>
                Export CSV
              </button>
              <button className="btn btn-primary" onClick={() => setShowSettingsModal(true)}>
                Settings
              </button>
            </div>
          </div>

          {/* Application Status Summary */}
          {settings && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: settings.applications_open ? '#f0fdf4' : '#fef3c7',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: settings.applications_open ? '#22c55e' : '#f59e0b',
                }}
              />
              <span style={{ color: settings.applications_open ? '#166534' : '#92400e' }}>
                Applications are currently {settings.applications_open ? 'OPEN' : 'CLOSED'}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '14px', color: 'var(--gray-600)' }}>
                Fees: 1st Claim £{settings.first_claim_fee?.toFixed(2)} | 2nd Claim £
                {settings.second_claim_fee?.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--gray-200)',
          }}
        >
          <button
            onClick={() => setActiveTab('pending_payment')}
            style={{
              flex: 1,
              padding: '16px',
              background: activeTab === 'pending_payment' ? 'white' : 'var(--gray-50)',
              border: 'none',
              borderBottom: activeTab === 'pending_payment' ? '2px solid var(--red-primary)' : 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'pending_payment' ? '600' : '400',
              color: activeTab === 'pending_payment' ? 'var(--gray-900)' : 'var(--gray-600)',
            }}
          >
            Pending Payment ({pendingPaymentApps.length})
          </button>
          <button
            onClick={() => setActiveTab('pending_ea')}
            style={{
              flex: 1,
              padding: '16px',
              background: activeTab === 'pending_ea' ? 'white' : 'var(--gray-50)',
              border: 'none',
              borderBottom: activeTab === 'pending_ea' ? '2px solid var(--red-primary)' : 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'pending_ea' ? '600' : '400',
              color: activeTab === 'pending_ea' ? 'var(--gray-900)' : 'var(--gray-600)',
            }}
          >
            Pending EA ({pendingEAApps.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            style={{
              flex: 1,
              padding: '16px',
              background: activeTab === 'completed' ? 'white' : 'var(--gray-50)',
              border: 'none',
              borderBottom: activeTab === 'completed' ? '2px solid var(--red-primary)' : 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'completed' ? '600' : '400',
              color: activeTab === 'completed' ? 'var(--gray-900)' : 'var(--gray-600)',
            }}
          >
            Completed ({completedApps.length})
          </button>
        </div>

        <div className="card-content">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--gray-600)' }}>Loading applications...</p>
            </div>
          ) : (
            <>
              {/* Pending Payment Tab - Inline date + checkbox */}
              {activeTab === 'pending_payment' && (
                filterApplications(pendingPaymentApps).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-600)' }}>
                    No applications awaiting payment confirmation
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="member-table">
                      <thead className="member-table__header">
                        <tr>
                          <th className="member-table__header-cell">Name</th>
                          <th className="member-table__header-cell">Email</th>
                          <th className="member-table__header-cell">Type</th>
                          <th className="member-table__header-cell">Fee</th>
                          <th className="member-table__header-cell">Payment Ref</th>
                          <th className="member-table__header-cell">Applied</th>
                          <th className="member-table__header-cell">Actions</th>
                          <th className="member-table__header-cell">Payment Date</th>
                          <th className="member-table__header-cell">Notes</th>
                          <th className="member-table__header-cell" style={{ textAlign: 'center' }}>✓</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filterApplications(pendingPaymentApps).map(app => (
                          <tr key={app.id} className="member-table__row">
                            <td className="member-table__cell">{app.member?.full_name || '-'}</td>
                            <td className="member-table__cell" style={{ color: 'var(--gray-600)', fontSize: '13px' }}>
                              {app.member?.email || '-'}
                            </td>
                            <td className="member-table__cell">
                              {app.membership_type === 'first_claim' ? '1st Claim' : '2nd Claim'}
                            </td>
                            <td className="member-table__cell">£{app.membership_fee?.toFixed(2)}</td>
                            <td className="member-table__cell" style={{ fontFamily: 'monospace' }}>
                              {app.payment_reference}
                            </td>
                            <td className="member-table__cell" style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                              {formatDate(app.created_at)}
                            </td>
                            <td className="member-table__cell">
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setShowViewModal(true);
                                  }}
                                >
                                  View
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626' }}
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setShowCancelModal(true);
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                            <td className="member-table__cell">
                              <input
                                type="date"
                                value={paymentDates[app.id] || ''}
                                onChange={(e) => handlePaymentDateChange(app.id, e.target.value)}
                                onFocus={() => {
                                  if (!paymentDates[app.id]) {
                                    const today = new Date().toISOString().split('T')[0];
                                    handlePaymentDateChange(app.id, today);
                                  }
                                }}
                                className="form-input"
                                style={{ width: '140px', fontSize: '13px', padding: '4px 8px' }}
                              />
                            </td>
                            <td className="member-table__cell">
                              <input
                                type="text"
                                value={paymentNotes[app.id] || ''}
                                onChange={(e) => handlePaymentNotesChange(app.id, e.target.value)}
                                placeholder="Optional"
                                className="form-input"
                                style={{ width: '120px', fontSize: '13px', padding: '4px 8px' }}
                              />
                            </td>
                            <td className="member-table__cell" style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={false}
                                disabled={!paymentDates[app.id] || confirmingPaymentIds.has(app.id)}
                                onChange={(e) => handlePaymentCheckboxChange(app.id, e.target.checked, app.member?.full_name || 'Unknown')}
                                style={{
                                  cursor: paymentDates[app.id] ? 'pointer' : 'not-allowed',
                                  width: '20px',
                                  height: '20px',
                                  opacity: paymentDates[app.id] ? 1 : 0.4,
                                }}
                                title={!paymentDates[app.id] ? 'Enter payment date first' : 'Confirm payment received'}
                              />
                              {confirmingPaymentIds.has(app.id) && (
                                <div style={{ fontSize: '10px', color: 'var(--gray-500)' }}>
                                  Confirming...
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Pending EA Tab - Inline URN + checkbox */}
              {activeTab === 'pending_ea' && (
                filterApplications(pendingEAApps).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-600)' }}>
                    No applications awaiting EA registration
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="member-table">
                      <thead className="member-table__header">
                        <tr>
                          <th className="member-table__header-cell">Name</th>
                          <th className="member-table__header-cell">Email</th>
                          <th className="member-table__header-cell">Type</th>
                          <th className="member-table__header-cell">Payment Confirmed</th>
                          <th className="member-table__header-cell">Actions</th>
                          <th className="member-table__header-cell">EA URN</th>
                          <th className="member-table__header-cell">Notes</th>
                          <th className="member-table__header-cell" style={{ textAlign: 'center' }}>✓</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filterApplications(pendingEAApps).map(app => (
                          <tr key={app.id} className="member-table__row">
                            <td className="member-table__cell">{app.member?.full_name || '-'}</td>
                            <td className="member-table__cell" style={{ color: 'var(--gray-600)', fontSize: '13px' }}>
                              {app.member?.email || '-'}
                            </td>
                            <td className="member-table__cell">
                              {app.membership_type === 'first_claim' ? '1st Claim' : '2nd Claim'}
                            </td>
                            <td className="member-table__cell" style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                              {formatDate(app.payment_confirmed_at)}
                            </td>
                            <td className="member-table__cell">
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setShowViewModal(true);
                                  }}
                                >
                                  View
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626' }}
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setShowCancelModal(true);
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                            <td className="member-table__cell">
                              <input
                                type="text"
                                value={eaUrns[app.id] || ''}
                                onChange={(e) => handleEaUrnChange(app.id, e.target.value)}
                                placeholder="e.g., RA12345"
                                className="form-input"
                                style={{ width: '140px', fontSize: '13px', padding: '4px 8px' }}
                              />
                            </td>
                            <td className="member-table__cell">
                              <input
                                type="text"
                                value={eaNotes[app.id] || ''}
                                onChange={(e) => handleEaNotesChange(app.id, e.target.value)}
                                placeholder="Optional"
                                className="form-input"
                                style={{ width: '120px', fontSize: '13px', padding: '4px 8px' }}
                              />
                            </td>
                            <td className="member-table__cell" style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={false}
                                disabled={!eaUrns[app.id]?.trim() || confirmingEAIds.has(app.id)}
                                onChange={(e) => handleEACheckboxChange(app.id, e.target.checked, app.member?.full_name || 'Unknown')}
                                style={{
                                  cursor: eaUrns[app.id]?.trim() ? 'pointer' : 'not-allowed',
                                  width: '20px',
                                  height: '20px',
                                  opacity: eaUrns[app.id]?.trim() ? 1 : 0.4,
                                }}
                                title={!eaUrns[app.id]?.trim() ? 'Enter EA URN first' : 'Confirm EA registration'}
                              />
                              {confirmingEAIds.has(app.id) && (
                                <div style={{ fontSize: '10px', color: 'var(--gray-500)' }}>
                                  Confirming...
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Completed Tab */}
              {activeTab === 'completed' && (
                <ApplicationsTable
                  applications={filterApplications(completedApps)}
                  columns={['status', 'name', 'email', 'type', 'completed_date', 'actions']}
                  onView={app => {
                    setSelectedApplication(app);
                    setShowViewModal(true);
                  }}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  emptyMessage="No completed or cancelled applications"
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <EAApplicationSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          membershipYear={selectedYear}
          onSettingsUpdated={() => {
            AffiliatedMemberService.getApplicationSettings(selectedYear).then(setSettings);
          }}
        />
      )}

      {/* View Application Modal */}
      {showViewModal && selectedApplication && (
        <ViewApplicationModal
          application={selectedApplication}
          onClose={() => {
            setShowViewModal(false);
            setSelectedApplication(null);
          }}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
        />
      )}

      {/* Cancel Application Modal */}
      {showCancelModal && selectedApplication && (
        <ConfirmationModal
          title="Cancel Application"
          onClose={() => {
            setShowCancelModal(false);
            setSelectedApplication(null);
            setCancelReason('');
          }}
          onConfirm={handleCancelApplication}
          isProcessing={isProcessing}
          confirmText="Cancel Application"
          isDanger
        >
          <p style={{ marginBottom: '16px' }}>
            Cancel application for <strong>{selectedApplication.member?.full_name}</strong>?
          </p>
          <div className="form-group">
            <label className="form-label">Reason for Cancellation *</label>
            <textarea
              className="form-input"
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Please provide a reason for cancelling this application..."
              required
            />
          </div>
        </ConfirmationModal>
      )}
    </div>
  );
};

// Helper Components

// ApplicationsTable for Completed tab
interface ApplicationsTableProps {
  applications: AffiliatedMemberApplication[];
  columns: string[];
  onView?: (app: AffiliatedMemberApplication) => void;
  onConfirmPayment?: (app: AffiliatedMemberApplication) => void;
  onConfirmEA?: (app: AffiliatedMemberApplication) => void;
  onCancel?: (app: AffiliatedMemberApplication) => void;
  formatDate: (date: string | null | undefined) => string;
  getStatusBadge?: (status: ApplicationStatus) => { bg: string; color: string; text: string };
  emptyMessage: string;
}

const ApplicationsTable: React.FC<ApplicationsTableProps> = ({
  applications,
  columns,
  onView,
  onConfirmPayment,
  onConfirmEA,
  onCancel,
  formatDate,
  getStatusBadge,
  emptyMessage,
}) => {
  if (applications.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-600)' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="member-table">
        <thead className="member-table__header">
          <tr>
            {columns.includes('actions') && <th className="member-table__header-cell">Actions</th>}
            {columns.includes('status') && <th className="member-table__header-cell">Status</th>}
            {columns.includes('name') && <th className="member-table__header-cell">Name</th>}
            {columns.includes('email') && <th className="member-table__header-cell">Email</th>}
            {columns.includes('type') && <th className="member-table__header-cell">Type</th>}
            {columns.includes('fee') && <th className="member-table__header-cell">Fee</th>}
            {columns.includes('payment_ref') && <th className="member-table__header-cell">Payment Ref</th>}
            {columns.includes('applied') && <th className="member-table__header-cell">Applied</th>}
            {columns.includes('payment_confirmed') && <th className="member-table__header-cell">Payment Confirmed</th>}
            {columns.includes('ea_urn') && <th className="member-table__header-cell">EA URN</th>}
            {columns.includes('completed_date') && <th className="member-table__header-cell">Completed</th>}
          </tr>
        </thead>
        <tbody>
          {applications.map(app => {
            const statusBadge = getStatusBadge?.(app.status);
            return (
              <tr key={app.id} className="member-table__row">
                {columns.includes('actions') && (
                  <td className="member-table__cell">
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {onView && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => onView(app)}
                        >
                          View
                        </button>
                      )}
                      {onConfirmPayment && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => onConfirmPayment(app)}
                        >
                          Confirm Payment
                        </button>
                      )}
                      {onConfirmEA && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => onConfirmEA(app)}
                        >
                          Confirm EA
                        </button>
                      )}
                      {onCancel && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626' }}
                          onClick={() => onCancel(app)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                )}
                {columns.includes('status') && statusBadge && (
                  <td className="member-table__cell">
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '500',
                        background: statusBadge.bg,
                        color: statusBadge.color,
                      }}
                    >
                      {statusBadge.text}
                    </span>
                  </td>
                )}
                {columns.includes('name') && (
                  <td className="member-table__cell">{app.member?.full_name || '-'}</td>
                )}
                {columns.includes('email') && (
                  <td className="member-table__cell" style={{ color: 'var(--gray-600)', fontSize: '13px' }}>
                    {app.member?.email || '-'}
                  </td>
                )}
                {columns.includes('type') && (
                  <td className="member-table__cell">
                    {app.membership_type === 'first_claim' ? '1st Claim' : '2nd Claim'}
                  </td>
                )}
                {columns.includes('fee') && (
                  <td className="member-table__cell">£{app.membership_fee?.toFixed(2)}</td>
                )}
                {columns.includes('payment_ref') && (
                  <td className="member-table__cell" style={{ fontFamily: 'monospace' }}>
                    {app.payment_reference}
                  </td>
                )}
                {columns.includes('applied') && (
                  <td className="member-table__cell" style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                    {formatDate(app.created_at)}
                  </td>
                )}
                {columns.includes('payment_confirmed') && (
                  <td className="member-table__cell" style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                    {formatDate(app.payment_confirmed_at)}
                  </td>
                )}
                {columns.includes('ea_urn') && (
                  <td className="member-table__cell" style={{ fontFamily: 'monospace' }}>
                    {app.ea_urn_at_application || '-'}
                  </td>
                )}
                {columns.includes('completed_date') && (
                  <td className="member-table__cell" style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                    {formatDate(app.ea_confirmed_at || app.cancelled_at)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

interface ViewApplicationModalProps {
  application: AffiliatedMemberApplication;
  onClose: () => void;
  formatDate: (date: string | null | undefined) => string;
  getStatusBadge: (status: ApplicationStatus) => { bg: string; color: string; text: string };
}

const ViewApplicationModal: React.FC<ViewApplicationModalProps> = ({
  application,
  onClose,
  formatDate,
  getStatusBadge,
}) => {
  const statusBadge = getStatusBadge(application.status);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid var(--gray-200)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Application Details</h2>
            <span
              style={{
                display: 'inline-block',
                marginTop: '8px',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500',
                background: statusBadge.bg,
                color: statusBadge.color,
              }}
            >
              {statusBadge.text}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--gray-500)',
            }}
          >
            x
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <Section title="Member Information">
              <InfoRow label="Name" value={application.member?.full_name} />
              <InfoRow label="Email" value={application.member?.email} />
              <InfoRow label="Phone" value={application.member?.phone} />
            </Section>

            <Section title="Personal Details">
              <InfoRow label="Title" value={application.title} />
              <InfoRow label="Date of Birth" value={formatDate(application.date_of_birth)} />
              <InfoRow label="Sex at Birth" value={application.sex_at_birth} />
              <InfoRow label="Address & Postcode" value={application.address_postcode} />
              <InfoRow label="Nationality" value={application.nationality} />
            </Section>

            <Section title="Membership Details">
              <InfoRow
                label="Type"
                value={application.membership_type === 'first_claim' ? '1st Claim' : '2nd Claim'}
              />
              <InfoRow label="Fee" value={`£${application.membership_fee?.toFixed(2)}`} />
              <InfoRow label="Year" value={application.membership_year} />
              <InfoRow label="Renewal" value={application.is_renewal ? 'Yes' : 'No'} />
              {application.ea_urn_at_application && (
                <InfoRow label="Previous EA URN" value={application.ea_urn_at_application} />
              )}
              {application.previous_club_name && (
                <InfoRow label="Previous Club" value={application.previous_club_name} />
              )}
              {application.new_ea_urn && (
                <InfoRow label="New EA URN" value={application.new_ea_urn} />
              )}
            </Section>

            <Section title="Emergency Contact">
              <InfoRow label="Name" value={application.emergency_contact_name} />
              <InfoRow label="Relationship" value={application.emergency_contact_relationship} />
              <InfoRow label="Number" value={application.emergency_contact_number} />
            </Section>

            {application.has_health_conditions && (
              <Section title="Health Information">
                <InfoRow label="Details" value={application.health_conditions_details} />
              </Section>
            )}

            <Section title="Payment">
              <InfoRow label="Reference" value={application.payment_reference} />
              <InfoRow label="Method" value={application.payment_method} />
              {application.payment_date && (
                <InfoRow label="Payment Date" value={formatDate(application.payment_date)} />
              )}
              {application.payment_notes && (
                <InfoRow label="Payment Notes" value={application.payment_notes} />
              )}
            </Section>

            <Section title="Timeline">
              <InfoRow label="Submitted" value={formatDate(application.created_at)} />
              {application.payment_confirmed_at && (
                <InfoRow label="Payment Confirmed" value={formatDate(application.payment_confirmed_at)} />
              )}
              {application.ea_confirmed_at && (
                <InfoRow label="EA Confirmed" value={formatDate(application.ea_confirmed_at)} />
              )}
              {application.cancelled_at && (
                <>
                  <InfoRow label="Cancelled" value={formatDate(application.cancelled_at)} />
                  <InfoRow label="Cancellation Reason" value={application.cancellation_reason} />
                </>
              )}
            </Section>
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--gray-200)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4
      style={{
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--gray-900)',
        marginBottom: '8px',
        paddingBottom: '4px',
        borderBottom: '1px solid var(--gray-200)',
      }}
    >
      {title}
    </h4>
    <div style={{ display: 'grid', gap: '4px' }}>{children}</div>
  </div>
);

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div style={{ display: 'flex', fontSize: '14px' }}>
    <span style={{ color: 'var(--gray-600)', width: '140px', flexShrink: 0 }}>{label}:</span>
    <span style={{ color: 'var(--gray-900)' }}>{value || '-'}</span>
  </div>
);

interface ConfirmationModalProps {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  confirmText: string;
  isDanger?: boolean;
  children: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  onClose,
  onConfirm,
  isProcessing,
  confirmText,
  isDanger,
  children,
}) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}
  >
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '450px',
      }}
    >
      <div
        style={{
          padding: '24px',
          borderBottom: '1px solid var(--gray-200)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px' }}>{title}</h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: 'var(--gray-500)',
          }}
        >
          x
        </button>
      </div>

      <div style={{ padding: '24px' }}>{children}</div>

      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--gray-200)',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}
      >
        <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={isProcessing}
          style={isDanger ? { background: '#dc2626', borderColor: '#dc2626' } : undefined}
        >
          {isProcessing ? 'Processing...' : confirmText}
        </button>
      </div>
    </div>
  </div>
);

export default AffiliatedApplicationsManagement;
