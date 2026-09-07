// Fotos de "Formación 5 Iniciales" (Local/Visita) — se guardan en
// IndexedDB, no en el objeto `datos` normal (que va a localStorage vía
// JSON.stringify, y un archivo/Blob no se puede guardar así). Con esto,
// si el oficial saca una foto y la app se cierra sola (llamada entrante,
// corte de batería, lo que sea) antes de mandarla, al volver a entrar la
// foto sigue ahí — no hay que sacarla de nuevo. Se borran solas una vez
// que se mandan por WhatsApp.
const DB_NOMBRE = 'pop_futsal_fotos';
const DB_VERSION = 1;
const STORE = 'fotos';

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOMBRE, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function clave(partidoId, lado) {
  return `${partidoId}__${lado}`;
}

export async function guardarFoto(partidoId, lado, blob) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, clave(partidoId, lado));
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function obtenerFoto(partidoId, lado) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(clave(partidoId, lado));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function obtenerFotosFormacion(partidoId) {
  const [local, visita] = await Promise.all([
    obtenerFoto(partidoId, 'local'),
    obtenerFoto(partidoId, 'visita'),
  ]);
  return { local, visita };
}

export async function borrarFotosFormacion(partidoId) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(clave(partidoId, 'local'));
    tx.objectStore(STORE).delete(clave(partidoId, 'visita'));
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
