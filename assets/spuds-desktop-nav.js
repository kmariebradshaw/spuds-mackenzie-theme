if (!customElements.get('spuds-desktop-nav')) {
  customElements.define('spuds-desktop-nav', class extends HTMLElement {
    connectedCallback() {
      this.controller?.abort();
      this.controller = new AbortController();
      const { signal } = this.controller;
      const details = this.querySelector('details');
      const summary = details?.querySelector('summary');
      if (!details || !summary) return;
      document.addEventListener('pointerdown', (event) => {
        if (!this.contains(event.target)) details.open = false;
      }, { signal });
      this.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && details.open) {
          event.preventDefault();
          details.open = false;
          summary.focus();
        }
      }, { signal });
      this.addEventListener('focusout', (event) => {
        if (!this.contains(event.relatedTarget)) details.open = false;
      }, { signal });
      this.addEventListener('click', (event) => {
        if (event.target.closest('a')) details.open = false;
      }, { signal });
    }
    disconnectedCallback() { this.controller?.abort(); }
  });
}
