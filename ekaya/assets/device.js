// One IndexedDB read/write transaction elects the same device reference even
// on the first visit from two tabs. Both portals are served on rezflow.co.za.
const storeName = 'intake';
const deviceKey = 'device-2027';
const receiptKey = 'receipt-2027';
let connection;
function database() {
  if (!connection) connection = new Promise((resolve,reject) => {
    const request = indexedDB.open('rezflow-resident-check-in',1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(error => { connection = null; throw error; });
  return connection;
}
async function transaction(key, update) {
  const db = await database();
  return new Promise((resolve,reject) => {
    const tx = db.transaction(storeName,update ? 'readwrite' : 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    let value;
    request.onsuccess = () => {
      value = request.result;
      if (update) {
        const next = update(value);
        if (next !== value) store.put(next,key);
        value = next;
      }
    };
    tx.oncomplete = () => resolve(value);
    tx.onabort = () => reject(tx.error || new Error('Storage unavailable.'));
    tx.onerror = () => reject(tx.error);
  });
}
export const deviceReference = () => transaction(deviceKey, current => current || crypto.randomUUID());
export const readReceipt = () => transaction(receiptKey);
export async function rememberReceipt(receipt) {
  const saved = await transaction(receiptKey, previous => {
    if (!previous || (!previous.residence && receipt.residence)) return receipt;
    return previous;
  });
  try { localStorage.setItem('rezflow-2027-complete',String(Date.now())); } catch {}
  return saved;
}
