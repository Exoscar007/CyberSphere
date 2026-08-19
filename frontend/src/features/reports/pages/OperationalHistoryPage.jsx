import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import {
  HistoryIcon,
  ShieldIcon,
  FilterIcon,
  SearchIcon,
  RefreshCwIcon,
  ClockIcon,
  UserIcon,
  FileTextIcon,
  DispatchIcon,
  SirenIcon,
  IntelligenceIcon,
  CheckIcon,
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  ArrowRightIcon,
  LockIcon,
  RadioIcon,
  EyeIcon,
} from '../../../components/common/Icons';

const CATEGORIES = [
  { id: 'ALL', label: 'All Activities', icon: HistoryIcon },
  { id: 'FIR', label: 'FIRs', icon: FileTextIcon },
  { id: 'INCIDENT', label: 'Incidents', icon: SirenIcon },
  { id: 'PATROL', label: 'Patrols', icon: DispatchIcon },
  { id: 'COMPLAINT', label: 'Complaints', icon: FileTextIcon },
  { id: 'USER', label: 'Users', icon: UserIcon },
  { id: 'INTELLIGENCE', label: 'Intelligence', icon: IntelligenceIcon },
  { id: 'AUTH', label: 'Security & Auth', icon: LockIcon },
];

export default function OperationalHistoryPage() {
  const navigate = useNavigate();

  // Current session user info
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = storedUser.role === 'ADMIN';
  const stationName = storedUser.station_name || (storedUser.station && storedUser.station.name) || 'Assigned Precinct';

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Data State
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Preset Date selection
  const handleDatePreset = (preset) => {
    setDateRangePreset(preset);
    setCurrentPage(1);
    const today = new Date();
    if (preset === 'TODAY') {
      const yyyy = today.toISOString().split('T')[0];
      setStartDate(yyyy);
      setEndDate(yyyy);
    } else if (preset === '7D') {
      const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === '30D') {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Fetch Summary KPIs
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const params = new URLSearchParams();
      if (selectedStation && isAdmin) params.append('station_id', selectedStation);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await api.get(`/api/intelligence/audit-summary/?${params.toString()}`);
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load audit summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedStation, startDate, endDate, isAdmin]);

  // Fetch Audit Logs
  const fetchLogs = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('page_size', pageSize);

      if (selectedCategory && selectedCategory !== 'ALL') {
        params.append('category', selectedCategory);
      }
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (startDate) {
        params.append('start_date', startDate);
      }
      if (endDate) {
        params.append('end_date', endDate);
      }
      if (selectedStation && isAdmin) {
        params.append('station_id', selectedStation);
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const res = await api.get(`/api/intelligence/audit-logs/?${params.toString()}`);
      if (res.data.results) {
        setLogs(res.data.results);
        setTotalCount(res.data.count || 0);
        setTotalPages(res.data.total_pages || Math.ceil((res.data.count || 1) / pageSize));
      } else if (Array.isArray(res.data)) {
        setLogs(res.data);
        setTotalCount(res.data.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, pageSize, selectedCategory, debouncedSearch, startDate, endDate, selectedStation, statusFilter, isAdmin]);

  // Initial load
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
      fetchSummary();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs, fetchSummary]);

  // Navigate directly to operational screen
  const handleResourceClick = (event) => {
    const rolePrefix = isAdmin ? '/city' : '/station';
    const category = (event.category || '').toUpperCase();
    const resType = (event.resource_type || '').toUpperCase();

    if (category === 'FIR' || resType === 'FIR') {
      navigate(`${rolePrefix}/firs`);
    } else if (category === 'INCIDENT' || resType === 'INCIDENT') {
      if (isAdmin) navigate('/city/overview');
      else navigate('/station/queue');
    } else if (category === 'PATROL' || resType.startsWith('PATROL')) {
      if (isAdmin) navigate('/city/overview');
      else navigate('/station/dispatch');
    } else if (category === 'USER' || resType === 'USER' || category === 'AUTH') {
      if (isAdmin) navigate('/city/users');
    } else if (category === 'INTELLIGENCE') {
      navigate(`${rolePrefix}/intelligence`);
    } else if (category === 'COMPLAINT') {
      navigate(`${rolePrefix}/firs`);
    }
  };

  // Helper for category color badge
  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'FIR': return 'badge--primary';
      case 'INCIDENT': return 'badge--high';
      case 'PATROL': return 'badge--verified';
      case 'AUTH': return 'badge--critical';
      case 'USER': return 'badge--secondary';
      case 'INTELLIGENCE': return 'badge--operational';
      case 'COMPLAINT': return 'badge--medium';
      default: return 'badge--neutral';
    }
  };

  // Format date helper
  const formatDateTime = (isoString) => {
    if (!isoString) return { date: '—', time: '—' };
    const dateObj = new Date(isoString);
    const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = dateObj.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
    return { date, time };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', paddingBottom: 'var(--space-xl)' }}>
      {/* PAGE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-header__title" style={{ margin: 0 }}>Operational Audit & Case History</h1>
            <span
              className={`badge ${isAdmin ? 'badge--verified' : 'badge--operational'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              {isAdmin ? <ShieldIcon size={12} /> : <RadioIcon size={12} />}
              {isAdmin ? 'Citywide Scope (Admin)' : `Precinct: ${stationName}`}
            </span>
          </div>
          <p className="page-header__subtitle" style={{ marginTop: '4px' }}>
            Database-backed, tamper-resistant chronological operational ledger across dispatches, FIRs, incidents, security, and personnel actions
          </p>
        </div>

        {/* Refresh and Auto-poll Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Auto-Poll (15s)</span>
          </label>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              fetchLogs(true);
              fetchSummary();
            }}
            disabled={loading || refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <RefreshCwIcon size={13} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Logs'}</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-sm)' }}>
        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
            <HistoryIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Recorded Events
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
              {summaryLoading ? '...' : (summary?.total_events || totalCount || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Across active retention window
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
            <ClockIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Events Today
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#10B981', fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
              {summaryLoading ? '...' : (summary?.events_today || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {summary?.events_last_24h || 0} in last 24 hours
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6' }}>
            <UserIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Operators
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
              {summaryLoading ? '...' : (summary?.active_operators || 0)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Personnel generating activity
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }}>
            <LockIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Security & Auth Audits
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#EF4444', fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
              {summaryLoading ? '...' : (summary?.security_events_count || 0)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Logins, MFA events & failures
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY TABS */}
      <div className="filter-pills-bar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'thin' }}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          const count = cat.id === 'ALL' ? (summary?.total_events ?? totalCount ?? 0) : (summary?.by_category?.[cat.id] ?? 0);

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                setCurrentPage(1);
              }}
              className={`filter-pill ${isActive ? 'filter-pill--active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px',
                borderRadius: '8px',
                border: isActive ? '1.5px solid #0284C7' : '1px solid var(--color-border, #E2E8F0)',
                backgroundColor: isActive ? '#0F172A' : '#FFFFFF',
                color: isActive ? '#38BDF8' : 'var(--color-text-primary, #334155)',
                fontSize: '12px',
                fontWeight: isActive ? '700' : '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 2px 8px rgba(15, 23, 42, 0.15)' : '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={15} style={{ color: isActive ? '#38BDF8' : 'var(--color-text-muted, #64748B)' }} />
              <span>{cat.label}</span>
              <span
                style={{
                  backgroundColor: isActive ? '#0284C7' : '#F1F5F9',
                  color: isActive ? '#FFFFFF' : '#475569',
                  fontSize: '10px',
                  padding: '2px 7px',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: '700',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* SEARCH & EXTENDED FILTER BAR */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
            <SearchIcon size={14} />
          </span>
          <input
            type="text"
            className="input"
            placeholder="Search action, actor, resource ID, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '32px', fontSize: '11px', height: '34px', width: '100%' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <XIcon size={12} />
            </button>
          )}
        </div>

        {/* Date Filter & Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FilterIcon size={12} /> Range:
          </span>
          {['ALL', 'TODAY', '7D', '30D', 'CUSTOM'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleDatePreset(preset)}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: '700',
                borderRadius: '4px',
                border: dateRangePreset === preset ? '1px solid var(--palette-sage)' : '1px solid var(--color-border)',
                backgroundColor: dateRangePreset === preset ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: dateRangePreset === preset ? 'var(--palette-sage)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              {preset}
            </button>
          ))}

          {dateRangePreset === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="input"
                style={{ height: '30px', fontSize: '11px', padding: '2px 6px' }}
              />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="input"
                style={{ height: '30px', fontSize: '11px', padding: '2px 6px' }}
              />
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
            style={{ height: '32px', fontSize: '11px' }}
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="WARNING">Warning</option>
          </select>
        </div>

        {/* Reset Button */}
        {(selectedCategory !== 'ALL' || searchQuery || startDate || endDate || statusFilter || selectedStation) && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedCategory('ALL');
              setSearchQuery('');
              setDateRangePreset('ALL');
              setStartDate('');
              setEndDate('');
              setStatusFilter('');
              setSelectedStation('');
              setCurrentPage(1);
            }}
            style={{ fontSize: '10px', height: '30px', padding: '0 8px' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ACTIVITY TIMELINE FEED */}
      {loading ? (
        <div className="loading-spinner" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Loading operational ledger from database...
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state card" style={{ padding: '36px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="empty-state__icon" style={{ marginBottom: '12px', color: 'var(--color-text-muted)' }}>
            <HistoryIcon size={32} />
          </div>
          <div className="empty-state__title" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            No {selectedCategory !== 'ALL' ? CATEGORIES.find((c) => c.id === selectedCategory)?.label : ''} activities found
          </div>
          <div className="empty-state__text" style={{ fontSize: '12px', color: 'var(--color-text-secondary)', maxWidth: '420px', marginBottom: '16px', lineHeight: 1.4 }}>
            {searchQuery || startDate || statusFilter
              ? 'Try resetting the active search query or date range filters to view more events.'
              : `No activity records currently match the ${selectedCategory} category.`}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedCategory('ALL');
              setSearchQuery('');
              setDateRangePreset('ALL');
              setStartDate('');
              setEndDate('');
              setStatusFilter('');
              setSelectedStation('');
              setCurrentPage(1);
            }}
          >
            Show All Activities
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {logs.map((event) => {
            const { date, time } = formatDateTime(event.timestamp);
            const isFailed = event.status && event.status.toUpperCase() === 'FAILED';
            const isWarning = event.status && event.status.toUpperCase() === 'WARNING';

            return (
              <div
                key={event.id}
                onClick={() => handleResourceClick(event)}
                className="card"
                style={{
                  cursor: 'pointer',
                  padding: '12px 16px',
                  display: 'grid',
                  gridTemplateColumns: '110px 180px 1fr 180px 100px',
                  alignItems: 'center',
                  gap: '14px',
                  borderLeft: isFailed
                    ? '3px solid #EF4444'
                    : isWarning
                    ? '3px solid #F59E0B'
                    : '3px solid var(--palette-sage)',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
              >
                {/* 1. TIMESTAMP */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {time}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {date}
                  </div>
                </div>

                {/* 2. ACTOR */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--palette-chalk)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: 'var(--palette-sage)',
                      flexShrink: 0,
                    }}
                  >
                    {event.actor?.username ? event.actor.username.substring(0, 2).toUpperCase() : 'SYS'}
                  </div>
                  <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {event.actor?.username || event.actor_name || 'System Service'}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{event.actor?.role || 'SYSTEM'}</span>
                      {event.station_name && event.station_name !== 'Citywide' && (
                        <span>• {event.station_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. EVENT ACTION & DESCRIPTION */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                    <span className={`badge ${getCategoryBadgeClass(event.category)}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                      {event.category || 'SYSTEM'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                      {event.action}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.description}
                  </div>
                </div>

                {/* 4. RESOURCE LINK */}
                <div>
                  {event.resource_type ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResourceClick(event);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--palette-coastal-blue)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={`Open ${event.resource_type} in application`}
                    >
                      <span>{event.resource_type}: {event.resource_id || event.category}</span>
                      <ArrowRightIcon size={10} />
                    </button>
                  ) : (
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      —
                    </span>
                  )}
                </div>

                {/* 5. STATUS BADGE */}
                <div style={{ textAlign: 'right' }}>
                  <span
                    className={`badge ${isFailed ? 'badge--critical' : isWarning ? 'badge--high' : 'badge--verified'}`}
                    style={{ fontSize: '9px', textTransform: 'uppercase' }}
                  >
                    {isFailed ? <AlertCircleIcon size={10} /> : <CheckIcon size={10} />}
                    {event.status || 'SUCCESS'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION BAR */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: 'var(--palette-chalk)',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            marginTop: 'var(--space-sm)',
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div>
            Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} events
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '10px' }}
            >
              <ChevronLeftIcon size={12} />
              <span>Previous</span>
            </button>

            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', padding: '0 6px' }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '10px' }}
            >
              <span>Next</span>
              <ChevronRightIcon size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
