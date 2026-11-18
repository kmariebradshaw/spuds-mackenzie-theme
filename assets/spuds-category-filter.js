import { sectionRenderer } from '@theme/section-renderer';

class SpudsCategoryFilter extends HTMLElement {
  #revision = 0;

  connectedCallback() {
    this.hidden = false;
    this.addEventListener('click', this.#choose);
    window.addEventListener('popstate', this.#restore);
    document.addEventListener('click', this.#gridLink);
    if (new URL(location.href).searchParams.has('spuds_category')) this.#restore();
  }

  disconnectedCallback() {
    this.#revision++;
    this.removeEventListener('click', this.#choose);
    window.removeEventListener('popstate', this.#restore);
    document.removeEventListener('click', this.#gridLink);
  }

  #choose = (event) => {
    const button = event.target.closest('button[data-category]');
    if (!button) return;
    const url = new URL(location.href);
    const category = button.dataset.category;
    if (category && url.searchParams.get('spuds_category') !== category) {
      url.searchParams.set('spuds_category', category);
    } else {
      url.searchParams.delete('spuds_category');
    }
    url.searchParams.delete('page');
    this.#render(url, true);
  };

  #restore = () => this.#render(new URL(location.href), false);

  #gridLink = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('.spuds-collection-products .pagination__link[href], .spuds-collection-products .main-collection-grid__empty-link');
    const category = new URL(location.href).searchParams.get('spuds_category');
    if (!anchor || !category) return;
    event.preventDefault();
    const url = new URL(anchor.href);
    url.pathname = this.dataset.hubPath;
    url.searchParams.set('spuds_category', category);
    this.#render(url, true);
  };

  async #render(url, push) {
    const grid = document.querySelector('results-list[data-spuds-source]');
    const id = grid?.getAttribute('section-id');
    if (!id) return;
    const revision = ++this.#revision;
    const key = url.searchParams.get('spuds_category') || '';
    const buttons = Array.from(this.querySelectorAll('button[data-category]'));
    const choice = buttons.find(button => button.dataset.category === key) || buttons[0];
    if (!choice.dataset.category) url.searchParams.delete('spuds_category');
    const status = this.querySelector('[role="status"]');
    const region = grid.closest('.shopify-section');
    region.setAttribute('aria-busy', 'true');
    region.inert = true;
    try {
      const useCache = status.classList.contains('visually-hidden');
      const html = await sectionRenderer.getSectionHTML(id, useCache, url);
      if (this.#revision !== revision) return;
      const responseGrid = new DOMParser().parseFromString(html, 'text/html').querySelector('results-list[data-spuds-source]');
      const expectedPath = choice.dataset.source || this.dataset.hubPath;
      if (!responseGrid || !expectedPath.endsWith('/' + responseGrid.dataset.spudsSource)) {
        throw new Error('Missing category results');
      }
      if (push && url.href !== location.href) history.pushState(null, '', url);
      await sectionRenderer.renderSection(id, { url, cache: true });
      if (this.#revision !== revision) return;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button === choice)));
      status.classList.add('visually-hidden');
      status.textContent = choice.dataset.status;
    } catch {
      if (this.#revision !== revision) return;
      status.classList.remove('visually-hidden');
      status.textContent = this.dataset.error;
    } finally {
      if (this.#revision === revision) {
        region.removeAttribute('aria-busy');
        region.inert = false;
      }
    }
  }
}

if (!customElements.get('spuds-category-filter')) {
  customElements.define('spuds-category-filter', SpudsCategoryFilter);
}
