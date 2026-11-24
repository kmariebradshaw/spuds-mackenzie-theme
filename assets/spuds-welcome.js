const storageKey = 'spuds.welcome';
const pendingKey = 'spuds.welcome.submitting';
const week = 7 * 24 * 60 * 60 * 1000;

// The form still works when the browser blocks persistent storage.
function stored(area, key, value) {
  try {
    const storage = window[area];
    if (value === null) storage.removeItem(key);
    else if (value !== undefined) storage.setItem(key, value);
    else return storage.getItem(key);
  } catch {
    return null;
  }
}

class SpudsWelcomePopup extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    this.events = new AbortController();
    const options = { signal: this.events.signal };
    const form = this.querySelector('form');
    const editor = this.hasAttribute('data-editor');
    const snoozeOnDismiss = this.hasAttribute('data-snooze-on-dismiss');
    const result = form.querySelector('[data-signup-result]')?.dataset.signupResult;
    const ownReturn = location.hash === '#' + this.dataset.formId ||
      Number(stored('sessionStorage', pendingKey)) > Date.now() - 30 * 60 * 1000;

    const dismiss = () => {
      if (snoozeOnDismiss && !editor && stored('localStorage', storageKey) !== 'subscribed') {
        stored('localStorage', storageKey, String(Date.now() + week));
      }
      this.dialog.close();
    };
    this.querySelector('.spuds-welcome__close').addEventListener('click', dismiss, options);
    this.dialog.addEventListener('cancel', event => {
      event.preventDefault();
      dismiss();
    }, options);
    this.dialog.addEventListener('click', event => {
      if (event.target === this.dialog) dismiss();
    }, options);
    this.dialog.addEventListener('close', () => {
      if (this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
    }, options);
    form.addEventListener('submit', () => stored('sessionStorage', pendingKey, String(Date.now())), options);
    if (editor) {
      this.closest('.shopify-section')?.addEventListener('shopify:section:select', () => this.openPopup(), options);
      this.closest('.shopify-section')?.addEventListener('shopify:section:deselect', () => this.dialog.close(), options);
      return;
    }
    if (result && ownReturn) {
      stored('sessionStorage', pendingKey, null);
      if (result === 'success') stored('localStorage', storageKey, 'subscribed');
      this.openPopup(result === 'error' ? form.querySelector('[type=email]') : undefined);
      return;
    }
    const previous = stored('localStorage', storageKey);
    if (result || this.hasAttribute('data-known-customer') || previous === 'subscribed' || (snoozeOnDismiss && Number(previous) > Date.now())) return;
    this.timer = setTimeout(() => this.openWhenIdle(), Number(this.dataset.delay));
  }

  openWhenIdle() {
    if (document.hidden || document.querySelector('dialog[open]') ||
        document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')) {
      this.timer = setTimeout(() => this.openWhenIdle(), 1200);
      return;
    }
    this.openPopup();
  }

  openPopup(target = this.querySelector('h2')) {
    if (this.dialog.open || !this.isConnected) return;
    this.previousFocus = document.activeElement;
    this.dialog.showModal();
    target.focus({ preventScroll: true });
  }

  disconnectedCallback() {
    clearTimeout(this.timer);
    this.events?.abort();
  }
}

if (!customElements.get('spuds-welcome-popup')) customElements.define('spuds-welcome-popup', SpudsWelcomePopup);
