// Client-side tag filtering for a `.project-list` paired with a `.tag-filter`
// bar. Deep-linkable via ?tag=<slug>. Used by the home (projects) and /blog.
export function initTagFilter() {
  const list = document.querySelector('.project-list');
  const bar = document.querySelector('.tag-filter');
  const empty = document.querySelector<HTMLElement>('.filter-empty');
  if (!list || !bar) return;

  const items = Array.from(list.querySelectorAll<HTMLElement>('li'));
  const buttons = Array.from(bar.querySelectorAll('button'));

  function apply(tag: string) {
    let shown = 0;
    for (const li of items) {
      const tags = (li.getAttribute('data-tags') || '').split(' ').filter(Boolean);
      const hide = !!tag && !tags.includes(tag);
      li.hidden = hide;
      if (!hide) shown++;
    }
    for (const b of buttons) {
      b.setAttribute('aria-pressed', String((b.getAttribute('data-tag') || '') === (tag || '')));
    }
    if (empty) empty.hidden = shown > 0;
    const url = new URL(location.href);
    if (tag) url.searchParams.set('tag', tag);
    else url.searchParams.delete('tag');
    history.replaceState({}, '', url);
  }

  bar.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest('button');
    if (btn) apply(btn.getAttribute('data-tag') || '');
  });

  // Chips on the cards filter too.
  list.addEventListener('click', (e) => {
    const chip = (e.target as Element).closest('.tag');
    if (chip) {
      e.preventDefault();
      apply(chip.getAttribute('data-tag') || '');
      (bar as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  apply(new URL(location.href).searchParams.get('tag') || '');
}
