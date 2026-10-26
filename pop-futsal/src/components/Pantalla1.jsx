import { useEffect } from 'react';
import { Header, Campo, Input, InputHora, Select, SelectLibre, BtnNext, BtnSalir } from './UI';
import { clubesParaTorneo } from '../utils/clubesPorCategoria';
import { estadioPorDefecto } from '../utils/fixture';

function fechaHoy() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${now.getFullYear()}`;
}

// El resto de la app (WSP, PDF, Historial) espera "DD/MM/AAAA" en
// datos.dia, pero el selector nativo de calendario necesita "AAAA-MM-DD"
// — se convierte en el borde nomás, sin tocar el formato guardado.
function ddmmaaaaAIso(v) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}
function isoADdmmaaaa(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export default function Pantalla1({ datos, setDatos, onNext, listas, onSalir, onIrA, fixtureFilas, clubesFilas }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));
  const valido = datos.torneo && datos.local && datos.visitante && datos.arbitro;
  const clubesFiltrados = clubesParaTorneo(datos.torneo, listas.clubes, listas.clubesCategoria);

  // Auto-completa el día con la fecha de hoy si todavía está vacío
  useEffect(() => {
    if (!datos.dia) set('dia')(fechaHoy());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Precarga el Estadio apenas están los 4 datos que lo identifican
  // (Torneo + Fecha N° + Local + Visitante) — primero busca si el
  // coordinador ya asignó uno puntual en Fixture, si no cae al estadio por
  // defecto del club Local. Nunca pisa un valor que el oficial ya haya
  // tipeado a mano.
  useEffect(() => {
    if (datos.estadio) return; // no pisar lo que ya está cargado
    if (!datos.torneo || !datos.fecha_nro || !datos.local || !datos.visitante) return;
    const encontrado = estadioPorDefecto({
      torneo: datos.torneo, fechaNro: datos.fecha_nro, local: datos.local, visitante: datos.visitante,
      fixture: fixtureFilas, clubes: clubesFilas,
    });
    if (encontrado) set('estadio')(encontrado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.torneo, datos.fecha_nro, datos.local, datos.visitante]);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={1} onIrA={onIrA} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Torneo + M/F en la misma fila */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px', gap: 8 }}>
          <Campo label="Torneo" required>
            <SelectLibre value={datos.torneo} onChange={set('torneo')} options={listas.torneos} placeholder="Seleccioná el torneo" />
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
            <Select value={datos.fecha_nro} onChange={set('fecha_nro')} options={listas.fechas} placeholder="N°" />
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
            <Input type="date" value={ddmmaaaaAIso(datos.dia)} onChange={v => set('dia')(isoADdmmaaaa(v))} />
          </Campo>
          <Campo label="Hora">
            <InputHora value={datos.hora} onChange={set('hora')} />
          </Campo>
        </div>

        {/* Equipos */}
        <Campo label="Local" required>
          <SelectLibre value={datos.local} onChange={set('local')} options={clubesFiltrados} placeholder="Equipo local" />
        </Campo>
        <Campo label="Visitante" required>
          <SelectLibre value={datos.visitante} onChange={set('visitante')} options={clubesFiltrados} placeholder="Equipo visitante" />
        </Campo>

        {/* Estadio y Árbitro en la misma línea */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Campo label="Estadio">
            <SelectLibre value={datos.estadio} onChange={set('estadio')} options={listas.estadios} placeholder="Estadio" />
          </Campo>
          <Campo label="Árbitro" required>
            <SelectLibre value={datos.arbitro} onChange={set('arbitro')} options={listas.arbitros} placeholder="Árbitro" />
          </Campo>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Campo label="Delegado Local">
            <Input value={datos.deleg_l} onChange={set('deleg_l')} placeholder="Nombre" />
          </Campo>
          <Campo label="Delegado Visita">
            <Input value={datos.deleg_v} onChange={set('deleg_v')} placeholder="Nombre" />
          </Campo>
        </div>
        <Campo label="Oficial AFA">
          <SelectLibre value={datos.oficial_afa} onChange={set('oficial_afa')} options={listas.oficiales} placeholder="Seleccioná el oficial" />
        </Campo>

      </div>
      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        {onSalir && <BtnSalir onClick={onSalir} />}
        <BtnNext onClick={onNext} disabled={!valido}>Siguiente: Control previo</BtnNext>
      </div>
    </div>
  );
}
