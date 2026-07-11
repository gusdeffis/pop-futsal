import { useState, useEffect } from 'react';
import Pantalla1 from './components/Pantalla1';
import Pantalla2 from './components/Pantalla2';
import Pantalla3 from './components/Pantalla3';
import Pantalla4 from './components/Pantalla4';
import Pantalla5 from './components/Pantalla5';
import PantallaInicio from './components/PantallaInicio';
import PantallaHistorial from './components/PantallaHistorial';
import { ESTADO_INICIAL } from './data';
import { useListas } from './useListas';
import { generarActaTexto } from './utils/acta';
import {
  useAutoSave, cargarGuardado, guardarInmediato, limpiarGuardado,
  obtenerHistorial, guardarEnHistorial, enviarAPlanillaCompartida, marcarEnviadoNube,
  guardarLogin, cargarLogin, borrarLogin,
} from './useAutoSave';

export default function App() {
  const loginInicial = cargarLogin();

  const [vista, setVista] = useState('inicio'); // 'inicio' | 'partido' | 'historial'
  const [pantalla, setPantalla] = useState(1);
  const [datos, setDatos] = useState(ESTADO_INICIAL);
  const [guardado, setGuardado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [oficialLogueado, setOficialLogueado] = useState(loginInicial);
  const listas = useListas();

  useEffect(() => {
    setGuardado(cargarGuardado());
  }, [vista]);

  useAutoSave(datos, pantalla);

  // Guardado reforzado: si el usuario sale de la app (cambia a otra app,
  // apaga la pantalla, cierra la pestaña) sin esperar el debounce normal,
  // esto guarda al instante para no perder los últimos cambios.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden' && vista === 'partido') {
        guardarInmediato(datos, pantalla);
      }
    };
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('pagehide', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('pagehide', handler);
    };
  }, [datos, pantalla, vista]);

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
  };

  const nuevoPartido = () => {
    // Si ya hay un partido sin terminar, confirmar antes de borrarlo —
    // para no perder datos por tocar este botón por error.
    if (cargarGuardado()) {
      const ok = window.confirm('Ya tenés un partido sin terminar. Si empezás uno nuevo, se va a borrar. ¿Querés continuar igual?');
      if (!ok) return;
    }
    limpiarGuardado();
    setDatos(ESTADO_INICIAL);
    setPantalla(1);
    setVista('partido');
  };

  const continuarPartido = () => {
    const g = cargarGuardado();
    if (g) {
      setDatos(g.datos);
      setPantalla(g.pantalla || 1);
      setVista('partido');
    }
  };

  const irAHistorial = () => {
    setHistorial(obtenerHistorial());
    setVista('historial');
  };

  // Se llama al tocar "Finalizar Partido" en el Acta: pasa el partido al
  // historial y libera el partido "en curso" (Continuar Partido queda vacío
  // hasta que se arranque uno nuevo).
  const finalizarPartido = () => {
    const actaTexto = generarActaTexto(datos) + (datos.acta_extra ? ' ' + datos.acta_extra : '');
    const id = guardarEnHistorial(datos, actaTexto);
    enviarAPlanillaCompartida(datos, actaTexto, oficialLogueado).then(ok => marcarEnviadoNube(id, ok));
    limpiarGuardado();
    setGuardado(null);
    setVista('inicio');
  };

  // Se llama al tocar un partido del historial: lo vuelve a cargar como
  // partido activo, empezando por la pantalla de Datos, para editarlo.
  const editarDesdeHistorial = (entrada) => {
    setDatos(entrada.datos);
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
      />
    );
  }

  if (vista === 'historial') {
    return <PantallaHistorial historial={historial} onBack={irAInicio} onEditar={editarDesdeHistorial} oficialLogueado={oficialLogueado} onRecargar={() => setHistorial(obtenerHistorial())} />;
  }

  return (
    <div>
      {pantalla === 1 && <Pantalla1 datos={datos} setDatos={setDatos} listas={listas} onSalir={irAInicio} onNext={() => { setPantalla(2); window.scrollTo(0,0); }} />}
      {pantalla === 2 && <Pantalla2 datos={datos} setDatos={setDatos} onNext={() => { setPantalla(3); window.scrollTo(0,0); }} onBack={() => { setPantalla(1); window.scrollTo(0,0); }} />}
      {pantalla === 3 && <Pantalla3 datos={datos} setDatos={setDatos} listas={listas} onNext={() => { setPantalla(4); window.scrollTo(0,0); }} onBack={() => { setPantalla(2); window.scrollTo(0,0); }} />}
      {pantalla === 4 && <Pantalla4 datos={datos} setDatos={setDatos} onNext={() => { setPantalla(5); window.scrollTo(0,0); }} onBack={() => { setPantalla(3); window.scrollTo(0,0); }} />}
      {pantalla === 5 && <Pantalla5 datos={datos} setDatos={setDatos} onBack={() => { setPantalla(4); window.scrollTo(0,0); }} onInicio={irAInicio} onFinalizar={finalizarPartido} />}
    </div>
  );
}
