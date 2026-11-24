(() => {
  const byId = (id) => document.getElementById(id);
  const nav = byId('navigation');
  const menu = document.querySelector('.menu-toggle');

  function setMenu(open) {
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  menu.hidden = false;
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') === 'false'));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.masthead')) setMenu(false);
  });
  document.addEventListener('focusin', (event) => {
    if (!event.target.closest('.masthead')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menu.focus();
    }
  });
  const mobileLayout = window.matchMedia('(max-width: 760px)');
  mobileLayout.addEventListener?.('change', () => setMenu(false));

  const tabs = Array.from(document.querySelectorAll('.tabs [role="tab"]'));
  function selectTab(current) {
    for (const tab of tabs) {
      const selected = current === tab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      byId(tab.getAttribute('aria-controls')).hidden = !selected;
    }
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      const positions = { Home: 0, End: tabs.length - 1, ArrowLeft: index - 1, ArrowRight: index + 1 };
      if (!Object.hasOwn(positions, event.key)) return;
      event.preventDefault();
      const next = tabs[(positions[event.key] + tabs.length) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });
  selectTab(tabs[0]);

  const videos = [...document.querySelectorAll('.walk video')];
  for (const video of videos) {
    video.addEventListener('play', () => videos.forEach((other) => {
      if (other !== video && !other.paused) other.pause();
    }));
    const showFallback = () => {
      video.closest('.walk').querySelector('.video-fallback').hidden = false;
    };
    video.addEventListener('error', showFallback);
    video.querySelector('source').addEventListener('error', showFallback);
  }

  const contact = byId('contact-dialog');
  const privacy = byId('privacy-dialog');
  const form = byId('enquiry');
  const status = byId('form-status');
  function openDialog(dialog) {
    setMenu(false);
    dialog.showModal();
    document.body.classList.add('has-dialog');
  }
  for (const link of document.querySelectorAll('[data-contact]')) {
    link.addEventListener('click', (event) => {
      if (typeof contact.showModal !== 'function' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      form.elements.plan.value = link.dataset.plan || 'Help me choose';
      status.textContent = '';
      openDialog(contact);
    });
  }
  document.querySelector('[data-privacy]').addEventListener('click', (event) => {
    if (typeof privacy.showModal !== 'function') return;
    event.preventDefault();
    openDialog(privacy);
  });
  for (const dialog of [contact, privacy]) {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => document.body.classList.remove('has-dialog'));
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const {left, right, top, bottom} = dialog.getBoundingClientRect();
      if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) dialog.close();
    });
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const entry = Object.fromEntries(new FormData(form));
    const message = [
      'Hello RezFlow team,', '', 'I would like to discuss RezFlow for my residence.', '',
      'Name: ' + entry.name, 'Email: ' + entry.email, 'Property: ' + entry.property,
      'City: ' + entry.city, 'Beds: ' + (entry.beds || 'To discuss'), 'Package: ' + entry.plan,
      '', entry.message, '', 'Kind regards,', entry.name
    ].join('\n');
    const subject = 'RezFlow enquiry: ' + entry.property;
    window.location.href = 'mailto:admin@rezflow.co.za?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(message);
    status.textContent = 'Review the draft in your email app, then send it to RezFlow. You can also use the email link below.';
  });
  byId('year').textContent = String(new Date().getFullYear());
  document.documentElement.classList.add('js-ready');
})();
