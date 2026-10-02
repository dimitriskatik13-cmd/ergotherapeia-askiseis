// Μικρά βοηθητικά DOM (χωρίς framework).
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

// A closed overlay must be absent from keyboard navigation as well as sight.
export function modalFocus(node, { close, initialFocus, exempt = [] }) {
  let opener = null;
  let blocked = [];
  let active = false;
  node.inert = true;
  node.addEventListener('keydown', (event) => {
    if (!active) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...node.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
      .filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length && !el.closest('[inert]'));
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); node.focus(); }
    else if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  return {
    open() {
      if (active) return;
      opener = document.activeElement;
      active = true;
      node.inert = false;
      node.classList.add('is-open');
      node.setAttribute('aria-hidden', 'false');
      blocked = [...document.body.children].filter((el) => el !== node && !el.contains(node) && !exempt.includes(el))
        .map((el) => [el, el.inert]);
      blocked.forEach(([el]) => { el.inert = true; });
      (initialFocus() || node).focus({ preventScroll: true });
    },
    close() {
      if (!active) return;
      active = false;
      blocked.forEach(([el, inert]) => { el.inert = inert; });
      blocked = [];
      if (opener?.isConnected && !opener.closest('[inert]')) opener.focus({ preventScroll: true });
      node.inert = true;
      node.classList.remove('is-open');
      node.setAttribute('aria-hidden', 'true');
    },
  };
}
