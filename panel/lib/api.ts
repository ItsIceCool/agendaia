const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function getNegocios() {
  const res = await fetch(`${API}/api/admin/negocios`);
  if (!res.ok) throw new Error('Error al obtener negocios');
  return res.json();
}

export async function getCitas(negocioId: string) {
  const res = await fetch(`${API}/api/admin/${negocioId}/citas`);
  if (!res.ok) throw new Error('Error al obtener citas');
  return res.json();
}

export async function getClientes(negocioId: string) {
  const res = await fetch(`${API}/api/admin/${negocioId}/clientes`);
  if (!res.ok) throw new Error('Error al obtener clientes');
  return res.json();
}

export async function getConversaciones(negocioId: string) {
  const res = await fetch(`${API}/api/admin/${negocioId}/conversaciones`);
  if (!res.ok) throw new Error('Error al obtener conversaciones');
  return res.json();
}

export async function updateCitaEstado(citaId: string, estado: string) {
  const res = await fetch(`${API}/api/admin/citas/${citaId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  });
  if (!res.ok) throw new Error('Error al actualizar cita');
  return res.json();
}
