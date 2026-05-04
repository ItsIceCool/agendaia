'use client';

import { useEffect, useState } from 'react';
import { getNegocios, getCitas, getClientes, getConversaciones, updateCitaEstado } from '@/lib/api';

type Negocio = { id: string; nombre: string; whatsapp: string };
type Cita = { id: string; cliente_nombre: string; servicio: string; fecha_hora: string; estado: string; notas: string };
type Cliente = { id: string; nombre: string; whatsapp: string; created_at: string };
type Conv = { cliente_whatsapp: string; ultima_fecha: string; total_mensajes: number; ultimo_mensaje: string };
type Page = 'agenda' | 'chat' | 'clientes' | 'servicios' | 'configuracion';

const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const SERVICES = [
  { name:'Corte de cabello', icon:'✂️', duration:'45 min' },
  { name:'Tinte completo', icon:'🎨', duration:'90 min' },
  { name:'Manicure', icon:'💅', duration:'45 min' },
  { name:'Pedicure', icon:'🦶', duration:'60 min' },
  { name:'Facial básico', icon:'✨', duration:'60 min' },
  { name:'Mechas', icon:'💇', duration:'120 min' },
];
const HORARIOS = [
  { day: 'Lunes', hrs: '9:00 – 7:00 pm' }, { day: 'Martes', hrs: '9:00 – 7:00 pm' },
  { day: 'Miércoles', hrs: '9:00 – 7:00 pm' }, { day: 'Jueves', hrs: '9:00 – 7:00 pm' },
  { day: 'Viernes', hrs: '9:00 – 7:00 pm' }, { day: 'Sábado', hrs: '10:00 – 6:00 pm' },
  { day: 'Domingo', hrs: 'Cerrado', closed: true },
];
const COLORS = ['#2A7B6F','#C4956A','#6B5FA0','#C4584A','#8B5E3C','#B07A28'];

function initials(name: string) {
  return name?.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() || '?';
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
function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}
function statusClass(estado: string) {
  const map: Record<string, string> = { confirmada: 's-confirmed', pendiente: 's-pending', completada: 's-done', cancelada: 's-cancelled' };
  return map[estado] ?? 's-pending';
}
function statusLabel(estado: string) {
  const map: Record<string, string> = { confirmada: 'Confirmada', pendiente: 'Pendiente', completada: 'Completada', cancelada: 'Cancelada' };
  return map[estado] ?? estado;
}
function barColor(estado: string) {
  const map: Record<string, string> = { confirmada: '#2A7B6F', pendiente: '#B07A28', completada: '#A09890', cancelada: '#C4584A' };
  return map[estado] ?? '#C4956A';
}

export default function Panel() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [page, setPage] = useState<Page>('agenda');
  const [citas, setCitas] = useState<Cita[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [citaFilter, setCitaFilter] = useState<'todas' | 'confirmadas' | 'pendientes'>('todas');
  const [modalCita, setModalCita] = useState(false);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const todayStr = today.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const negocio = negocios.find(n => n.id === selectedId);

  useEffect(() => {
    getNegocios().then((data: Negocio[]) => {
      setNegocios(data);
      if (data.length > 0) setSelectedId(data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    Promise.all([
      getCitas(selectedId).then(setCitas),
      getClientes(selectedId).then(setClientes),
      getConversaciones(selectedId).then(setConvs),
    ]).finally(() => setLoading(false));
  }, [selectedId]);

  async function handleEstado(citaId: string, estado: string) {
    await updateCitaEstado(citaId, estado);
    setCitas(prev => prev.map(c => c.id === citaId ? { ...c, estado } : c));
  }

  const filteredCitas = citaFilter === 'todas' ? citas
    : citaFilter === 'confirmadas' ? citas.filter(c => c.estado === 'confirmada')
    : citas.filter(c => c.estado === 'pendiente');

  const todayCitas = citas.filter(c => {
    if (!c.fecha_hora) return false;
    const d = new Date(c.fecha_hora);
    return d.toDateString() === today.toDateString();
  });
  const confirmed = citas.filter(c => c.estado === 'confirmada').length;
  const pending = citas.filter(c => c.estado === 'pendiente').length;

  // Week days
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const count = citas.filter(c => c.fecha_hora && new Date(c.fecha_hora).toDateString() === d.toDateString()).length;
    return { d, count, isToday: d.toDateString() === today.toDateString() };
  });

  const pageTitles: Record<Page, string> = { agenda: 'Agenda de hoy', chat: 'Chat IA', clientes: 'Clientes', servicios: 'Servicios', configuracion: 'Configuración' };

  return (
    <div style={{ display: 'flex' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">
              <svg viewBox="0 0 18 18" fill="none">
                <rect x="1" y="1" width="7" height="7" rx="2" fill="white" opacity=".9"/>
                <rect x="10" y="1" width="7" height="7" rx="2" fill="white" opacity=".5"/>
                <rect x="1" y="10" width="7" height="7" rx="2" fill="white" opacity=".5"/>
                <rect x="10" y="10" width="7" height="7" rx="2" fill="white" opacity=".9"/>
              </svg>
            </div>
            <div className="logo-text">
              <span className="logo-name">AgendaIA</span>
              <span className="logo-sub">Panel Admin</span>
            </div>
          </div>
        </div>

        <div className="sidebar-salon">
          <div className="salon-selector">
            <div className="salon-avatar">{negocio ? initials(negocio.nombre) : 'A'}</div>
            <div className="salon-info">
              <div className="salon-name">{negocio?.nombre ?? 'Cargando...'}</div>
              <div className="salon-plan">Plan Pro</div>
            </div>
            <span style={{ color: 'var(--text3)', fontSize: 10 }}>▾</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Principal</span>
          <button className={`nav-item${page === 'agenda' ? ' active' : ''}`} onClick={() => setPage('agenda')}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 7h14" stroke="currentColor" strokeWidth="1.3"/><path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <span>Agenda</span>
            {citas.length > 0 && <span className="nav-badge">{citas.length}</span>}
          </button>
          <button className={`nav-item${page === 'chat' ? ' active' : ''}`} onClick={() => setPage('chat')}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
            <span>Chat IA</span>
            {convs.length > 0 && <span className="nav-badge">{convs.length}</span>}
          </button>
          <button className={`nav-item${page === 'clientes' ? ' active' : ''}`} onClick={() => setPage('clientes')}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <span>Clientes</span>
          </button>
          <span className="nav-section-label" style={{ marginTop: 8 }}>Configuración</span>
          <button className={`nav-item${page === 'servicios' ? ' active' : ''}`} onClick={() => setPage('servicios')}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <span>Servicios</span>
          </button>
          <button className={`nav-item${page === 'configuracion' ? ' active' : ''}`} onClick={() => setPage('configuracion')}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3"/><path d="M13.3 6.7l-1-1.73a1 1 0 00-.87-.5h-.01a1 1 0 00-.87.5l-.5.87M8 1.5V3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <span>Configuración</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">AD</div>
            <div>
              <div className="user-name">Administrador</div>
              <div className="user-role">Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="page-title">{pageTitles[page]}</span>
            <span className="page-date">— {todayStr}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="notif-wrap">
              <button className="btn-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a5 5 0 015 5v3l1.5 2H1.5L3 9V6a5 5 0 015-5zM6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {pending > 0 && <div className="notif-count">{pending}</div>}
            </div>
            <button className="btn btn-primary" onClick={() => setModalCita(true)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              Nueva cita
            </button>
          </div>
        </header>

        <div className="content">
          {loading && <div style={{ color: 'var(--text3)', fontSize: 13 }}>Cargando...</div>}

          {/* ── AGENDA ── */}
          {page === 'agenda' && (
            <>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Citas totales</div>
                  <div className="metric-value">{citas.length}</div>
                  <div className="metric-change neutral">{pending} pendientes</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Confirmadas</div>
                  <div className="metric-value">{confirmed}</div>
                  <div className="metric-change up">listas para atender</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Clientes</div>
                  <div className="metric-value">{clientes.length}</div>
                  <div className="metric-change neutral">registrados</div>
                </div>
              </div>

              <div className="day-strip">
                <div className="day-strip-header">
                  <span className="day-strip-title">Semana actual</span>
                </div>
                <div className="days-row">
                  {weekDays.map(({ d, count, isToday }, i) => (
                    <div key={i} className={`day-pill${isToday ? ' today' : ''}${count > 0 ? ' has-appts' : ''}`}>
                      <div className="day-name">{DAYS_SHORT[i]}</div>
                      <div className="day-num">{d.getDate()}</div>
                      <div className="day-dots">
                        {Array.from({ length: Math.min(count, 3) }, (_, j) => (
                          <div key={j} className="day-dot" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="two-col">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="section-header">
                    <div>
                      <div className="section-title">Citas</div>
                      <div className="section-sub">{todayStr}</div>
                    </div>
                    <div className="tabs">
                      {(['todas','confirmadas','pendientes'] as const).map(f => (
                        <button key={f} className={`tab${citaFilter === f ? ' active' : ''}`} onClick={() => setCitaFilter(f)}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="appt-list">
                    {filteredCitas.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">📅</div>
                        <div className="empty-title">Sin citas en este filtro</div>
                      </div>
                    ) : filteredCitas.map(c => {
                      const { time, ampm } = formatTime(c.fecha_hora);
                      return (
                        <div key={c.id} className="appt-card">
                          <div className="appt-time">
                            <div className="time-main">{time}</div>
                            <div className="time-ampm">{ampm}</div>
                          </div>
                          <div className="appt-divider" />
                          <div className="appt-color-bar" style={{ background: barColor(c.estado) }} />
                          <div className="appt-info">
                            <div className="appt-client">{c.cliente_nombre || '—'}</div>
                            <div className="appt-service">{c.servicio || '—'}</div>
                            {c.notas && <div className="appt-meta">{c.notas}</div>}
                          </div>
                          <span className={`status-badge ${statusClass(c.estado)}`}>
                            <span className="status-dot" />{statusLabel(c.estado)}
                          </span>
                          <div className="appt-actions">
                            <select
                              value={c.estado}
                              onChange={e => handleEstado(c.id, e.target.value)}
                              style={{ fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', background: 'var(--bg)', fontFamily: 'inherit', cursor: 'pointer' }}
                              onClick={e => e.stopPropagation()}
                            >
                              {['pendiente','confirmada','completada','cancelada'].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="summary-card">
                    <div className="summary-title">Resumen</div>
                    <div className="summary-big">{citas.length}</div>
                    <div className="summary-sub">citas en total</div>
                    <div className="summary-stats">
                      <div className="summary-stat">
                        <div className="summary-stat-val">{confirmed}</div>
                        <div className="summary-stat-label">Confirmadas</div>
                      </div>
                      <div className="summary-stat">
                        <div className="summary-stat-val">{pending}</div>
                        <div className="summary-stat-label">Pendientes</div>
                      </div>
                      <div className="summary-stat">
                        <div className="summary-stat-val">{clientes.length}</div>
                        <div className="summary-stat-label">Clientes</div>
                      </div>
                      <div className="summary-stat">
                        <div className="summary-stat-val">{convs.length}</div>
                        <div className="summary-stat-label">Chats IA</div>
                      </div>
                    </div>
                  </div>

                  <div className="activity-card">
                    <div className="activity-header">
                      <span className="activity-title">Agente IA</span>
                      <div className="ia-badge"><div className="ia-dot" />Activo</div>
                    </div>
                    <div className="chat-feed">
                      {convs.length === 0 ? (
                        <div style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>Sin conversaciones aún.</div>
                      ) : convs.slice(0, 5).map((c, i) => (
                        <div key={c.cliente_whatsapp} className="chat-item">
                          <div className="chat-avatar" style={{ background: COLORS[i % COLORS.length], color: '#fff' }}>
                            {c.cliente_whatsapp.slice(-4)}
                          </div>
                          <div className="chat-bubble">
                            <div className="chat-name">{c.cliente_whatsapp}</div>
                            <div className="chat-msg">{c.ultimo_mensaje || '...'}</div>
                            <div className="chat-time">{formatDate(c.ultima_fecha)}</div>
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
              <div className="section-header">
                <div>
                  <div className="section-title">Conversaciones del Agente IA</div>
                  <div className="section-sub">{convs.length} conversaciones registradas</div>
                </div>
                <div className="ia-badge"><div className="ia-dot" />Activo</div>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>WhatsApp</th><th>Último mensaje</th><th>Mensajes</th><th>Última actividad</th></tr></thead>
                    <tbody>
                      {convs.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>Sin conversaciones aún.</td></tr>
                      ) : convs.map((c, i) => (
                        <tr key={c.cliente_whatsapp}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="stylist-avatar" style={{ background: COLORS[i % COLORS.length] }}>{c.cliente_whatsapp.slice(-4)}</div>
                              <span style={{ fontWeight: 500 }}>{c.cliente_whatsapp}</span>
                            </div>
                          </td>
                          <td style={{ maxWidth: 280 }}>{c.ultimo_mensaje || '—'}</td>
                          <td style={{ textAlign: 'center' }}>{c.total_mensajes}</td>
                          <td style={{ color: 'var(--text3)' }}>{formatDate(c.ultima_fecha)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── CLIENTES ── */}
          {page === 'clientes' && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">Clientes</div>
                  <div className="section-sub">{clientes.length} clientes registrados</div>
                </div>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Cliente</th><th>WhatsApp</th><th>Registrado</th></tr></thead>
                    <tbody>
                      {clientes.length === 0 ? (
                        <tr><td colSpan={3} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>Sin clientes aún.</td></tr>
                      ) : clientes.map((c, i) => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="stylist-avatar" style={{ background: COLORS[i % COLORS.length], width: 30, height: 30 }}>{initials(c.nombre || c.whatsapp)}</div>
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
              </div>
            </>
          )}

          {/* ── SERVICIOS ── */}
          {page === 'servicios' && (
            <>
              <div className="section-header">
                <div className="section-title">Servicios</div>
              </div>
              <div className="services-grid">
                {SERVICES.map(s => (
                  <div key={s.name} className="service-card">
                    <div className="service-icon">{s.icon}</div>
                    <div className="service-name">{s.name}</div>
                    <div className="service-duration">{s.duration}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── CONFIGURACIÓN ── */}
          {page === 'configuracion' && (
            <>
              <div className="section-title">Configuración del negocio</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 700 }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Datos del negocio</div>
                  <div className="form-row"><label className="form-label">Nombre</label><input className="form-input" defaultValue={negocio?.nombre ?? ''} /></div>
                  <div className="form-row"><label className="form-label">WhatsApp</label><input className="form-input" defaultValue={negocio?.whatsapp ?? ''} /></div>
                  <div className="form-row"><label className="form-label">Mensaje de bienvenida</label><textarea className="form-input" rows={3} defaultValue="Hola 👋 Soy tu asistente virtual. ¿En qué te puedo ayudar?" style={{ resize: 'vertical' }} /></div>
                  <button className="btn btn-primary" style={{ marginTop: 4 }}>Guardar cambios</button>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Horarios de atención</div>
                  {HORARIOS.map((h, i) => (
                    <div key={h.day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < HORARIOS.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                      <span style={{ fontWeight: 500, color: h.closed ? 'var(--text3)' : 'var(--text)' }}>{h.day}</span>
                      <span style={{ color: h.closed ? 'var(--coral)' : 'var(--text2)' }}>{h.hrs}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal nueva cita */}
      <div className={`modal-overlay${modalCita ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModalCita(false); }}>
        <div className="modal">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="modal-title" style={{ margin: 0 }}>Nueva cita</div>
            <button className="btn-icon" onClick={() => setModalCita(false)}>✕</button>
          </div>
          <div className="form-row"><label className="form-label">Cliente</label><input className="form-input" placeholder="Nombre del cliente" /></div>
          <div className="form-row"><label className="form-label">WhatsApp</label><input className="form-input" placeholder="+52 81 XXXX XXXX" /></div>
          <div className="form-row">
            <label className="form-label">Servicio</label>
            <select className="form-select">
              {SERVICES.map(s => <option key={s.name}>{s.name} — {s.duration}</option>)}
            </select>
          </div>
          <div className="form-row-2">
            <div><label className="form-label">Fecha</label><input className="form-input" type="date" /></div>
            <div><label className="form-label">Hora</label><input className="form-input" type="time" defaultValue="10:00" /></div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setModalCita(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => setModalCita(false)}>Guardar cita</button>
          </div>
        </div>
      </div>
    </div>
  );
}
