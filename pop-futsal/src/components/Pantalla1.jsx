import { Header, SeccionHeader, SeccionSub, Campo, Input, Select, Divider, BtnNext } from './UI';
import { TORNEOS, FECHAS, CATEGORIAS, CLUBES, ESTADIOS, ARBITROS, OFICIALES_AFA } from '../data';

export default function Pantalla1({ datos, setDatos, onNext }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));
  const valido = datos.torneo && datos.local && datos.visitante && datos.arbitro;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={1} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SeccionHeader>1. Datos del partido</SeccionHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SeccionSub>Torneo y fecha</SeccionSub>
          <Campo label="Torneo" required>
            <Select value={datos.torneo} onChange={set('torneo')} options={TORNEOS} placeholder="Seleccioná el torneo" />
          </Campo>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 8 }}>
            <Campo label="Fecha N°">
              <Select value={datos.fecha_nro} onChange={set('fecha_nro')} options={FECHAS} placeholder="N°" />
            </Campo>
            <Campo label="Día">
              <Input value={datos.dia} onChange={set('dia')} placeholder="04/07" />
            </Campo>
            <Campo label="Hora">
              <Input value={datos.hora} onChange={set('hora')} placeholder="18:00" />
            </Campo>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Campo label="División">
              <div style={{ display: 'flex', gap: 8 }}>
                {['M', 'F'].map(d => (
                  <button key={d} onClick={() => set('division')(d)} style={{
                    flex: 1, height: 46, borderRadius: 8, border: '1.5px solid',
                    borderColor: datos.division === d ? '#0d1f4e' : '#dde1ec',
                    background: datos.division === d ? '#eef1fa' : '#f8f9fc',
                    color: datos.division === d ? '#0d1f4e' : '#666',
                    fontWeight: datos.division === d ? 700 : 400,
                    fontSize: 16, cursor: 'pointer',
                  }}>{d}</button>
                ))}
              </div>
            </Campo>
            <Campo label="Categoría">
              <Select value={datos.cat} onChange={set('cat')} options={CATEGORIAS} placeholder="Cat." />
            </Campo>
          </div>
          <Campo label="Partido N°">
            <Input value={datos.nro} onChange={set('nro')} placeholder="Número de partido" type="number" />
          </Campo>
        </div>

        <Divider />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SeccionSub>Equipos y resultado</SeccionSub>
          <Campo label="Local" required>
            <Select value={datos.local} onChange={set('local')} options={CLUBES} placeholder="Equipo local" />
          </Campo>
          <Campo label="Visitante" required>
            <Select value={datos.visitante} onChange={set('visitante')} options={CLUBES} placeholder="Equipo visitante" />
          </Campo>
          <Campo label="Estadio">
            <Select value={datos.estadio} onChange={set('estadio')} options={ESTADIOS} placeholder="Estadio" />
          </Campo>
          <Campo label="Resultado final">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input value={datos.res_local} onChange={set('res_local')} placeholder="L" type="number" style={{ textAlign: 'center', fontSize: 22, fontWeight: 600 }} />
              <span style={{ fontSize: 20, color: '#aaa', flexShrink: 0 }}>—</span>
              <Input value={datos.res_visitante} onChange={set('res_visitante')} placeholder="V" type="number" style={{ textAlign: 'center', fontSize: 22, fontWeight: 600 }} />
            </div>
          </Campo>
        </div>

        <Divider />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SeccionSub>Cuerpo arbitral y oficial</SeccionSub>
          <Campo label="Árbitro" required>
            <Select value={datos.arbitro} onChange={set('arbitro')} options={ARBITROS} placeholder="Seleccioná el árbitro" />
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
            <Select value={datos.oficial_afa} onChange={set('oficial_afa')} options={OFICIALES_AFA} placeholder="Seleccioná el oficial" />
          </Campo>
        </div>
      </div>

      <div style={{ padding: '8px 16px 24px', display: 'flex' }}>
        <BtnNext onClick={onNext} disabled={!valido}>Siguiente: Control previo</BtnNext>
      </div>
    </div>
  );
}
