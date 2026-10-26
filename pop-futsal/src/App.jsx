import { useState, useEffect, useRef } from 'react';
import Pantalla1 from './components/Pantalla1';
import Pantalla2 from './components/Pantalla2';
import Pantalla3 from './components/Pantalla3';
import Pantalla4 from './components/Pantalla4';
import Pantalla5 from './components/Pantalla5';
import PantallaInicio from './components/PantallaInicio';
import PantallaHistorial from './components/PantallaHistorial';
import PantallaAdmin from './components/PantallaAdmin';
import PantallaAdminListas from './components/PantallaAdminListas';
import PantallaInformes from './components/PantallaInformes';
import PantallaInformeClub from './components/PantallaInformeClub';
import PantallaAsignarPartidos from './components/PantallaAsignarPartidos';
import { ESTADO_INICIAL } from './data';
import { useListas } from './useListas';
import { obtenerListasAdmin } from './useListasAdmin';
import { generarActaTexto } from './utils/acta';
import { sheetRowToDatos } from './utils/sheetRowToDatos';
import { parsearFixture, partidosPendientes } from './utils/fixture';
import { borrarFotosFormacion } from './utils/fotosFormacion';
import {
  useAutoSave, cargarGuardado, guardarInmediato, limpiarPuntero,
  obtenerHistorial, guardarEnHistorial, enviarAPlanillaCompartida, marcarEnviadoNube,
  guardarLogin, cargarLogin, borrarLogin, generarId, obtenerTodosLosPartidos,
} from './useAutoSave';

export default function App() {
  const loginInicial = cargarLogin();

  const [vista, setVista] = useState('inicio'); // 'inicio' | 'partido' | 'historial' | 'admin' | 'adminListas' | 'asignar'
  const [pantalla, setPantalla] = useState(1);
  const [datos, setDatos] = useState(ESTADO_INICIAL);
  const [guardado, setGuardado] = useState(null);
  const [historial, setHistorial] = useState([]);
  // Punto: entrar a "Editar" un partido desde Panel Administrador (para
  // MIRARLO, no necesariamente para trabajarlo) no debe quedar guardado
  // como "en curso" en el dispositivo del admin — antes sí quedaba,
  // apareciendo después en "Continuar Partido" aunque el admin solo
  // quisiera ver el dato. Con este flag, el autoguardado se desactiva
  // específicamente en ese caso (ver useAutoSave y el handler de
  // visibilitychange más abajo), sin afectar el guardado normal para
  // cualquier otra entrada (Nuevo Partido, Continuar, o desde el propio
  // Historial).
  const [esEdicionAdmin, setEsEdicionAdmin] = useState(false);
  const [oficialLogueado, setOficialLogueado] = useState(loginInicial);
  const listas = useListas();
  // Bug real corregido: en el PRIMER login (justo al cargar la página),
  // el propio hook useListas() YA pide los permisos frescos por su cuenta
  // — si acá TAMBIÉN se pedía de nuevo con recargar(), quedaban 2 pedidos
  // corriendo en paralelo al mismo link, y si el segundo llegaba después
  // con datos más viejos (por timing de red), pisaba el resultado correcto
  // — un botón que aparecía un instante y después desaparecía solo. Con
  // este flag, recargar() solo se llama en logins SIGUIENTES (deslogueo +
  // login de nuevo en la misma pestaña), no en el primero.
  const primerLoginHecho = useRef(false);

  // Punto: "Ir a Fixture" desde Editar Listas (Panel Administrador) navega
  // a Asignar Partidos y abre directo la vista de Fixture ahí — antes había
  // 2 pantallas de Fixture distintas y desactualizadas entre sí, ahora es
  // una sola.
  const [abrirFixtureAlEntrar, setAbrirFixtureAlEntrar] = useState(false);

  // Fixture + Clubes (para precargar Estadio en Pantalla1) y los partidos
  // pendientes de este oficial (para el aviso en Pantalla de Inicio) — se
  // traen UNA sola vez, justo después de loguearse, no en cada pantalla.
  // También se puede volver a pedir a mano (botón "Actualizar" en la
  // tarjeta de avisos), por si tardó y no llegó a mostrarse a tiempo.
  //
  // Punto 4 (feedback real): antes, cada vez que entrabas mostraba
  // "Buscando..." aunque ya hubieras visto esos mismos partidos la vez
  // anterior — molesto si no cambió nada. Ahora se guarda en el celular/
  // notebook (localStorage) lo último que se vio para ESE oficial puntual,
  // y se muestra al toque sin esperar nada. Igual se sigue pidiendo la
  // versión fresca en segundo plano (por si asignaron o sacaron algo
  // mientras tanto) y se reemplaza en silencio cuando llega — sin volver a
  // mostrar "Buscando..." si ya había algo para mostrar.
  const claveCachePendientes = (nombreOficial) => `popa_pendientes_${(nombreOficial || '').trim().toUpperCase()}`;

  const leerPendientesCache = (nombreOficial) => {
    try {
      const raw = localStorage.getItem(claveCachePendientes(nombreOficial));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const guardarPendientesCache = (nombreOficial, lista) => {
    try { localStorage.setItem(claveCachePendientes(nombreOficial), JSON.stringify(lista)); } catch {}
  };

  const [fixtureFilas, setFixtureFilas] = useState(null);
  const [clubesFilas, setClubesFilas] = useState(null);
  const [pendientes, setPendientes] = useState([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(false);

  const cargarPendientes = async (nombreOficial) => {
    if (!nombreOficial) { setPendientes([]); return; }
    const cache = leerPendientesCache(nombreOficial);
    if (cache) {
      setPendientes(cache); // se ve al toque, sin esperar nada
    } else {
      setCargandoPendientes(true); // recién acá, si no hay nada guardado, se muestra "Buscando..."
    }
    try {
      const [{ hojas }, { partidos: partidosCargados }] = await Promise.all([
        obtenerListasAdmin(),
        obtenerTodosLosPartidos(),
      ]);
      const fixture = hojas.Fixture || [];
      setFixtureFilas(fixture);
      setClubesFilas(hojas.Clubes || []);
      const frescos = partidosPendientes(nombreOficial, fixture, partidosCargados);
      setPendientes(frescos);
      guardarPendientesCache(nombreOficial, frescos);
    } finally {
      setCargandoPendientes(false);
    }
  };

  useEffect(() => {
    cargarPendientes(oficialLogueado);
    // Bug real: los permisos (Perfil/Informes/Asignar) solo se pedían una
    // vez, al cargar la página — si alguien probaba deslogueando y
    // volviendo a loguear en la MISMA pestaña ya abierta después de editar
    // la hoja, seguía viendo los permisos viejos. Ahora se vuelven a pedir
    // en cada login SIGUIENTE (no en el primero, ver comentario arriba).
    if (oficialLogueado) {
      if (primerLoginHecho.current) listas.recargar?.();
      primerLoginHecho.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficialLogueado]);

  useEffect(() => {
    setGuardado(cargarGuardado());
  }, [vista]);

  // Guarda al instante en cada cambio: actualiza la entrada de este partido
  // en el Historial (estado "en curso") y mueve el marcapáginas a él. Así
  // cualquier partido, apenas se crea, ya vive en el Historial — tocar otro
  // por error nunca lo puede pisar ni hacerlo desaparecer.
  useAutoSave(datos, pantalla, vista === 'partido' && !esEdicionAdmin);

  // Guardado reforzado: si el usuario sale de la app (cambia a otra app,
  // apaga la pantalla, cierra la pestaña) sin esperar el próximo cambio,
  // esto guarda al instante para no perder los últimos cambios.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden' && vista === 'partido' && !esEdicionAdmin) {
        guardarInmediato(datos, pantalla);
      }
    };
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('pagehide', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('pagehide', handler);
    };
  }, [datos, pantalla, vista, esEdicionAdmin]);

  const handleLogin = (nombre) => {
    guardarLogin(nombre);
    setOficialLogueado(nombre);
  };

  const handleLogout = () => {
    borrarLogin();
    setOficialLogueado(null);
  };

  const irAInicio = () => {
    setGuardado(cargarGuardado());
    setVista('inicio');
    setAbrirFixtureAlEntrar(false); // se resetea al salir, no queda pegado en próximas entradas normales
    setEsEdicionAdmin(false);
  };

  const nuevoPartido = () => {
    setEsEdicionAdmin(false);
    setDatos({ ...ESTADO_INICIAL, _id: generarId() });
    setPantalla(1);
    setVista('partido');
  };

  const continuarPartido = () => {
    const g = cargarGuardado();
    if (g) {
      setEsEdicionAdmin(false);
      setDatos(g.datos);
      setPantalla(g.pantalla || 1);
      setVista('partido');
    }
  };

  const irAHistorial = () => {
    setHistorial(obtenerHistorial());
    setVista('historial');
  };

  const esAdmin = !!oficialLogueado && listas.perfiles?.[(oficialLogueado || '').toUpperCase()] === 'ADMINISTRADOR';
  // GESTION: perfil liviano que solo ve Informes (ej. alguien de la
  // comisión que necesita mirar los tableros, sin ser un Oficial de
  // Partido de verdad) — se le ocultan Nuevo Partido/Continuar/Historial,
  // que no le sirven de nada.
  const esGestion = !!oficialLogueado && listas.perfiles?.[(oficialLogueado || '').toUpperCase()] === 'GESTION';
  const veInformes = esAdmin || (!!oficialLogueado && !!listas.veInformes?.[(oficialLogueado || '').toUpperCase()]);
  const veAsignar = esAdmin || (!!oficialLogueado && !!listas.veAsignar?.[(oficialLogueado || '').toUpperCase()]);
  const irAAdmin = () => setVista('admin');

  // Se llama al tocar "Finalizar Partido" en el Acta: lo marca como
  // finalizado en el Historial y lo manda a la planilla compartida.
  const finalizarPartido = () => {
    const actaTexto = generarActaTexto(datos) + (datos.acta_extra ? ' ' + datos.acta_extra : '');
    const id = guardarEnHistorial(datos, actaTexto, { estado: 'finalizado' });
    enviarAPlanillaCompartida(datos, actaTexto, oficialLogueado).then(ok => marcarEnviadoNube(id, ok));
    // Punto pedido: las fotos de Planillas se guardaban a propósito hasta
    // este momento (por si había que reenviarlas a otra persona) — recién
    // ahora, con el partido finalizado del todo, se limpian del celular.
    borrarFotosFormacion(datos._id).catch(() => {});
    limpiarPuntero();
    setGuardado(null);
    setVista('inicio');
  };

  // Se llama al tocar un partido del historial (en curso o finalizado): lo
  // vuelve a cargar como partido activo, empezando por la pantalla de Datos.
  const editarDesdeHistorial = (entrada) => {
    setEsEdicionAdmin(false);
    setDatos({ ...entrada.datos, _id: entrada.datos._id || entrada.id });
    setPantalla(1);
    setVista('partido');
  };

  // Se llama al tocar "Editar" en el Panel Administrador: reconstruye el
  // objeto datos a partir de la fila de la planilla compartida (no del
  // historial local) y lo carga como partido activo. Algunos campos que la
  // planilla no guarda (Regreso Local/Visita, Duración, Desvío Inicio) van
  // a quedar en blanco y se recalculan solos al tocar los horarios de
  // nuevo — por eso se avisa antes de entrar.
  //
  // No se autoguarda como "en curso" en este dispositivo (ver
  // esEdicionAdmin) — el admin puede estar solo mirando un partido ajeno,
  // no necesariamente trabajándolo, y no debe pisar/generar su propio
  // puntero de "Continuar Partido" solo por haber entrado a ver algo.
  const editarDesdePlanilla = (p) => {
    const confirmar = window.confirm(
      'Vas a editar un partido ya cargado en la planilla compartida.\n\n' +
      'Algunos datos que la planilla no guarda (Regreso Local/Visita, Duración, Desvío Inicio) van a quedar vacíos hasta que los vuelvas a tocar en la pantalla de Horarios.\n\n' +
      '¿Continuar?'
    );
    if (!confirmar) return;
    setEsEdicionAdmin(true);
    setDatos(sheetRowToDatos(p));
    setPantalla(1);
    setVista('partido');
  };

  if (vista === 'inicio') {
    return (
      <PantallaInicio
        guardado={guardado}
        onNuevo={nuevoPartido}
        onContinuar={continuarPartido}
        onHistorial={irAHistorial}
        oficiales={listas.oficiales}
        pines={listas.pines}
        oficialLogueado={oficialLogueado}
        onLogin={handleLogin}
        onLogout={handleLogout}
        esAdmin={esAdmin}
        esGestion={esGestion}
        onAdmin={irAAdmin}
        veInformes={veInformes}
        onInformes={() => setVista('informes')}
        veAsignar={veAsignar}
        onAsignar={() => setVista('asignar')}
        pendientes={pendientes}
        cargandoPendientes={cargandoPendientes}
        onActualizarPendientes={() => cargarPendientes(oficialLogueado)}
        onCargarPendiente={(p) => {
          // Bug real corregido: acá se generaba SIEMPRE un _id nuevo, aunque
          // ya se hubiera empezado a cargar ese mismo partido antes — cada
          // toque de la tarjeta creaba un registro distinto y desconectado
          // del anterior, así que lo que ya estaba cargado (árbitro,
          // delegados, etc.) quedaba huérfano en un _id viejo, y "Continuar
          // Partido" podía terminar mostrando cualquiera de los dos. Ahora,
          // antes de crear uno nuevo, busca en el Historial si YA hay un
          // partido "en curso" para este mismo Torneo+Fecha+Local+Visitante
          // — si lo encuentra, continúa ESE (con todo lo ya cargado), en
          // vez de arrancar de cero.
          setEsEdicionAdmin(false);
          const yaEnCurso = obtenerHistorial().find(h =>
            h.estado === 'en_curso' && h.torneo === p.torneo && String(h.fecha_nro) === String(p.fecha_nro)
            && h.local === p.local && h.visitante === p.visitante
          );
          if (yaEnCurso) {
            setDatos(yaEnCurso.datos);
          } else {
            setDatos({
              ...ESTADO_INICIAL, _id: generarId(),
              torneo: p.torneo, division: p.division, fecha_nro: p.fecha_nro,
              local: p.local, visitante: p.visitante, estadio: p.estadio,
              dia: p.dia, hora: p.hora, nro: p.partido_nro,
            });
          }
          setPantalla(1);
          setVista('partido');
        }}
      />
    );
  }

  if (vista === 'asignar') {
    return <PantallaAsignarPartidos onBack={irAInicio} listas={listas} fixtureFilas={fixtureFilas} clubesFilas={clubesFilas} abrirFixtureAlEntrar={abrirFixtureAlEntrar} />;
  }

  if (vista === 'admin') {
    return <PantallaAdmin onBack={irAInicio} onEditarListas={() => setVista('adminListas')} onEditar={editarDesdePlanilla} listas={listas} />;
  }

  if (vista === 'adminListas') {
    return <PantallaAdminListas onBack={() => setVista('admin')} oficialLogueado={oficialLogueado} onIrAFixture={() => { setAbrirFixtureAlEntrar(true); setVista('asignar'); }} />;
  }

  if (vista === 'informes') {
    return <PantallaInformes onBack={irAInicio} listas={listas} onInformeClub={() => setVista('informeClub')} />;
  }

  if (vista === 'informeClub') {
    return <PantallaInformeClub onBack={() => setVista('informes')} listas={listas} />;
  }

  if (vista === 'historial') {
    return <PantallaHistorial historial={historial} onBack={irAInicio} onEditar={editarDesdeHistorial} oficialLogueado={oficialLogueado} onRecargar={() => setHistorial(obtenerHistorial())} />;
  }

  return (
    <div>
      {pantalla === 1 && <Pantalla1 datos={datos} setDatos={setDatos} listas={listas} onSalir={irAInicio} onIrA={setPantalla} onNext={() => { setPantalla(2); window.scrollTo(0,0); }} fixtureFilas={fixtureFilas} clubesFilas={clubesFilas} />}
      {pantalla === 2 && <Pantalla2 datos={datos} setDatos={setDatos} onIrA={setPantalla} onNext={() => { setPantalla(3); window.scrollTo(0,0); }} onBack={() => { setPantalla(1); window.scrollTo(0,0); }} />}
      {pantalla === 3 && <Pantalla3 datos={datos} setDatos={setDatos} listas={listas} onIrA={setPantalla} onNext={() => { setPantalla(4); window.scrollTo(0,0); }} onBack={() => { setPantalla(2); window.scrollTo(0,0); }} />}
      {pantalla === 4 && <Pantalla4 datos={datos} setDatos={setDatos} onIrA={setPantalla} onNext={() => { setPantalla(5); window.scrollTo(0,0); }} onBack={() => { setPantalla(3); window.scrollTo(0,0); }} />}
      {pantalla === 5 && <Pantalla5 datos={datos} setDatos={setDatos} onIrA={setPantalla} onBack={() => { setPantalla(4); window.scrollTo(0,0); }} onInicio={irAInicio} onFinalizar={finalizarPartido} listas={listas} />}
    </div>
  );
}
