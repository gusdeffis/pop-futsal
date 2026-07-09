import { useState, useEffect } from 'react';
import Pantalla1 from './components/Pantalla1';
import Pantalla2 from './components/Pantalla2';
import Pantalla3 from './components/Pantalla3';
import Pantalla4 from './components/Pantalla4';
import Pantalla5 from './components/Pantalla5';
import { ESTADO_INICIAL } from './data';
import { useAutoSave, cargarGuardado, limpiarGuardado } from './useAutoSave';

export default function App() {
  const [pantalla, setPantalla] = useState(1);
  const [datos, setDatos] = useState(ESTADO_INICIAL);
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);

  useEffect(() => {
    const guardado = cargarGuardado();
    if (guardado?.datos?.torneo) setMostrarRecuperar(true);
  }, []);

  useAutoSave(datos);

  const recuperar = () => {
    const guardado = cargarGuardado();
    if (guardado) { setDatos(guardado.datos); setMostrarRecuperar(false); }
  };

  const nuevoPartido = () => {
    limpiarGuardado();
    setDatos(ESTADO_INICIAL);
    setMostrarRecuperar(false);
    setPantalla(1);
  };

  if (mostrarRecuperar) {
    const guardado = cargarGuardado();
    const fecha = guardado ? new Date(guardado.timestamp).toLocaleString('es-AR') : '';
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
        <div style={{ fontSize: 48 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0d1f4e', textAlign: 'center' }}>Tenés un partido sin terminar</div>
        <div style={{ fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 1.6 }}>
          Guardado el {fecha}
          {guardado?.datos?.torneo && <><br /><strong>{guardado.datos.torneo}</strong></>}
          {guardado?.datos?.local && <><br />{guardado.datos.local} vs {guardado.datos.visitante}</>}
        </div>
        <button onClick={recuperar} style={{ width: '100%', height: 50, background: '#0d1f4e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          Continuar donde dejé
        </button>
        <button onClick={nuevoPartido} style={{ width: '100%', height: 50, background: '#e8edf8', color: '#0d1f4e', border: '1.5px solid #b8c8e8', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Empezar partido nuevo
        </button>
      </div>
    );
  }

  return (
    <div>
      {pantalla === 1 && <Pantalla1 datos={datos} setDatos={setDatos} onNext={() => { setPantalla(2); window.scrollTo(0,0); }} />}
      {pantalla === 2 && <Pantalla2 datos={datos} setDatos={setDatos} onNext={() => { setPantalla(3); window.scrollTo(0,0); }} onBack={() => { setPantalla(1); window.scrollTo(0,0); }} />}
      {pantalla === 3 && <Pantalla3 datos={datos} setDatos={setDatos} onNext={() => { setPantalla(4); window.scrollTo(0,0); }} onBack={() => { setPantalla(2); window.scrollTo(0,0); }} />}
      {pantalla === 4 && <Pantalla4 datos={datos} setDatos={setDatos} onNext={() => { setPantalla(5); window.scrollTo(0,0); }} onBack={() => { setPantalla(3); window.scrollTo(0,0); }} />}
      {pantalla === 5 && <Pantalla5 datos={datos} setDatos={setDatos} onBack={() => { setPantalla(4); window.scrollTo(0,0); }} />}
    </div>
  );
}
