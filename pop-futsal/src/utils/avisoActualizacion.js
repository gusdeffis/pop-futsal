// Punto real: aunque el Service Worker se actualiza solo por dentro
// (skipWaiting/clientsClaim), la pantalla YA ABIERTA sigue mostrando el
// código viejo que ya cargó en memoria hasta que se recarga — por eso a
// veces se quedaba mostrando una versión vieja aunque hubiera una nueva
// disponible hacía rato, y pedirle a cada oficial que busque "borrar
// caché" en la configuración del celular no es razonable. Este cartel
// aparece apenas hay una versión nueva lista, con un botón para
// actualizar al instante — sin tener que tocar nada del celular.
export function mostrarAvisoActualizacion(actualizar) {
  if (document.getElementById('aviso-actualizacion-pop')) return; // ya está mostrado, no duplicar
  const aviso = document.createElement('div');
  aviso.id = 'aviso-actualizacion-pop';
  aviso.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#0d1f4e;color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:system-ui,sans-serif;box-shadow:0 -2px 10px rgba(0,0,0,.2);';
  aviso.innerHTML = `
    <span style="font-size:13px;font-weight:600;">🔄 Hay una versión nueva disponible</span>
    <button id="btn-actualizar-pop" style="background:#fff;color:#0d1f4e;border:none;border-radius:8px;padding:8px 14px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;">Actualizar</button>
  `;
  document.body.appendChild(aviso);
  document.getElementById('btn-actualizar-pop').addEventListener('click', () => actualizar(true));
}
