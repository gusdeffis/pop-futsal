import { useEffect } from 'react';
import { Header, Campo, Input, Select, BtnNext } from './UI';
import { FECHAS } from '../data';

// Auto-avance en campo fecha: "4" → "07" → "2026"
function useFechaInput(value, onChange) {
  const handleChange = (val) => {
    let v = val.replace(/[^0-9]/g, '');
    if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
    if (v.length >= 5) v = v.slice(0, 5) + '/' + v.slice(5, 9);
    onChange(v.slice(0, 10));
  };
  return handleChange;
}

function fechaHoy() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${now.getFullYear()}`;
}

export default function Pantalla1({ datos, setDatos, onNext, listas }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));
  const valido = datos.torneo && datos.local && datos.visitante && datos.arbitro;
  const handleFecha = useFechaInput(datos.dia, set('dia'));

  // Auto-completa el día con la fecha de hoy si todavía está vacío
  useEffect(() => {
    if (!datos.dia) set('dia')(fechaHoy());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-formato hora: "1830" → "18:30"
  const handleHora = (val) => {
    let v = val.replace(/[^0-9]/g, '');
    if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
    set('hora')(v.slice(0, 5));
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={1} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Torneo + M/F en la misma fila */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px', gap: 8 }}>
          <Campo label="Torneo" required>
            <Select value={datos.torneo} onChange={set('torneo')} options={listas.torneos} placeholder="Seleccioná el torneo" />
          </Campo>
          <Campo label="División">
            <div style={{ display: 'flex', gap: 4 }}>
              {['M', 'F'].map(d => (
                <button key={d} onClick={() => set('division')(d)} style={{
                  flex: 1, height: 44, borderRadius: 8, border: '1.5px solid #0d1f4e',
                  background: datos.division === d ? '#0d1f4e' : '#c6dbf5',
                  color: datos.division === d ? '#fff' : '#0d1f4e',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>{d}</button>
              ))}
            </div>
          </Campo>
        </div>

        {/* Fecha N° + Categoría + Partido N° en la segunda fila */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Campo label="Fecha N°">
            <Select value={datos.fecha_nro} onChange={set('fecha_nro')} options={FECHAS} placeholder="N°" />
          </Campo>
          <Campo label="Categoría">
            <Select value={datos.cat} onChange={set('cat')} options={listas.categorias} placeholder="Cat." />
          </Campo>
          <Campo label="Partido N°">
            <Input value={datos.nro} onChange={set('nro')} placeholder="N°" type="number" />
          </Campo>
        </div>

        {/* Día y Hora */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Campo label="Día">
            <Input value={datos.dia} onChange={handleFecha} placeholder="DD/MM/AAAA" />
          </Campo>
          <Campo label="Hora">
            <Input value={datos.hora} onChange={handleHora} placeholder="HH:MM" />
          </Campo>
        </div>

        {/* Equipos */}
        <Campo label="Local" required>
          <Select value={datos.local} onChange={set('local')} options={listas.clubes} placeholder="Equipo local" />
        </Campo>
        <Campo label="Visitante" required>
          <Select value={datos.visitante} onChange={set('visitante')} options={listas.clubes} placeholder="Equipo visitante" />
        </Campo>
        <Campo label="Estadio">
          <Select value={datos.estadio} onChange={set('estadio')} options={listas.estadios} placeholder="Estadio" />
        </Campo>

        {/* Árbitro y delegados */}
        <Campo label="Árbitro" required>
          <Select value={datos.arbitro} onChange={set('arbitro')} options={listas.arbitros} placeholder="Seleccioná el árbitro" />
        </Campo>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Campo label="Delegado Local">
            <Input value={datos.deleg_l} onChange={set('deleg_l')} placeholder="Nombre" />
          </Campo>
          <Campo label="Delegado Visita">
            <Input value={datos.deleg_v} onChange={set('deleg_v')} placeholder="Nombre" />
          </Campo>
        </div>
        <Campo label="Oficial AFA">
          <Select value={datos.oficial_afa} onChange={set('oficial_afa')} options={listas.oficiales} placeholder="Seleccioná el oficial" />
        </Campo>

      </div>
      <div style={{ padding: '8px 16px 24px' }}>
        <BtnNext onClick={onNext} disabled={!valido}>Siguiente: Control previo</BtnNext>
      </div>
    </div>
  );
}
