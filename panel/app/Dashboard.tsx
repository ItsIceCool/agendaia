'use client';

import { useEffect, useState } from 'react';
import {
  getNegocios,
  getCitas,
  getClientes,
  getConversaciones,
  updateCitaEstado,
} from '@/lib/api';

type Negocio = { id: string; nombre: string; whatsapp: string };
type Cita = { id: string; cliente_nombre: string; servicio: string; fecha_hora: string; estado: string; notas: string };
type Cliente = { id: string; nombre: string; whatsapp: string; created_at: string };
type Conversacion = { cliente_whatsapp: string; ultima_fecha: string; total_mensajes: number; ultimo_mensaje: string };
type NavPage = 'agenda' | 'chat' | 'clientes' | 'servicios' | 'configuracion';
type ApptFilter = 'todas' | 'confirmadas' | 'pendientes';

const ESTADO_MAP: Record<string, { cls: string; label: string }> = {
  pendiente:  { cls: 'ag-pending',   label: 'Pendiente'  },
  confirmada: { cls: 'ag-confirmed', label: 'Confirmada' },
  cancelada:  { cls: 'ag-cancelled', label: 'Cancelada'  },
  completada: { cls: 'ag-done',      label: 'Completada' },
};

const COLORS = ['#2A7B6F','#C4956A','#6B5FA0','#C4584A','#8B5E3C','#B07A28'];
const DAYS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const PAGE_TITLES: Record<NavPage, string> = {
  agenda: 'Agenda de hoy', chat: 'Chat IA', clientes: 'Clientes',
  servicios: 'Servicios', configuracion: 'Configuración',
};

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function formatTime(iso: string) {
  if (!iso) return { time: '—', ampm: '' };
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes().toString().padStart(2, '0');
  return { time: `${h % 12 || 12}:${m}`, ampm: h >= 12 ? 'PM' : 'AM' };
}

function NavIcon({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <span style={{ width: 16, height: 16, flexShrink: 0, opacity: active ? 1 : 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </span>
  );
}

export default function Dashboard() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [page, setPage] = useState<NavPage>('agenda');
  const [citas, setCitas] = useState<Cita[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ApptFilter>('todas');
  const [today, setToday] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { setToday(new Date()); }, []);

  useEffect(() => {
    getNegocios()
      .then((data: Negocio[]) => { setNegocios(data); if (data.length) setSelectedId(data[0].id); })
      .catch(() => setError('No se pudo conectar al backend.'));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true); setError('');
    const load: Record<NavPage, () => Promise<unknown>> = {
      agenda:        () => getCitas(selectedId).then(setCitas),
      chat:          () => getConversaciones(selectedId).then(setConversaciones),
      clientes:      () => getClientes(selectedId).then(setClientes),
      servicios:     () => Promise.resolve(),
      configuracion: () => Promise.resolve(),
    };
    load[page]().catch(() => setError('Error al cargar datos.')).finally(() => setLoading(false));
  }, [selectedId, page]);

  async function handleEstado(citaId: string, estado: string) {
    await updateCitaEstado(citaId, estado);
    setCitas(prev => prev.map(c => c.id === citaId ? { ...c, estado } : c));
  }

  const negocio = negocios.find(n => n.id === selectedId);
  const todayStr = today.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  // Build week days
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    return { name: DAYS_ES[i], num: d.getDate(), isToday: d.toDateString() === today.toDateString() };
  });

  const filteredCitas = filter === 'todas' ? citas
    : filter === 'confirmadas' ? citas.filter(c => c.estado === 'confirmada')
    : citas.filter(c => c.estado === 'pendiente');

  const NAV: { id: NavPage; label: string; badge?: number; icon: React.ReactNode }[] = [
    { id: 'agenda', label: 'Agenda', badge: citas.length || undefined, icon: <svg viewBox="0 0 16 16" fill="none" style={{width:16,height:16}}><rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 7h14" stroke="currentColor" strokeWidth="1.3"/><path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
    { id: 'chat', label: 'Chat IA', badge: conversaciones.length || undefined, icon: <svg viewBox="0 0 16 16" fill="none" style={{width:16,height:16}}><path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> },
    { id: 'clientes', label: 'Clientes', icon: <svg viewBox="0 0 16 16" fill="none" style={{width:16,height:16}}><circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  ];
  const NAV2: { id: NavPage; label: string; icon: React.ReactNode }[] = [
    { id: 'servicios', label: 'Servicios', icon: <svg viewBox="0 0 16 16" fill="none" style={{width:16,height:16}}><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
    { id: 'configuracion', label: 'Configuración', icon: <svg viewBox="0 0 16 16" fill="none" style={{width:16,height:16}}><path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1.5V3M3.56 3.56l1.06 1.06M1.5 8H3M3.56 12.44l1.06-1.06M8 13v1.5M12.44 12.44l-1.06-1.06M14.5 8H13M12.44 3.56L11.38 4.62" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Sidebar ── */}
      <aside className="ag-sidebar">
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="ag-logo-icon">
              <svg viewBox="0 0 18 18" fill="none" style={{ width: 18, height: 18 }}>
                <rect x="1" y="1" width="7" height="7" rx="2" fill="white" opacity=".9"/>
                <rect x="10" y="1" width="7" height="7" rx="2" fill="white" opacity=".5"/>
                <rect x="1" y="10" width="7" height="7" rx="2" fill="white" opacity=".5"/>
                <rect x="10" y="10" width="7" height="7" rx="2" fill="white" opacity=".9"/>
              </svg>
            </div>
            <div>
              <div className="ag-logo-name">AgendaIA</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Panel Admin</div>
            </div>
          </div>
        </div>

        {/* Negocio */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          {negocios.length > 1 ? (
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit', fontSize: 12, color: 'var(--text)', outline: 'none' }}
            >
              {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#fff', flexShrink: 0 }}>
                {negocio ? initials(negocio.nombre) : 'SB'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{negocio?.nombre || 'Sin negocio'}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Plan Pro</div>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '8px 8px 4px' }}>Principal</div>
          {NAV.map(item => (
            <button key={item.id} className={`ag-nav-item${page === item.id ? ' ag-active' : ''}`} onClick={() => setPage(item.id)}>
              <NavIcon active={page === item.id}>{item.icon}</NavIcon>
              <span>{item.label}</span>
              {item.badge ? <span className="ag-nav-badge">{item.badge}</span> : null}
            </button>
          ))}
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '12px 8px 4px' }}>Configuración</div>
          {NAV2.map(item => (
            <button key={item.id} className={`ag-nav-item${page === item.id ? ' ag-active' : ''}`} onClick={() => setPage(item.id)}>
              <NavIcon active={page === item.id}>{item.icon}</NavIcon>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#fff', flexShrink: 0 }}>MG</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>María García</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Administradora</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ag-main">
        {/* Topbar */}
        <header className="ag-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{PAGE_TITLES[page]}</span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>— {todayStr}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <button className="ag-btn-icon" title="Notificaciones">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a5 5 0 015 5v3l1.5 2H1.5L3 9V6a5 5 0 015-5zM6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div className="ag-notif-count">3</div>
            </div>
            <button className="ag-btn ag-btn-primary" onClick={() => setModalOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              Nueva cita
            </button>
          </div>
        </header>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {error && (
            <div style={{ borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* ════ AGENDA ════ */}
          {page === 'agenda' && (
            <>
              {/* Metric cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {[
                  { label: 'Citas totales', value: citas.length, sub: 'registradas' },
                  { label: 'Confirmadas', value: citas.filter(c => c.estado === 'confirmada').length, sub: `${citas.filter(c => c.estado === 'pendiente').length} pendientes` },
                  { label: 'Completadas', value: citas.filter(c => c.estado === 'completada').length, sub: `${citas.filter(c => c.estado === 'cancelada').length} canceladas` },
                ].map(m => (
                  <div key={m.label} className="ag-metric-card">
                    <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{m.label}</div>
                    <div className="ag-metric-value">{m.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Day strip */}
              <div className="ag-day-strip">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Semana actual</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {weekDays.map(d => (
                    <div key={d.num} className={`ag-day-pill${d.isToday ? ' ag-today' : ''}`}>
                      <div className="ag-day-name">{d.name}</div>
                      <div className="ag-day-num">{d.num}</div>
                      <div style={{ display: 'flex', gap: 2 }}><div className="ag-day-dot" /></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Two columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>

                {/* Appointment list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>Citas del día</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{today.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 10, padding: 3 }}>
                      {(['todas','confirmadas','pendientes'] as ApptFilter[]).map(f => (
                        <button key={f} className={`ag-tab${filter === f ? ' ag-active' : ''}`} onClick={() => setFilter(f)}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading ? (
                    <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text3)' }}>Cargando…</div>
                  ) : filteredCitas.length === 0 ? (
                    <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text3)' }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text2)' }}>Sin citas registradas</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {filteredCitas.map((c, i) => {
                        const { time, ampm } = formatTime(c.fecha_hora);
                        const s = ESTADO_MAP[c.estado] ?? { cls: 'ag-done', label: c.estado };
                        return (
                          <div key={c.id} className="ag-appt-card">
                            <div style={{ textAlign: 'center', minWidth: 52 }}>
                              <div className="ag-time-main">{time}</div>
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{ampm}</div>
                            </div>
                            <div style={{ width: 1, height: 44, background: 'var(--border)', flexShrink: 0 }} />
                            <div style={{ width: 3, height: 44, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{c.cliente_nombre || '—'}</div>
                              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{c.servicio || '—'}</div>
                              {c.notas && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{c.notas}</div>}
                            </div>
                            <span className={`ag-badge ${s.cls}`}><span className="ag-dot" />{s.label}</span>
                            <select
                              value={c.estado}
                              onChange={e => handleEstado(c.id, e.target.value)}
                              style={{ fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', background: 'var(--bg)', fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
                            >
                              {['pendiente','confirmada','completada','cancelada'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right widgets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Summary */}
                  <div className="ag-summary-card">
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>Resumen del día</div>
                    <div className="ag-summary-big">{citas.length}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 22 }}>citas registradas</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { val: citas.filter(c => c.estado === 'confirmada').length, label: 'Confirmadas' },
                        { val: citas.filter(c => c.estado === 'pendiente').length, label: 'Pendientes' },
                        { val: citas.filter(c => c.estado === 'completada').length, label: 'Completadas' },
                        { val: citas.filter(c => c.estado === 'cancelada').length, label: 'Canceladas' },
                      ].map(s => (
                        <div key={s.label} style={{ background: 'rgba(255,255,255,.07)', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 20, fontWeight: 500, lineHeight: 1, marginBottom: 2 }}>{s.val}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* IA Activity */}
                  <div className="ag-activity-card">
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Agente IA</span>
                      <div className="ag-ia-badge"><div className="ag-ia-dot" />Activo</div>
                    </div>
                    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 280, overflowY: 'auto' }}>
                      {conversaciones.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Sin conversaciones recientes</div>
                      ) : conversaciones.slice(0, 4).map((c, i) => (
                        <div key={c.cliente_whatsapp} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#fff', flexShrink: 0 }}>
                            {c.cliente_whatsapp.slice(-2)}
                          </div>
                          <div className="ag-chat-bubble">
                            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2 }}>{c.cliente_whatsapp}</div>
                            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.45 }}>{c.ultimo_mensaje || '—'}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{formatDate(c.ultima_fecha)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ════ CHAT IA ════ */}
          {page === 'chat' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>Conversaciones del Agente IA</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{conversaciones.length} conversaciones</div>
                </div>
                <div className="ag-ia-badge"><div className="ag-ia-dot" />{conversaciones.length} chats</div>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text3)' }}>Cargando…</div>
                ) : conversaciones.length === 0 ? (
                  <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text3)' }}>No hay conversaciones.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="ag-table">
                      <thead><tr><th>Cliente</th><th>Último mensaje</th><th>Total</th><th>Última actividad</th></tr></thead>
                      <tbody>
                        {conversaciones.map(c => (
                          <tr key={c.cliente_whatsapp}>
                            <td><b>{c.cliente_whatsapp}</b></td>
                            <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ultimo_mensaje || '—'}</td>
                            <td>{c.total_mensajes}</td>
                            <td style={{ color: 'var(--text3)' }}>{formatDate(c.ultima_fecha)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ════ CLIENTES ════ */}
          {page === 'clientes' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>Clientes</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{clientes.length} registrados</div>
                </div>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text3)' }}>Cargando…</div>
                ) : clientes.length === 0 ? (
                  <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text3)' }}>No hay clientes registrados.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="ag-table">
                      <thead><tr><th>Cliente</th><th>WhatsApp</th><th>Registrado</th></tr></thead>
                      <tbody>
                        {clientes.map((c, i) => (
                          <tr key={c.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#fff', flexShrink: 0 }}>
                                  {initials(c.nombre || '??')}
                                </div>
                                <span style={{ fontWeight: 500 }}>{c.nombre || '—'}</span>
                              </div>
                            </td>
                            <td style={{ color: 'var(--text2)' }}>{c.whatsapp}</td>
                            <td style={{ color: 'var(--text3)' }}>{formatDate(c.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ════ SERVICIOS ════ */}
          {page === 'servicios' && (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⚙️</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text2)', marginBottom: 4 }}>Próximamente</div>
              <div style={{ fontSize: 12 }}>Los servicios se configurarán desde aquí</div>
            </div>
          )}

          {/* ════ CONFIGURACIÓN ════ */}
          {page === 'configuracion' && (
            <div style={{ maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Datos del negocio</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Nombre</label>
                <input className="ag-input" defaultValue={negocio?.nombre || ''} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>WhatsApp</label>
                <input className="ag-input" defaultValue={negocio?.whatsapp || ''} />
              </div>
              <button className="ag-btn ag-btn-primary">Guardar cambios</button>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal: Nueva cita ── */}
      <div className={`ag-modal-overlay${modalOpen ? ' ag-open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <div className="ag-modal">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="ag-modal-title">Nueva cita</div>
            <button className="ag-btn-icon" onClick={() => setModalOpen(false)}>✕</button>
          </div>
          {[
            { label: 'Cliente', placeholder: 'Nombre del cliente', type: 'text' },
            { label: 'WhatsApp', placeholder: '+52 81 XXXX XXXX', type: 'tel' },
            { label: 'Servicio', placeholder: 'Servicio', type: 'text' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>{f.label}</label>
              <input className="ag-input" type={f.type} placeholder={f.placeholder} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Fecha</label>
              <input className="ag-input" type="date" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Hora</label>
              <input className="ag-input" type="time" defaultValue="10:00" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
            <button className="ag-btn ag-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="ag-btn ag-btn-primary" onClick={() => setModalOpen(false)}>Guardar cita</button>
          </div>
        </div>
      </div>
    </div>
  );
}
