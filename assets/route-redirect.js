(() => {
  const value = document.querySelector('meta[name="rz-target"]')?.content;
  if (!value || !/^\/(?!\/)/.test(value)) return;
  const target = new URL(value, location.origin);
  if (target.origin !== location.origin) return;
  const incoming = new URLSearchParams(location.search);
  const tabs = {
    vetting: 'applications',
    finance: 'finances',
    access: 'visitors',
    driver: 'transport',
    occupancy: 'occupancy',
    security: 'security',
    maintenance: 'maintenance',
    inspections: 'inspections',
    housekeeping: 'housekeeping',
    communication: 'communication',
  };
  if (target.pathname === '/management/' && Object.hasOwn(tabs, incoming.get('tab'))) {
    target.pathname += tabs[incoming.get('tab')] + '/';
    incoming.delete('tab');
  }
  for (const [key, val] of incoming) if (!target.searchParams.has(key)) target.searchParams.append(key, val);
  target.hash = location.hash;
  location.replace(target.pathname + target.search + target.hash);
})();
