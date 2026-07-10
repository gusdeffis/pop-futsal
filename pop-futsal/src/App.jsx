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
import { useAutoSave, cargarGuardado, limpiarGuardado, obtenerHistorial, guardarEnHistorial } from './useAutoSave';

export default function App() {
  const [vista, setVista] = useState('inicio'); // 'inicio' | 'partido' | 'historial'
  const [pantalla, setPantalla] = useState(1);
  const [datos, setDatos] = useState(ESTADO_INICIAL);
  const [guardado, setGuardado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const listas = useListas();

  useEffect(() => {
    setGuardado(cargarGuardado());
  }, [vista]);

  useAutoSave(datos, pantalla);

  // Cada vez que se llega a la pantalla de Acta, se guarda/actualiza el partido en el historial
  useEffect(() => {
    if (vista === 'partido' && pantalla === 5 && datos.torneo) {
      guardarEnHistorial(datos, generarActaTexto(datos));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, pantalla]);

  const irAInicio = () => {
    setGuardado(cargarGuardado());
    setVista('inicio');
  };

  const nuevoPartido = () => {
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

  if (vista === 'inicio') {
    return <PantallaInicio guardado={guardado} onNuevo={nuevoPartido} onContinuar={continuarPartido} onHistorial={irAHistorial} />;
  }

  if (vista === 'historial') {
    return <PantallaHistorial historial={historial} onBack={irAInicio} />;
  }

  return (
    <div>
      {pantalla === 1 && <Pantalla1 datos={datos} setDatos={setDatos} listas={listas} onNext={() => { setPantalla(2); window.scrollTo(0,0); }} />}
      {pantalla === 2 && <Pantalla2 datos={datos} setDatos={setDatos} onNext={() => { setPantalla(3); window.scrollTo(0,0); }} onBack={() => { setPantalla(1); window.scrollTo(0,0); }} />}
      {pantalla === 3 && <Pantalla3 datos={datos} setDatos={setDatos} listas={listas} onNext={() => { setPantalla(4); window.scrollTo(0,0); }} onBack={() => { setPantalla(2); window.scrollTo(0,0); }} />}
      {pantalla === 4 && <Pantalla4 datos={datos} setDatos={setDatos} onNext={() => { setPantalla(5); window.scrollTo(0,0); }} onBack={() => { setPantalla(3); window.scrollTo(0,0); }} />}
      {pantalla === 5 && <Pantalla5 datos={datos} setDatos={setDatos} onBack={() => { setPantalla(4); window.scrollTo(0,0); }} onInicio={irAInicio} />}
    </div>
  );
}
