import { CartLinesUpdateEvent, StandardEvents } from '@shopify/events';

const config = document.getElementById('spuds-gift-config');
const giftId = Number(config.dataset.variant);
const threshold = Number(config.dataset.threshold);
const cartUrl = window.Shopify.routes.root + 'cart';
const root = document.documentElement;

function giftUpdates(cart) {
  const gifts = cart.items.filter((item) => item.variant_id === giftId);
  const qualifies = cart.currency === 'USD' && cart.total_price >= threshold;
  const updates = {};
  if (qualifies && !gifts.length) updates[giftId] = 1;
  gifts.forEach((line, index) => {
    const wanted = qualifies && index === 0 ? 1 : 0;
    if (line.quantity !== wanted) updates[line.key] = wanted;
  });
  return updates;
}

async function fetchCart(url, options) {
  const response = await fetch(url, { cache: 'no-store', ...options });
  if (!response.ok) throw new Error('Unable to update the commemorative gift');
  return response.json();
}

async function reconcile() {
  let cart = await fetchCart(cartUrl + '.js');
  const updates = giftUpdates(cart);
  if (!Object.keys(updates).length) return cart;

  const sections = [...new Set(Array.from(document.querySelectorAll('cart-items-component'),
    (component) => component.dataset.sectionId).filter(Boolean))];
  cart = await fetchCart(cartUrl + '/update.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ updates, sections, sections_url: location.pathname }),
  });
  const result = {
    cart: CartLinesUpdateEvent.createCartFromAjaxResponse(cart),
    detail: { sections: cart.sections, items: cart.items, itemCount: cart.item_count },
  };
  document.dispatchEvent(new CartLinesUpdateEvent({
    action: 'update', context: 'cart', lines: [], promise: Promise.resolve(result),
    detail: { source: 'spuds-gift' },
  }));
  if (Object.keys(giftUpdates(cart)).length) throw new Error('Gift quantity did not update');
  return cart;
}

let queue = Promise.resolve();
let pending = 0;
function sync(after) {
  pending++;
  root.setAttribute('data-spuds-gift-busy', '');
  const task = queue.then(async () => {
    await after;
    const cart = await (navigator.locks ? navigator.locks.request('spuds-cart-gift', reconcile) : reconcile());
    config.removeAttribute('data-needs-sync');
    return cart;
  });
  queue = task.catch(() => {}).finally(() => {
    if (--pending === 0) root.removeAttribute('data-spuds-gift-busy');
  });
  return task;
}

function syncAfterChange(event) {
  if (event.target === document && event.detail?.source === 'spuds-gift') return;
  const settled = Promise.resolve(event.promise).catch(() => {});
  sync(settled).catch(console.warn);
}
document.addEventListener(StandardEvents.cartLinesUpdate, syncAfterChange, true);
document.addEventListener(StandardEvents.cartDiscountUpdate, syncAfterChange, true);

let quantitySettled = Promise.resolve();
document.addEventListener('quantity-selector:update', (event) => {
  if (!event.target.closest?.('cart-items-component')) return;
  root.setAttribute('data-spuds-quantity-pending', '');
  const change = new Promise((resolve) => setTimeout(resolve, 350));
  quantitySettled = change;
  change.then(() => {
    if (quantitySettled === change) root.removeAttribute('data-spuds-quantity-pending');
  });
}, true);

if (config.hasAttribute('data-needs-sync')) sync().catch(console.warn);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) sync().catch(console.warn);
});

let checkingOut = false;
document.addEventListener('submit', async (event) => {
  if (event.submitter?.name !== 'checkout' || !event.target.matches('.cart-form')) return;
  event.preventDefault();
  if (checkingOut) return;
  checkingOut = true;
  const form = event.target;
  const formData = new FormData(form);
  try {
    await quantitySettled;
    const cart = await sync();
    if (!cart.item_count) return;
    const checkout = document.createElement('form');
    checkout.method = 'post';
    checkout.action = form.action;
    formData.set('checkout', 'checkout');
    for (const [name, value] of formData) {
      if (name !== 'checkout' && name !== 'note' && !name.startsWith('attributes[')) continue;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      checkout.append(input);
    }
    document.body.append(checkout);
    checkout.submit();
    checkout.remove();
  } catch (error) {
    console.warn(error);
    document.querySelectorAll('[data-spuds-gift-error]').forEach((message) => { message.hidden = false; });
  } finally {
    checkingOut = false;
  }
}, true);
