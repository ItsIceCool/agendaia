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

const ESTADO_STATUS: Record<string, { cls: string; label: string }> = {
  pendiente:  { cls: 's-pending',   label: 'Pendiente'  },
  confirmada: { cls: 's-confirmed', label: 'Confirmada' },
  cancelada:  { cls: 's-cancelled', label: 'Cancelada'  },
  completada: { cls: 's-done',      label: 'Completada' },
};

const AVATAR_COLORS = ['#2A7B6F','#C4956A','#6B5FA0','#C4584A','#8B5E3C','#B07A28'];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function formatTime(iso: string) {
  if (!iso) return { time: '—', ampm: '' };
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return { time: `${h12}:${m}`, ampm };
}

const DAYS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export default function Dashboard() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [page, setPage] = useState<NavPage>('agenda');
  const [citas, setCitas] = useState<Cita[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apptFilter, setApptFilter] = useState<'todas'|'confirmadas'|'pendientes'>('todas');
  const [today, setToday] = useState<Date>(new Date(0));
  const [modalCita, setModalCita] = useState(false);

  useEffect(() => {
    setToday(new Date());
  }, []);

  useEffect(() => {
    getNegocios()
      .then((data: Negocio[]) => {
        setNegocios(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(() => setError('No se pudo conectar al backend.'));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    const loaders: Record<NavPage, () => Promise<unknown>> = {
      agenda:         () => getCitas(selectedId).then(setCitas),
      chat:           () => getConversaciones(selectedId).then(setConversaciones),
      clientes:       () => getClientes(selectedId).then(setClientes),
      servicios:      () => Promise.resolve(),
      configuracion:  () => Promise.resolve(),
    };
    loaders[page]()
      .catch(() => setError(`Error al cargar datos.`))
      .finally(() => setLoading(false));
  }, [selectedId, page]);

  async function handleEstado(citaId: string, estado: string) {
    await updateCitaEstado(citaId, estado);
    setCitas(prev => prev.map(c => c.id === citaId ? { ...c, estado } : c));
  }

  const negocio = negocios.find(n => n.id === selectedId);
  const negocioInitials = negocio ? initials(negocio.nombre) : 'SB';

  const todayStr = today.getTime() === 0 ? '' : today.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayFull = today.getTime() === 0 ? '' : today.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });

  const weekDays: { date: Date; name: string; num: number; isToday: boolean }[] = [];
  if (today.getTime() !== 0) {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      weekDays.push({ date: d, name: DAYS_ES[i], num: d.getDate(), isToday: d.toDateString() === today.toDateString() });
    }
  }

  const filteredCitas = apptFilter === 'todas' ? citas
    : apptFilter === 'confirmadas' ? citas.filter(c => c.estado === 'confirmada')
    : citas.filter(c => c.estado === 'pendiente');

  const PAGE_TITLES: Record<NavPage, string> = {
    agenda: 'Agenda de hoy', chat: 'Chat IA', clientes: 'Clientes', servicios: 'Servicios', configuracion: 'Configuración'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo-icon">
              <svg viewBox="0 0 18 18" fill="none" style={{ width: 18, height: 18 }}>
                <rect x="1" y="1" width="7" height="7" rx="2" fill="white" opacity=".9"/>
                <rect x="10" y="1" width="7" height="7" rx="2" fill="white" opacity=".5"/>
                <rect x="1" y="10" width="7" height="7" rx="2" fill="white" opacity=".5"/>
                <rect x="10" y="10" width="7" height="7" rx="2" fill="white" opacity=".9"/>
              </svg>
            </div>
            <div>
              <div className="logo-name">AgendaIA</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Panel Admin</div>
            </div>
          </div>
        </div>

        {/* Negocio selector */}
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
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#fff', flexShrink: 0 }}>{negocioInitials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{negocio?.nombre || 'Sin negocio'}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Plan Pro</div>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '8px 8px 4px' }}>Principal</div>
          {([
            { id: 'agenda', label: 'Agenda', badge: citas.length || null, icon: <svg className="nav-icon-svg" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 7h14" stroke="currentColor" strokeWidth="1.3"/><path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
            { id: 'chat', label: 'Chat IA', badge: conversaciones.length || null, icon: <svg className="nav-icon-svg" viewBox="0 0 16 16" fill="none"><path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> },
            { id: 'clientes', label: 'Clientes', badge: null, icon: <svg className="nav-icon-svg" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
          ] as { id: NavPage; label: string; badge: number | null; icon: React.ReactNode }[]).map(item => (
            <button key={item.id} className={`nav-item${page === item.id ? ' active' : ''}`} onClick={() => setPage(item.id)}>
              <span style={{ width: 16, height: 16, flexShrink: 0, opacity: page === item.id ? 1 : 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </button>
          ))}

          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '12px 8px 4px' }}>Configuración</div>
          {([
            { id: 'servicios', label: 'Servicios', icon: <svg className="nav-icon-svg" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
            { id: 'configuracion', label: 'Configuración', icon: <svg className="nav-icon-svg" viewBox="0 0 16 16" fill="none"><path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3"/><path d="M13.3 6.7l-1-1.73a1 1 0 00-.87-.5h-.01a1 1 0 00-.87.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M8 1.5V3M3.56 3.56l1.06 1.06M1.5 8H3M3.56 12.44l1.06-1.06M8 13v1.5M12.44 12.44l-1.06-1.06M14.5 8H13M12.44 3.56L11.38 4.62" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
          ] as { id: NavPage; label: string; icon: React.ReactNode }[]).map(item => (
            <button key={item.id} className={`nav-item${page === item.id ? ' active' : ''}`} onClick={() => setPage(item.id)}>
              <span style={{ width: 16, height: 16, flexShrink: 0, opacity: page === item.id ? 1 : 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#fff', flexShrink: 0 }}>MG</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>María García</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Administradora</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{PAGE_TITLES[page]}</span>
            {todayStr && <span style={{ fontSize: 12, color: 'var(--text3)' }}>— {todayStr}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <button className="btn-icon" title="Notificaciones">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a5 5 0 015 5v3l1.5 2H1.5L3 9V6a5 5 0 015-5zM6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div className="notif-count">3</div>
            </div>
            <button className="btn btn-primary" onClick={() => setModalCita(true)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              Nueva cita
            </button>
          </div>
        </header>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {error && <div style={{ borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', fontSize: 13 }}>{error}</div>}

          {/* ── AGENDA ── */}
          {page === 'agenda' && (
            <>
              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                <div className="metric-card">
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Citas totales</div>
                  <div className="metric-value">{citas.length}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>registradas</div>
                </div>
                <div className="metric-card">
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Confirmadas</div>
                  <div className="metric-value">{citas.filter(c => c.estado === 'confirmada').length}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{citas.filter(c => c.estado === 'pendiente').length} pendientes</div>
                </div>
                <div className="metric-card">
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Completadas</div>
                  <div className="metric-value">{citas.filter(c => c.estado === 'completada').length}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{citas.filter(c => c.estado === 'cancelada').length} canceladas</div>
                </div>
              </div>

              {/* Day strip */}
              {weekDays.length > 0 && (
                <div className="day-strip">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Semana actual</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {weekDays.map(d => (
                      <div key={d.num} className={`day-pill${d.isToday ? ' today' : ' has-appts'}`}>
                        <div className="day-name-lbl" style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{d.name}</div>
                        <div className="day-num-lbl" style={{ fontSize: 16, fontWeight: 500, lineHeight: 1, marginBottom: 5 }}>{d.num}</div>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <div className="day-dot" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Two column: appointments + widgets */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
                {/* Appointments */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>Citas del día</div>
                      {todayFull && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{todayFull}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 10, padding: 3 }}>
                      {(['todas','confirmadas','pendientes'] as const).map(f => (
                        <button key={f} className={`tab-btn${apptFilter === f ? ' active' : ''}`} onClick={() => setApptFilter(f)}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)' }}>Cargando…</div>
                  ) : filteredCitas.length === 0 ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)' }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text2)', marginBottom: 4 }}>Sin citas registradas</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {filteredCitas.map((c, i) => {
                        const { time, ampm } = formatTime(c.fecha_hora);
                        const s = ESTADO_STATUS[c.estado] ?? { cls: 's-done', label: c.estado };
                        const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                        return (
                          <div key={c.id} className="appt-card">
                            <div style={{ textAlign: 'center', minWidth: 52 }}>
                              <div className="time-main">{time}</div>
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{ampm}</div>
                            </div>
                            <div style={{ width: 1, height: 44, background: 'var(--border)', flexShrink: 0 }} />
                            <div style={{ width: 3, height: 44, borderRadius: 2, background: color, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{c.cliente_nombre || '—'}</div>
                              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{c.servicio || '—'}</div>
                              {c.notas && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{c.notas}</div>}
                            </div>
                            <span className={`status-badge ${s.cls}`}><span className="status-dot" />{s.label}</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <select
                                value={c.estado}
                                onChange={e => handleEstado(c.id, e.target.value)}
                                style={{ fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', background: 'var(--bg)', fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}
                              >
                                {['pendiente','confirmada','completada','cancelada'].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right widgets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Summary card */}
                  <div className="summary-card">
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>Resumen del día</div>
                    <div className="summary-big">{citas.length}</div>
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
                  <div className="activity-card">
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Agente IA</span>
                      <div className="ia-badge"><div className="ia-dot" />Activo</div>
                    </div>
                    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 280, overflowY: 'auto' }}>
                      {conversaciones.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: '16px 0' }}>Sin conversaciones recientes</div>
                      ) : conversaciones.slice(0, 4).map((c, i) => (
                        <div key={c.cliente_whatsapp} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#fff', flexShrink: 0 }}>
                            {c.cliente_whatsapp.slice(-2)}
                          </div>
                          <div className="chat-bubble">
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

          {/* ── CHAT IA ── */}
          {page === 'chat' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>Conversaciones del Agente IA</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{conversaciones.length} conversaciones</div>
                </div>
                <div className="ia-badge"><div className="ia-dot" />{conversaciones.length} chats</div>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)' }}>Cargando…</div>
                ) : conversaciones.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)' }}>No hay conversaciones registradas.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Cliente</th><th>Último mensaje</th><th>Total</th><th>Última actividad</th>
                        </tr>
                      </thead>
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

          {/* ── CLIENTES ── */}
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
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)' }}>Cargando…</div>
                ) : clientes.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)' }}>No hay clientes registrados.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr><th>Cliente</th><th>WhatsApp</th><th>Registrado</th></tr>
                      </thead>
                      <tbody>
                        {clientes.map((c, i) => (
                          <tr key={c.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#fff', flexShrink: 0 }}>{initials(c.nombre || '??')}</div>
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

          {/* ── SERVICIOS ── */}
          {page === 'servicios' && (
            <>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Servicios</div>
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>⚙️</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text2)' }}>Próximamente</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Los servicios se configurarán desde aquí</div>
              </div>
            </>
          )}

          {/* ── CONFIGURACIÓN ── */}
          {page === 'configuracion' && (
            <>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Configuración del negocio</div>
              <div style={{ maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Datos del negocio</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Nombre</label>
                  <input className="form-input" defaultValue={negocio?.nombre || ''} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>WhatsApp</label>
                  <input className="form-input" defaultValue={negocio?.whatsapp || ''} />
                </div>
                <button className="btn btn-primary">Guardar cambios</button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal: Nueva cita */}
      <div className={`modal-overlay${modalCita ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModalCita(false); }}>
        <div className="modal">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="modal-title">Nueva cita</div>
            <button className="btn-icon" onClick={() => setModalCita(false)}>✕</button>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Cliente</label>
            <input className="form-input" placeholder="Nombre del cliente" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>WhatsApp</label>
            <input className="form-input" placeholder="+52 81 XXXX XXXX" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Servicio</label>
            <input className="form-input" placeholder="Servicio" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Fecha</label>
              <input className="form-input" type="date" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Hora</label>
              <input className="form-input" type="time" defaultValue="10:00" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
            <button className="btn btn-ghost" onClick={() => setModalCita(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => setModalCita(false)}>Guardar cita</button>
          </div>
        </div>
      </div>
    </div>
  );
}
