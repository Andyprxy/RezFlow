(() => {
  if (/\/index\.html$/i.test(location.pathname)) {
    const canonical = location.pathname.replace(/index\.html$/i, '');
    history.replaceState(history.state, '', canonical + location.search + location.hash);
  }
})();
