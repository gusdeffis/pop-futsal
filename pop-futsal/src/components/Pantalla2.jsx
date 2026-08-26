import { useEffect, useState } from 'react';
import { Header, SeccionHeader, CheckAzul, HoraInput, Textarea, PanelCompletarObs, BtnNext, BtnBack } from './UI';
import FotosFormacionInicial from './FotosFormacionInicial';

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
// ancho/alto que Formación Local/Visita/Ingreso de la Pantalla 3. El
// prefijo de los botones de hora (ej. "Planillas Local") por defecto sale
// de la primera palabra del título — pero para "Formación 5 Iniciales" el
// prefijo pedido es distinto ("5 Iniciales Local"), por eso se puede pasar
// explícito con prefijoBotones sin afectar los demás bloques.
function BloqueControlHorario({ titulo, prefijoBotones, horaLKey, horaVKey, demLKey, demVKey, okKey, datos, set }) {
  const prefijo = prefijoBotones || titulo.split(' ')[0];
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
        <HoraInput label={`${prefijo} Local`} value={datos[horaLKey]} onChange={set(horaLKey)} />
        <HoraInput label={`${prefijo} Visita`} value={datos[horaVKey]} onChange={set(horaVKey)} />
        <div style={{
          background: sinCargar ? '#c6dbf5' : (sinDemora ? '#d7f0dd' : '#fadfba'),
          border: '1.5px solid #0d1f4e', borderRadius: 10, padding: 10,
          display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center',
        }}>
          {!sinDemora && (
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0d1f4e', textTransform: 'uppercase', letterSpacing: .5 }}>Demora</div>
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
                <span style={{ fontSize: 16, fontWeight: 800, color: '#000', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  Local {demL}m
                </span>
              )}
              {Number(demV) > 1 && (
                <span style={{ fontSize: 16, fontWeight: 800, color: '#000', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  Visita {demV}m
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
// bien, sin achicar la letra ni usar puntos suspensivos. Los ítems con
// `lineas` fuerzan el corte exacto pedido (en vez de dejar que el navegador
// decida dónde cortar); los que tienen `sinMayuscula` se muestran con
// mayúscula inicial nomás (no todo en mayúscula), porque en mayúscula
// completa no entraban bien en una sola palabra por línea.
// Punto pedido: reorganizado en 7 filas de 3 columnas (antes eran filas
// mezcladas de 2 y 3), agrupando Balón/Seguridad/Médico juntos y dejando
// Camiseta + Partido Suspendido en la última fila (con lugar para un
// tercer botón a futuro, si hace falta). Varios nombres pasan a mostrarse
// en formato natural (no todo en mayúscula) para que se lean mejor cortos.
const FILAS_INSTALACIONES = [
  { cols: 3, items: [
    ['buen_estado', 'Campo en Buen Est.', { sinMayuscula: true, lineas: ['Campo en', 'Buen Est.'] }],
    ['altura', 'Altura min. 5 mts', { sinMayuscula: true, lineas: ['Altura min.', '5 mts'] }],
    ['meta_anclada', 'Meta Sin Anclar', { sinMayuscula: true, lineas: ['Meta Sin', 'Anclar'] }],
  ] },
  { cols: 3, items: [
    ['ilum', 'Iluminación', { sinMayuscula: true }],
    ['pared_prot', 'Pared con Protección', { sinMayuscula: true, lineas: ['Pared con', 'Protección'] }],
    ['redes_per', 'Redes Perimetr.', { sinMayuscula: true, lineas: ['Redes', 'Perimetr.'] }],
  ] },
  { cols: 3, items: [['tablero', 'Tablero', { sinMayuscula: true }], ['mesa_crono', 'Mesa Crono', { sinMayuscula: true }], ['limpieza', 'Limpieza', { sinMayuscula: true }]] },
  { cols: 3, items: [
    ['vest_l', 'Vestuario Local', { sinMayuscula: true, lineas: ['Vestuario', 'Local'] }],
    ['vest_v', 'Vestuario Visita', { sinMayuscula: true, lineas: ['Vestuario', 'Visita'] }],
    ['vest_arb', 'Vestuario Arbitro', { sinMayuscula: true, lineas: ['Vestuario', 'Arbitro'] }],
  ] },
  { cols: 3, items: [
    ['banios', 'Baños Públicos', { sinMayuscula: true, lineas: ['Baños', 'Públicos'] }],
    ['del_veedor_l', 'Veedor Local', { sinMayuscula: true, lineas: ['Veedor', 'Local'] }],
    ['del_veedor_v', 'Veedor Visita', { sinMayuscula: true, lineas: ['Veedor', 'Visita'] }],
  ] },
  { cols: 3, items: [
    ['balon_nuevo', 'Balón Nuevo', { sinMayuscula: true, lineas: ['Balón', 'Nuevo'] }],
    ['seguridad', 'Seguridad Policía', { sinMayuscula: true, lineas: ['Seguridad', 'Policía'] }],
    ['medico', 'Médico', { sinMayuscula: true }],
  ] },
];
// Última fila, aparte del array genérico — 2 botones por ahora (Camiseta +
// Partido Suspendido), con lugar para un tercero a futuro si hace falta.
const FILA_MEDICO_CAMISETA = [['camiseta', 'Camisetas C/Apellido', { sinMayuscula: true, lineas: ['Camisetas', 'C/Apellido'] }]];

// "Marcar Todas" (punto pedido, con toggle) — tilda de una sola vez los
// primeros 13 ítems (desde "Campo en buen estado" hasta "Baños Públicos"),
// y si ya estaban todos tildados, los destilda de nuevo — funciona en los
// 2 sentidos, no solo para marcar. Deja SIN tocar Veedor Local/Visita,
// Balón Nuevo, Seguridad, Médico y Camisetas, porque esos sí requieren
// revisión puntual caso por caso.
const CANTIDAD_MARCAR_TODAS = 13;


// Altura fija de los botones de esta pantalla únicamente (no afecta a
// CheckAzul en otras pantallas, como el de Protocolo de Inicio en Pantalla3)
// y padding vertical reducido, para que no sobre tanto espacio arriba/abajo
// del texto (antes quedaba desproporcionado con textos de 1 sola línea).
const ALTO_BOTON_INSTALACIONES = 42;
const PADDING_BOTON_INSTALACIONES = '5px 10px';

// Todos los ítems de instalaciones/servicios de esta pantalla, para armar el
// texto de observaciones a partir de lo que falta marcar — un solo campo
// por ítem, con nombre completo para Vestuarios (en la grilla van
// abreviados, pero en el texto de observaciones conviene el nombre entero).
const LABELS_COMPLETOS = { buen_estado: 'Campo de Juego', vest_l: 'Vestuario Local', vest_v: 'Vestuario Visita', vest_arb: 'Vestuario Árbitro' };
const TODOS_LOS_ITEMS = [...FILAS_INSTALACIONES.flatMap(f => f.items), ...FILA_MEDICO_CAMISETA]
  .map(([campo, label]) => [campo, LABELS_COMPLETOS[campo] || label]);

export default function Pantalla2({ datos, setDatos, onNext, onBack, onIrA }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));
  const [panelAbierto, setPanelAbierto] = useState(false);

  // "Marcar Todas" (punto pedido): tilda de una sola vez los primeros 15
  // ítems, en el mismo orden en que aparecen en pantalla.
  const primeros13 = FILAS_INSTALACIONES.flatMap(f => f.items).slice(0, CANTIDAD_MARCAR_TODAS).map(([campo]) => campo);
  const yaEstanTodosTildados = primeros13.every(campo => datos[campo]);
  const marcarTodas = () => {
    setDatos(d => {
      const actualizado = { ...d };
      primeros13.forEach(campo => { actualizado[campo] = !yaEstanTodosTildados; });
      return actualizado;
    });
  };

  // "Partido Suspendido" (punto pedido): funciona igual que el botón de
  // Suspensión en la pantalla de Conclusión (Pantalla5) — agrega/quita
  // 'susp' del mismo array de conclusiones, así que marcarlo acá o en la
  // Conclusión final es lo mismo, y quedan sincronizados. Al activarlo acá
  // (pensado para el caso de suspensión ANTES de arrancar, ej. por cancha
  // en mal estado), además abre directo el panel de observación, para
  // anotar el motivo sin tener que buscar el botón aparte.
  const partidoSuspendido = (datos.conclusiones || []).includes('susp');
  const toggleSuspendido = () => {
    setDatos(d => {
      const conclusiones = d.conclusiones || [];
      const yaEsta = conclusiones.includes('susp');
      return { ...d, conclusiones: yaEsta ? conclusiones.filter(c => c !== 'susp') : [...conclusiones, 'susp'] };
    });
    if (!partidoSuspendido) setPanelAbierto(true);
  };

  // No cuenta como "faltante" si ya está marcado, o si ya se escribió algo
  // sobre ese ítem en Observaciones (aunque siga sin tildar).
  const quitarTildes = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const obsMayus = quitarTildes((datos.obs_previo || '').toUpperCase());
  const faltantes = TODOS_LOS_ITEMS.filter(([campo, label]) => !datos[campo] && !obsMayus.includes(`${quitarTildes(label.toUpperCase())}:`));

  // Punto pedido: "Partido Suspendido" no es un casillero simple como el
  // resto (es parte de las conclusiones, no un booleano suelto) — para que
  // el panel de observación lo pueda tratar igual que a los demás
  // (mostrar su propio checkbox + cuadro de texto), se arma un campo
  // "virtual" acá nomás, que redirige a la lógica real de conclusiones
  // por detrás. Va SIEMPRE primero en la lista cuando está activo.
  const itemsParaPanel = partidoSuspendido ? [['_partido_suspendido', 'Partido Suspendido', '#e03030'], ...faltantes] : faltantes;
  const datosParaPanel = { ...datos, _partido_suspendido: partidoSuspendido };
  const setParaPanel = (campo) => (campo === '_partido_suspendido' ? () => toggleSuspendido() : set(campo));

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
          <BloqueControlHorario titulo="Formación 5 Iniciales" prefijoBotones="5 Iniciales" horaLKey="form_ini_hora_l" horaVKey="form_ini_hora_v" demLKey="form_ini_dem_l" demVKey="form_ini_dem_v" okKey="form_ini_ok" datos={datos} set={set} />
          <FotosFormacionInicial partidoId={datos._id} local={datos.local} visitante={datos.visitante} />
        </div>

        <SeccionHeader>Instalaciones y Seguridad</SeccionHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>
            Marcar si está en condiciones
          </div>
          <button onClick={marcarTodas} style={{ background: 'none', border: 'none', color: yaEstanTodosTildados ? '#e03030' : '#1a7a3a', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            {yaEstanTodosTildados ? '✕ Desmarcar Todas' : '✓ Marcar Todas'}
          </button>
        </div>

        {FILAS_INSTALACIONES.map((fila, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${fila.cols}, 1fr)`, gap: 8 }}>
            {fila.items.map(([campo, label, opts = {}]) => (
              <CheckAzul
                key={campo} label={opts.lineas || label} checked={datos[campo]} onChange={set(campo)}
                minHeight={ALTO_BOTON_INSTALACIONES} padding={PADDING_BOTON_INSTALACIONES} sinMayuscula={opts.sinMayuscula} sinCasillero fontSize={12}
              />
            ))}
          </div>
        ))}

        {/* Última fila: Camisetas a la izquierda, medio vacío, "Partido
            Suspendido" a la derecha — mismo tamaño de columna (3) que la
            fila de Balón/Seguridad/Médico. El botón nuevo funciona
            distinto a los demás (no es un simple casillero de "está en
            condiciones"): gris cuando no está marcado, rojo cuando sí —
            mismo criterio de color que ya usa el botón de Suspensión en
            la Conclusión final. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {FILA_MEDICO_CAMISETA.map(([campo, label, opts = {}]) => (
            <CheckAzul
              key={campo} label={opts.lineas || label} checked={datos[campo]} onChange={set(campo)}
              minHeight={ALTO_BOTON_INSTALACIONES} padding={PADDING_BOTON_INSTALACIONES} sinMayuscula={opts.sinMayuscula} sinCasillero fontSize={12}
            />
          ))}
          <div />
          <CheckAzul
            label={['Partido', 'Suspendido']} checked={partidoSuspendido} onChange={toggleSuspendido}
            minHeight={ALTO_BOTON_INSTALACIONES} padding={PADDING_BOTON_INSTALACIONES} sinMayuscula
            color="#e03030" colorInactivo="#e0e0e0" sinCasillero fontSize={12}
          />
        </div>

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
          <PanelCompletarObs items={itemsParaPanel} datos={datosParaPanel} set={setParaPanel} obsField="obs_previo" onCerrar={() => setPanelAbierto(false)} />
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
