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

const TABS = ['Citas', 'Clientes', 'Conversaciones'] as const;
type Tab = (typeof TABS)[number];

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  completada: 'bg-blue-100 text-blue-800',
};

function Badge({ estado }: { estado: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[estado] ?? 'bg-gray-100 text-gray-700'}`}>
      {estado}
    </span>
  );
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function Dashboard() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [tab, setTab] = useState<Tab>('Citas');
  const [citas, setCitas] = useState<Cita[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getNegocios()
      .then((data: Negocio[]) => {
        setNegocios(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(() => setError('No se pudo conectar al backend. Verifica que esté corriendo.'));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    const loaders: Record<Tab, () => Promise<unknown>> = {
      Citas: () => getCitas(selectedId).then(setCitas),
      Clientes: () => getClientes(selectedId).then(setClientes),
      Conversaciones: () => getConversaciones(selectedId).then(setConversaciones),
    };
    loaders[tab]()
      .catch(() => setError(`Error al cargar ${tab.toLowerCase()}.`))
      .finally(() => setLoading(false));
  }, [selectedId, tab]);

  async function handleEstado(citaId: string, estado: string) {
    await updateCitaEstado(citaId, estado);
    setCitas((prev) => prev.map((c) => (c.id === citaId ? { ...c, estado } : c)));
  }

  const negocio = negocios.find((n) => n.id === selectedId);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">A</div>
          <span className="font-semibold text-lg text-gray-900">AgendaIA</span>
        </div>
        {negocios.length > 1 ? (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {negocios.map((n) => (
              <option key={n.id} value={n.id}>{n.nombre}</option>
            ))}
          </select>
        ) : negocio ? (
          <span className="text-sm text-gray-600 font-medium">{negocio.nombre}</span>
        ) : null}
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Citas', value: citas.length, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Clientes', value: clientes.length, color: 'bg-blue-50 text-blue-700' },
            { label: 'Conversaciones', value: conversaciones.length, color: 'bg-purple-50 text-purple-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm font-medium opacity-80">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t
                  ? 'bg-white border border-b-white border-gray-200 -mb-px text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">Cargando...</div>
        ) : (
          <>
            {/* CITAS */}
            {tab === 'Citas' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {citas.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No hay citas registradas.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Cliente', 'Servicio', 'Fecha y hora', 'Estado', 'Notas', 'Acción'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {citas.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{c.cliente_nombre || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{c.servicio || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(c.fecha_hora)}</td>
                          <td className="px-4 py-3"><Badge estado={c.estado} /></td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{c.notas || '—'}</td>
                          <td className="px-4 py-3">
                            <select
                              value={c.estado}
                              onChange={(e) => handleEstado(c.id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              {['pendiente', 'confirmada', 'completada', 'cancelada'].map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* CLIENTES */}
            {tab === 'Clientes' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {clientes.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No hay clientes registrados.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Nombre', 'WhatsApp', 'Registrado'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {clientes.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{c.nombre || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{c.whatsapp}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(c.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* CONVERSACIONES */}
            {tab === 'Conversaciones' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {conversaciones.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No hay conversaciones registradas.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['WhatsApp', 'Último mensaje', 'Total mensajes', 'Última actividad'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {conversaciones.map((c) => (
                        <tr key={c.cliente_whatsapp} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{c.cliente_whatsapp}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-sm truncate">{c.ultimo_mensaje || '—'}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{c.total_mensajes}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(c.ultima_fecha)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
