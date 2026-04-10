const MAX_BREADCRUMBS = 50;
let breadcrumbs = [];

export function addBreadcrumb(breadcrumb) {
  breadcrumbs.push({
    timestamp: new Date().toISOString(),
    ...breadcrumb
  });
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift(); // Remove oldest to maintain max limit
  }
}

export function getBreadcrumbs() {
  return [...breadcrumbs];
}

export function initBreadcrumbTracking() {
  if (typeof window === 'undefined') return;

  // 1. UI Clicks
  document.addEventListener('click', (e) => {
    try {
      const target = e.target;
      if (!target || !target.tagName) return;
      
      const tagName = target.tagName.toLowerCase();
      let text = target.innerText || target.value || target.alt || '';
      if (text.length > 35) text = text.slice(0, 35) + '...';
      text = text.trim();
      
      // 💡 HEURISTIC FILTER: Ignore noisy clicks on empty structural elements
      const isInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(tagName);
      const hasId = !!target.id;
      const hasText = text.length > 0;
      
      if (!isInteractive && !hasId && !hasText) {
        // Silently drop clicks on raw divs, spans, or SVGs that provide no contextual intelligence
        return;
      }
      
      let identifier = tagName;
      if (target.id) identifier += `#${target.id}`;
      else if (target.className && typeof target.className === 'string') {
        const classes = target.className.split(' ').filter(c => c).join('.');
        if (classes && classes.length < 40) identifier += `.${classes}`;
      }
      
      addBreadcrumb({
        category: 'ui.click',
        message: `Clicked ${identifier}`,
        data: { text }
      });
    } catch (_) {}
  }, true);

  // 2. Navigation Flow
  const trackNav = (to) => addBreadcrumb({ category: 'navigation', message: `Navigated to ${to}` });
  
  const originalPush = history.pushState;
  history.pushState = function(...args) {
    if (args[2]) trackNav(args[2]);
    return originalPush.apply(this, args);
  };
  
  window.addEventListener('popstate', () => {
    trackNav(window.location.pathname);
  });
}
