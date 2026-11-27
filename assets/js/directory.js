import { RESIDENCES } from '../config.js';
import { roles } from './catalog.js';
const page = document.body.dataset.directory;
const list = document.getElementById('directory-list');
const chosen = new URLSearchParams(location.search).get('residence');
function card(href, title, description, symbol) {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.className = 'feature-card';
  const artwork = document.createElement('span');
  artwork.className = 'feature-icon';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
    use = document.createElementNS(svg.namespaceURI, 'use');
  svg.classList.add('icon');
  svg.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', '/assets/icons.svg#' + symbol);
  svg.append(use);
  artwork.append(svg);
  const name = document.createElement('strong'),
    info = document.createElement('span');
  name.textContent = title;
  info.textContent = description;
  anchor.append(artwork, name, info);
  list.append(anchor);
}
if (list && page === 'workspace' && Object.hasOwn(RESIDENCES, chosen) && !RESIDENCES[chosen].demoOnly) {
  document.querySelector('h1').textContent = RESIDENCES[chosen].name;
  document.getElementById('directory-note').textContent = 'Select the role assigned to your account.';
  for (const role of RESIDENCES[chosen].roles)
    card(`/${role}/?residence=${chosen}`, ...[roles[role][0], roles[role][2], roles[role][1]]);
} else if (list)
  for (const [id, r] of Object.entries(RESIDENCES)) {
    if (page === 'workspace' && r.demoOnly) continue;
    card(
      page === 'demo' ? `/${id}/demo/` : `/workspace/?residence=${id}`,
      r.name,
      page === 'demo' ? 'Open sample workspaces' : 'Choose an operational role',
      'building',
    );
  }
