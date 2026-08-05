import { useState, useEffect, useMemo } from 'react';
import { obtenerTodosLosPartidos } from '../useAutoSave';
import { calcularIndicadoresPorClub, filtrarPartidos } from '../utils/indicadoresClub';

const C = {
  azul: '#0d1f4e', celeste: '#c6dbf5', verde: '#1a7a3a', rojo: '#e03030',
  bordo: '#7a1030', naranja: '#c96a1c', gris: '#5f5f5f',
  peach: '#f2c9ae', amarillo: '#f5e050', amarilloTexto: '#5c4a00',
};

const FILTROS_VACIOS = { torneo: '', division: '', categoriaClub: '', fechaDesde: '', fechaHasta: '', fechaNroDesde: '', fechaNroHasta: '' };

const th = { padding: '6px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,.25)' };
const td = { padding: '6px 8px', fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap' };
const inputFiltro = { height: 38, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 8px', fontSize: 12, fontWeight: 600, color: C.azul, background: C.celeste, minWidth: 0 };

// Celda con una barra de fondo tipo "data bar" — proporcional al valor sobre
// un máximo, igual al efecto del tablero de referencia en Excel.
function CeldaBarra({ valor, texto, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  return (
    <td style={{ ...td, position: 'relative', color: C.azul, fontWeight: 700 }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${color} ${pct}%, transparent ${pct}%)` }} />
      <span style={{ position: 'relative' }}>{texto}</span>
    </td>
  );
}

// Celda que se resalta con un color sólido cuando el valor es mayor a 0
// (Incidentes, Obs. Instalaciones, Controles Previos).
function CeldaResaltada({ valor, colorFondo, colorTexto }) {
  const activo = Number(valor) > 0;
  return (
    <td style={{ ...td, background: activo ? colorFondo : '#fff', color: activo ? colorTexto : C.azul, fontWeight: activo ? 700 : 400 }}>
      {valor}
    </td>
  );
}

function Fila({ f, esTotal, maxPorcentaje, maxMinProm, maxEtProm }) {
  const bg = esTotal ? C.celeste : '#fff';
  const peso = esTotal ? 700 : 400;
  return (
    <tr style={{ background: bg, fontWeight: peso }}>
      <td style={{ ...td, textAlign: 'left', textTransform: 'uppercase', fontWeight: 700, color: C.azul }}>{f.club}</td>
      <td style={{ ...td, color: C.azul }}>{f.partidos}</td>
      <td style={{ ...td, color: C.rojo, fontWeight: 700 }}>{f.demoraInicio.partidosConDemora}</td>
      <CeldaBarra valor={f.demoraInicio.porcentaje} texto={`${f.demoraInicio.porcentaje}%`} max={maxPorcentaje} color={C.peach} />
      <td style={{ ...td, color: C.rojo, fontWeight: 700 }}>{f.demoraInicio.minutosTotales}</td>
      <CeldaBarra valor={f.demoraInicio.minutosPromedio} texto={f.demoraInicio.minutosPromedio} max={maxMinProm} color={C.peach} />
      <td style={{ ...td, color: C.azul, fontWeight: 700 }}>{f.entretiempos.cantidadExcedidos}</td>
      <td style={{ ...td, color: C.azul, fontWeight: 700, background: f.entretiempos.promedioMin >= 3 ? C.celeste : 'transparent' }}>{f.entretiempos.promedioMin}</td>
      <CeldaResaltada valor={f.incidentes} colorFondo={C.rojo} colorTexto="#fff" />
      <CeldaResaltada valor={f.obsInstalaciones} colorFondo={C.naranja} colorTexto="#fff" />
      <CeldaResaltada valor={f.controlesPrevios.planillaFueraTermino} colorFondo={C.amarillo} colorTexto={C.amarilloTexto} />
      <CeldaResaltada valor={f.controlesPrevios.camisetaSinApellido} colorFondo={C.amarillo} colorTexto={C.amarilloTexto} />
    </tr>
  );
}

export default function PantallaInformes({ onBack, listas }) {
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  const cargar = async () => {
    setCargando(true);
    const { ok, partidos: nuevos } = await obtenerTodosLosPartidos();
    setError(!ok);
    setPartidos(nuevos);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const setFiltro = (campo) => (e) => setFiltros(f => ({ ...f, [campo]: e.target.value }));
  const hayFiltrosActivos = Object.values(filtros).some(v => v !== '');

  const opciones = useMemo(() => ({
    torneos: [...new Set(partidos.map(p => p['Torneo']).filter(Boolean))].sort(),
    divisiones: [...new Set(partidos.map(p => p['Categoría']).filter(Boolean))].sort(),
  }), [partidos]);

  const partidosFiltrados = useMemo(() => filtrarPartidos(partidos, filtros), [partidos, filtros]);
  const { porClub, total } = calcularIndicadoresPorClub(partidosFiltrados, {
    categoriaClub: filtros.categoriaClub,
    clubesCategoria: listas?.clubesCategoria,
  });
  const maxPorcentaje = 100;
  const maxMinProm = Math.max(1, ...porClub.map(f => f.demoraInicio.minutosPromedio));
  const maxEtProm = Math.max(1, ...porClub.map(f => f.entretiempos.promedioMin));

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: C.azul, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Informes por Club</div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>Se actualiza solo con cada partido subido</div>
        </div>
        <button onClick={cargar} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase' }}>
          ↻ Actualizar
        </button>
      </div>

      {cargando && <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>Cargando...</div>}
      {!cargando && error && (
        <div style={{ textAlign: 'center', color: C.rojo, fontSize: 13, padding: '20px 0' }}>
          No se pudo traer la planilla compartida. Revisá la conexión.
          <div><button onClick={cargar} style={{ marginTop: 8, background: C.azul, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Reintentar</button></div>
        </div>
      )}
      {!cargando && !error && partidos.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>Todavía no hay partidos cargados.</div>
      )}

      {!cargando && !error && partidos.length > 0 && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: `1px solid ${C.celeste}` }}>
          <select style={{ ...inputFiltro, width: '100%' }} value={filtros.torneo} onChange={setFiltro('torneo')}>
            <option value="">Todos los Torneos</option>
            {opciones.torneos.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={{ ...inputFiltro, width: '100%' }} value={filtros.division} onChange={setFiltro('division')}>
            <option value="">Todas las Divisiones</option>
            {opciones.divisiones.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={{ ...inputFiltro, width: '100%' }} value={filtros.categoriaClub} onChange={setFiltro('categoriaClub')}>
            <option value="">Todos los Clubes</option>
            {['A', 'B', 'C', 'D'].map(v => <option key={v} value={v}>Categoría {v}</option>)}
          </select>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.azul, textTransform: 'uppercase', marginBottom: 4 }}>Rango de fechas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="date" style={inputFiltro} value={filtros.fechaDesde} onChange={setFiltro('fechaDesde')} placeholder="Desde" />
              <input type="date" style={inputFiltro} value={filtros.fechaHasta} onChange={setFiltro('fechaHasta')} placeholder="Hasta" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.azul, textTransform: 'uppercase', marginBottom: 4 }}>Rango de fechas de torneo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="number" style={inputFiltro} value={filtros.fechaNroDesde} onChange={setFiltro('fechaNroDesde')} placeholder="Desde (ej: 1)" />
              <input type="number" style={inputFiltro} value={filtros.fechaNroHasta} onChange={setFiltro('fechaNroHasta')} placeholder="Hasta (ej: 10)" />
            </div>
          </div>
          {hayFiltrosActivos && (
            <button onClick={() => setFiltros(FILTROS_VACIOS)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: C.rojo, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>
      )}

      {!cargando && !error && partidos.length > 0 && porClub.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>Ningún partido coincide con estos filtros.</div>
      )}

      {!cargando && !error && porClub.length > 0 && (
        <div style={{ overflowX: 'auto', padding: '8px 0' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ ...th, textAlign: 'left', background: C.gris, color: '#fff' }}>Club</th>
                <th rowSpan={2} style={{ ...th, background: C.gris, color: '#fff' }}>Partidos</th>
                <th colSpan={4} style={{ ...th, background: C.peach, color: C.azul }}>Demora en Inicio de Partidos</th>
                <th colSpan={2} style={{ ...th, background: C.azul, color: '#fff' }}>Entretiempos</th>
                <th rowSpan={2} style={{ ...th, background: C.rojo, color: '#fff' }}>Incidentes</th>
                <th rowSpan={2} style={{ ...th, background: C.bordo, color: '#fff' }}>Obs. Instalaciones</th>
                <th colSpan={2} style={{ ...th, background: C.amarillo, color: C.amarilloTexto }}>Controles Previos</th>
              </tr>
              <tr>
                <th style={{ ...th, background: C.peach, color: C.azul }}>Partidos c/Demora</th>
                <th style={{ ...th, background: C.peach, color: C.azul }}>%</th>
                <th style={{ ...th, background: C.peach, color: C.azul }}>Min. Totales</th>
                <th style={{ ...th, background: C.peach, color: C.azul }}>Min. Prom.</th>
                <th style={{ ...th, background: C.azul, color: '#fff' }}>Excedidos</th>
                <th style={{ ...th, background: C.azul, color: '#fff' }}>Prom. Min.</th>
                <th style={{ ...th, background: C.amarillo, color: C.amarilloTexto }}>Planilla Fuera Término</th>
                <th style={{ ...th, background: C.amarillo, color: C.amarilloTexto }}>Camiseta S/Apellido</th>
              </tr>
            </thead>
            <tbody>
              {porClub.map(f => <Fila key={f.club} f={f} maxPorcentaje={maxPorcentaje} maxMinProm={maxMinProm} maxEtProm={maxEtProm} />)}
              <Fila f={total} esTotal maxPorcentaje={maxPorcentaje} maxMinProm={maxMinProm} maxEtProm={maxEtProm} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
