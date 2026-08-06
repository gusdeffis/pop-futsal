import { useEffect, useState } from 'react';
import { Header, SeccionHeader, CheckAzul, HoraInput, Textarea, PanelCompletarObs, BtnNext, BtnBack } from './UI';

// Minutos de demora = diferencia entre la hora de referencia (1 hora antes
// del partido) y la hora real de llegada. Si llegó a horario o antes, la
// demora es 0.
function sumarMinutos(hora, minutos) {
  if (!hora || !hora.includes(':')) return '';
  const [h, m] = hora.split(':').map(Number);
  if ([h, m].some(Number.isNaN)) return '';
  let total = (h * 60 + m + minutos + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function calcularDemora(horaProgramada, horaLlegada) {
  if (!horaProgramada || !horaLlegada || !horaProgramada.includes(':') || !horaLlegada.includes(':')) return '';
  const [h1, m1] = horaProgramada.split(':').map(Number);
  const [h2, m2] = horaLlegada.split(':').map(Number);
  if ([h1, m1, h2, m2].some(Number.isNaN)) return '';
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins = 0;
  return String(mins);
}

// Bloque de 3 columnas: Hora Local | Hora Visita | Demora (calculada), mismo
// ancho/alto que Formación Local/Visita/Ingreso de la Pantalla 3.
function BloqueControlHorario({ titulo, horaLKey, horaVKey, demLKey, demVKey, okKey, datos, set }) {
  useEffect(() => {
    const referencia = sumarMinutos(datos.hora, -60); // 1 hora antes del partido
    const demL = calcularDemora(referencia, datos[horaLKey]);
    const demV = calcularDemora(referencia, datos[horaVKey]);
    if (demL !== datos[demLKey]) set(demLKey)(demL);
    if (demV !== datos[demVKey]) set(demVKey)(demV);
    const ok = Number(demL) <= 1 && Number(demV) <= 1 && datos[horaLKey] && datos[horaVKey];
    if (!!ok !== datos[okKey]) set(okKey)(!!ok);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos[horaLKey], datos[horaVKey], datos.hora]);

  const demL = datos[demLKey];
  const demV = datos[demVKey];
  const sinCargar = demL === '' && demV === '';
  const sinDemora = !sinCargar && Number(demL) <= 1 && Number(demV) <= 1;

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', textTransform: 'uppercase', letterSpacing: .3, marginBottom: 6 }}>{titulo}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <HoraInput label={`${titulo.split(' ')[0]} Local`} value={datos[horaLKey]} onChange={set(horaLKey)} />
        <HoraInput label={`${titulo.split(' ')[0]} Visita`} value={datos[horaVKey]} onChange={set(horaVKey)} />
        <div style={{
          background: sinCargar ? '#c6dbf5' : (sinDemora ? '#d7f0dd' : '#fadfba'),
          border: '1.5px solid #0d1f4e', borderRadius: 10, padding: 10,
          display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center',
        }}>
          {!sinDemora && (
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1f4e', textTransform: 'uppercase', letterSpacing: .5 }}>Demora</div>
          )}
          {sinCargar ? (
            <span style={{ fontSize: 22, fontWeight: 700, color: '#0d1f4e' }}>—</span>
          ) : sinDemora ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a5c30', textTransform: 'uppercase', textAlign: 'center' }}>
              Sin demora
            </span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
              {Number(demL) > 1 && (
                <span style={{ fontSize: 16, fontWeight: 800, color: '#000', textAlign: 'center' }}>
                  Local {demL} min.
                </span>
              )}
              {Number(demV) > 1 && (
                <span style={{ fontSize: 16, fontWeight: 800, color: '#000', textAlign: 'center' }}>
                  Visita {demV} min.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Filas de Instalaciones y Seguridad, en el mismo orden de siempre — solo
// cambia dónde se corta cada línea (2 o 3 por fila) para que el texto entre
// bien, sin achicar la letra ni usar puntos suspensivos.
const FILAS_INSTALACIONES = [
  { cols: 2, items: [['buen_estado', 'Campo en buen estado'], ['altura', 'Altura min. 5 mts']] },
  { cols: 2, items: [['pared_prot', 'Pared con Protecciones'], ['ilum', 'Iluminación']] },
  { cols: 2, items: [['redes_per', 'Redes Perimetrales'], ['meta_anclada', 'Meta Sin Anclar']] },
  { cols: 3, items: [['tablero', 'Tablero'], ['mesa_crono', 'Mesa Crono'], ['limpieza', 'Limpieza']] },
  { cols: 3, items: [['vest_l', 'Vest. Local'], ['vest_v', 'Vest. Visita'], ['vest_arb', 'Vest. Árb.']] },
  { cols: 3, items: [['banios', 'Baños Públicos'], ['del_veedor_l', 'Veedor Local'], ['del_veedor_v', 'Veedor Visita']] },
  { cols: 2, items: [['seguridad', 'Seguridad / Policía'], ['balon_nuevo', 'Balón Nuevo']] },
  { cols: 2, items: [['medico', 'Médico'], ['camiseta', 'Camiseta c/Apellido']] },
];

// Altura fija de los botones de esta pantalla únicamente (no afecta a
// CheckAzul en otras pantallas, como el de Protocolo de Inicio en Pantalla3).
const ALTO_BOTON_INSTALACIONES = 56;

// Todos los ítems de instalaciones/servicios de esta pantalla, para armar el
// texto de observaciones a partir de lo que falta marcar — un solo campo
// por ítem, con nombre completo para Vestuarios (en la grilla van
// abreviados, pero en el texto de observaciones conviene el nombre entero).
const LABELS_COMPLETOS = { vest_l: 'Vestuario Local', vest_v: 'Vestuario Visita', vest_arb: 'Vestuario Árbitro' };
const TODOS_LOS_ITEMS = FILAS_INSTALACIONES.flatMap(f => f.items)
  .map(([campo, label]) => [campo, LABELS_COMPLETOS[campo] || label]);

export default function Pantalla2({ datos, setDatos, onNext, onBack, onIrA }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));
  const [panelAbierto, setPanelAbierto] = useState(false);

  // No cuenta como "faltante" si ya está marcado, o si ya se escribió algo
  // sobre ese ítem en Observaciones (aunque siga sin tildar).
  const quitarTildes = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const obsMayus = quitarTildes((datos.obs_previo || '').toUpperCase());
  const faltantes = TODOS_LOS_ITEMS.filter(([campo, label]) => !datos[campo] && !obsMayus.includes(`${quitarTildes(label.toUpperCase())}:`));

  const handleSiguiente = () => {
    if (faltantes.length > 0) {
      const continuar = window.confirm(`Hay ${faltantes.length} ítem(s) sin marcar y sin observación. ¿Querés continuar igual, o completarlas ahora?\n\nAceptar = continuar igual\nCancelar = completar observaciones ahora`);
      if (!continuar) { setPanelAbierto(true); return; }
    }
    onNext();
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={2} onIrA={onIrA} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <SeccionHeader>2. Control previo al partido</SeccionHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <BloqueControlHorario titulo="Planillas y Credenciales" horaLKey="plan_cred_hora_l" horaVKey="plan_cred_hora_v" demLKey="plan_cred_dem_l" demVKey="plan_cred_dem_v" okKey="plan_cred_ok" datos={datos} set={set} />
          <BloqueControlHorario titulo="Formación Inicial" horaLKey="form_ini_hora_l" horaVKey="form_ini_hora_v" demLKey="form_ini_dem_l" demVKey="form_ini_dem_v" okKey="form_ini_ok" datos={datos} set={set} />
        </div>

        <SeccionHeader>Instalaciones y Seguridad</SeccionHeader>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>
          Marcar si está en condiciones
        </div>

        {FILAS_INSTALACIONES.map((fila, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${fila.cols}, 1fr)`, gap: 8 }}>
            {fila.items.map(([campo, label]) => (
              <CheckAzul key={campo} label={label} checked={datos[campo]} onChange={set(campo)} minHeight={ALTO_BOTON_INSTALACIONES} />
            ))}
          </div>
        ))}

        {!panelAbierto && (
          <button onClick={() => setPanelAbierto(true)} style={{
            background: '#0d1f4e', color: '#fff', border: 'none', borderRadius: 6,
            padding: '7px 12px', fontSize: 11, fontWeight: 700, letterSpacing: .5,
            textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left', width: '100%',
          }}>
            Observación por Control
          </button>
        )}
        {panelAbierto && (
          <PanelCompletarObs items={faltantes} datos={datos} set={set} obsField="obs_previo" onCerrar={() => setPanelAbierto(false)} />
        )}
        <Textarea value={datos.obs_previo} onChange={set('obs_previo')} placeholder="Observaciones sobre el control previo..." />

      </div>
      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={handleSiguiente}>Siguiente: Horarios</BtnNext>
      </div>
    </div>
  );
}
