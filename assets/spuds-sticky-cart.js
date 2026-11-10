import { StandardEvents } from '@shopify/events';

class SpudsStickyCart {
  constructor(root) {
    this.root = root;
    this.bar = root.querySelector('[data-spuds-sticky-cart]');
    this.mainButton = root.querySelector('[data-spuds-add-to-cart]');
    if (!this.bar || !this.mainButton) return;
    this.button = this.bar.querySelector('[data-spuds-sticky-submit]');
    this.label = this.bar.querySelector('[data-spuds-sticky-label]');
    this.error = this.bar.querySelector('[data-spuds-sticky-error]');
    this.media = window.matchMedia('(max-width: 749px)');
    this.controller = new AbortController();
    const { signal } = this.controller;
    this.pending = false;
    this.update = this.update.bind(this);

    this.button.addEventListener('click', () => {
      const form = this.mainButton.form;
      if (this.pending || this.mainButton.disabled || !form) return;
      if (!form.reportValidity()) {
        form.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      this.mainButton.click();
    }, { signal });
    root.addEventListener('change', this.update, { signal });
    root.addEventListener('input', this.update, { signal });
    root.addEventListener(StandardEvents.cartLinesUpdate, (event) => {
      if (event.action !== 'add' || !event.promise) return;
      this.pending = true;
      this.update();
      event.promise.then(() => {
        this.pending = false;
        this.update();
      }, () => {
        this.pending = false;
        this.update();
      });
    }, { signal });
    window.addEventListener('scroll', this.update, { passive: true, signal });
    window.addEventListener('resize', this.update, { passive: true, signal });
    this.media.addEventListener('change', this.update, { signal });
    this.observer = new MutationObserver(this.update);
    this.observer.observe(this.mainButton, { attributes: true, childList: true, subtree: true });
    const error = root.querySelector('[ref="addToCartTextError"]');
    if (error) this.observer.observe(error, { attributes: true, childList: true, subtree: true, characterData: true });
    this.resizeObserver = new ResizeObserver(() => {
      document.body.style.setProperty('--spuds-sticky-cart-height', `${this.bar.offsetHeight}px`);
    });
    this.resizeObserver.observe(this.bar);
    this.update();
  }

  update() {
    const rect = this.mainButton.getBoundingClientRect();
    const header = document.querySelector('#header-component')?.getBoundingClientRect();
    const headerBottom = Math.max(0, header?.bottom || 0);
    this.bar.hidden = !this.media.matches || rect.bottom > headerBottom;
    this.button.disabled = this.pending || this.mainButton.disabled;
    this.button.setAttribute('aria-busy', String(this.pending));
    this.label.textContent = this.pending ? this.root.dataset.addingLabel : this.root.querySelector('[data-spuds-add-label]')?.textContent.trim();
    const subscription = this.root.querySelector('[data-spuds-purchase-option]:checked')?.value === 'subscription';
    const price = this.root.querySelector(subscription ? '[data-spuds-subscription-price]' : '[data-spuds-one-time-price]');
    this.bar.querySelector('[data-spuds-sticky-price]').textContent = price?.textContent.trim() || '';
    const option = this.root.querySelector('[data-spuds-variant-select]')?.selectedOptions[0];
    const quantity = this.root.querySelector('[data-spuds-quantity-input]')?.value || '1';
    const plan = subscription ? this.root.querySelector('[data-spuds-subscription-name]')?.textContent.trim() : '';
    this.bar.querySelector('[data-spuds-sticky-selection]').textContent = [option?.textContent.trim(), plan, `${this.root.dataset.quantityLabel}: ${quantity}`].filter(Boolean).join(' · ');
    const originalError = this.root.querySelector('[ref="addToCartTextError"]');
    const message = originalError && !originalError.classList.contains('hidden') ? originalError.textContent.trim() : '';
    this.error.textContent = message;
    this.error.hidden = !message;
  }

  destroy() {
    this.controller?.abort();
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
  }
}

const instances = new WeakMap();
const initialize = (scope = document) => {
  scope.querySelectorAll('[data-spuds-product]').forEach((root) => {
    if (!instances.has(root)) instances.set(root, new SpudsStickyCart(root));
  });
};
initialize();
document.addEventListener('shopify:section:load', (event) => initialize(event.target));
document.addEventListener('shopify:section:unload', (event) => {
  event.target.querySelectorAll('[data-spuds-product]').forEach((root) => {
    instances.get(root)?.destroy();
    instances.delete(root);
  });
});
