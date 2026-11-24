// Defensa adicional (opción c): se importa PRIMERO en cada worker. Reemplaza las APIs de red del
// reino del worker por funciones que lanzan error y las congela. No cubre import() dinámico.
const deny = (name) => function () { throw new Error(`Red bloqueada en worker: ${name}`); };
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'Worker', 'SharedWorker', 'WebTransport']) {
  if (name in self) Object.defineProperty(self, name, { value: deny(name), writable: false, configurable: false });
}
if (self.navigator && 'sendBeacon' in self.navigator) Object.defineProperty(self.navigator, 'sendBeacon', { value: deny('sendBeacon'), writable: false, configurable: false });
