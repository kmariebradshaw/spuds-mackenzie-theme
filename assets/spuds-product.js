const initializeSpudsProduct = (root) => {
  if (root.dataset.spudsProductInitialized === 'true') return;
  root.dataset.spudsProductInitialized = 'true';

  root.addEventListener('shopify:cart:error', (event) => {
    if (event.code !== 'SERVICE_UNAVAILABLE') return;
    const errorMessage = root.querySelector('[ref="addToCartTextError"]');
    if (!errorMessage) return;
    errorMessage.textContent = root.dataset.cartError;
    errorMessage.classList.remove('hidden');
  });

  const mainImage = root.querySelector('[data-spuds-main-image]');
  const thumbnails = [...root.querySelectorAll('[data-spuds-gallery-thumb]')];
  const previousButton = root.querySelector('[data-spuds-gallery-previous]');
  const nextButton = root.querySelector('[data-spuds-gallery-next]');
  const galleryRail = root.querySelector('[data-spuds-gallery-rail]');
  let visibleThumbnails = thumbnails.filter((thumbnail) => !thumbnail.hidden);

  const showThumbnail = (thumbnail) => {
    if (!thumbnail || thumbnail.hidden || !mainImage) return;

    mainImage.removeAttribute('srcset');
    mainImage.removeAttribute('sizes');
    mainImage.src = thumbnail.dataset.image || mainImage.src;
    mainImage.alt = thumbnail.dataset.alt || mainImage.alt;

    thumbnails.forEach((item) => {
      const active = item === thumbnail;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };

  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener('click', () => showThumbnail(thumbnail));
  });

  const stepGallery = (direction) => {
    if (!visibleThumbnails.length) return;
    const currentIndex = Math.max(
      0,
      visibleThumbnails.findIndex((thumbnail) => thumbnail.classList.contains('is-active'))
    );
    const nextIndex = (currentIndex + direction + visibleThumbnails.length) % visibleThumbnails.length;
    showThumbnail(visibleThumbnails[nextIndex]);
    visibleThumbnails[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  const updateGallery = (option, selectImage = false) => {
    if (root.dataset.deliveredGallery === 'true') return;

    let mediaIds;
    try {
      const ids = JSON.parse(option?.dataset.galleryMediaIds || 'null');
      if (Array.isArray(ids)) mediaIds = new Set(ids.map(String));
    } catch {
      mediaIds = undefined;
    }

    thumbnails.forEach((thumbnail) => {
      thumbnail.hidden = mediaIds
        ? !mediaIds.has(thumbnail.dataset.mediaId)
        : Boolean(option && thumbnail.dataset.variantImage === 'true' && thumbnail.dataset.mediaId !== option.dataset.mediaId);
      if (thumbnail.hidden) {
        thumbnail.classList.remove('is-active');
        thumbnail.setAttribute('aria-pressed', 'false');
      }
    });
    visibleThumbnails = thumbnails.filter((thumbnail) => !thumbnail.hidden);
    if (galleryRail) galleryRail.hidden = visibleThumbnails.length < 2;
    if (previousButton) previousButton.disabled = visibleThumbnails.length < 2;
    if (nextButton) nextButton.disabled = visibleThumbnails.length < 2;

    if (selectImage) {
      const selectedThumbnail = visibleThumbnails.find((thumbnail) => thumbnail.dataset.mediaId === option?.dataset.mediaId);
      showThumbnail(selectedThumbnail || visibleThumbnails[0]);
    }
  };

  previousButton?.addEventListener('click', () => stepGallery(-1));
  nextButton?.addEventListener('click', () => stepGallery(1));

  const quantityInput = root.querySelector('[data-spuds-quantity-input]');
  const quantityMinus = root.querySelector('[data-spuds-quantity-minus]');
  const quantityPlus = root.querySelector('[data-spuds-quantity-plus]');

  const adjustQuantity = (direction) => {
    if (!quantityInput) return;
    const step = Number(quantityInput.step) || 1;
    const min = Number(quantityInput.min) || 1;
    const max = quantityInput.max ? Number(quantityInput.max) : Number.POSITIVE_INFINITY;
    const current = Number(quantityInput.value) || min;
    quantityInput.value = String(Math.min(max, Math.max(min, current + direction * step)));
    quantityInput.dispatchEvent(new Event('change', { bubbles: true }));
  };

  quantityMinus?.addEventListener('click', () => adjustQuantity(-1));
  quantityPlus?.addEventListener('click', () => adjustQuantity(1));

  root.addEventListener('click', (event) => {
    const readMoreButton = event.target.closest('[data-spuds-read-more]');
    if (!readMoreButton || !root.contains(readMoreButton)) return;
    const description = readMoreButton.closest('[data-spuds-description]');
    const descriptionShort = description?.querySelector('[data-spuds-description-short]');
    const descriptionFull = description?.querySelector('[data-spuds-description-full]');
    if (!descriptionFull || !descriptionShort) return;
    const isExpanded = !descriptionFull.hidden;
    descriptionFull.hidden = isExpanded;
    descriptionShort.hidden = !isExpanded;
    readMoreButton.textContent = isExpanded ? readMoreButton.dataset.labelMore : readMoreButton.dataset.labelLess;
    readMoreButton.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
  });

  const purchaseOptions = [...root.querySelectorAll('[data-spuds-purchase-option]')];
  const subscriptionOption = root.querySelector('[data-spuds-subscription-option]');
  const sellingPlanInput = root.querySelector('[data-spuds-selling-plan]');

  const updateSellingPlan = () => {
    if (!sellingPlanInput) return;
    const selectedPurchase = purchaseOptions.find((option) => option.checked);
    const useSubscription = selectedPurchase?.value === 'subscription';
    const planId = subscriptionOption?.dataset.sellingPlanId || '';

    sellingPlanInput.value = useSubscription ? planId : '';
    sellingPlanInput.disabled = !useSubscription || !planId;
  };

  purchaseOptions.forEach((option) => option.addEventListener('change', updateSellingPlan));
  updateSellingPlan();

  const variantSelect = root.querySelector('[data-spuds-variant-select]');
  const picker = root.querySelector('[data-spuds-option-picker]');
  const choices = Array.from(variantSelect?.options || [], option => ({
    option,
    values: JSON.parse(option.dataset.options || '[]'),
  }));
  const groups = picker?.querySelectorAll('[data-option-index]') || [];

  const syncOptionButtons = () => {
    const selected = choices[variantSelect?.selectedIndex];
    if (!selected) return;
    let matching = choices;
    groups.forEach((group, index) => {
      group.querySelectorAll('button').forEach(button => {
        const matches = matching.filter(choice => choice.values[index] === button.value);
        const soldOut = matches.length > 0 && matches.every(choice => choice.option.dataset.available !== 'true');
        button.hidden = matches.length === 0;
        button.setAttribute('aria-pressed', String(button.value === selected.values[index]));
        button.classList.toggle('is-sold-out', soldOut);
        button.setAttribute('aria-label', soldOut ? `${button.value}, ${root.dataset.soldOutLabel}` : button.value);
      });
      matching = matching.filter(choice => choice.values[index] === selected.values[index]);
    });
  };

  picker?.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.hidden) return;
    const index = Number(button.closest('[data-option-index]').dataset.optionIndex);
    const current = choices[variantSelect.selectedIndex];
    const prefix = [...current.values.slice(0, index), button.value];
    const matches = choices.filter(choice => prefix.every((value, i) => choice.values[i] === value));
    const next = matches.find(choice => choice.values.slice(index + 1).every((value, i) => value === current.values[index + 1 + i]))
      || matches.find(choice => choice.option.dataset.available === 'true')
      || matches[0];
    if (next && next !== current) {
      variantSelect.value = next.option.value;
      variantSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  const variantInput = root.querySelector('[data-spuds-variant-id]');
  const oneTimePrice = root.querySelector('[data-spuds-one-time-price]');
  const subscriptionPrice = root.querySelector('[data-spuds-subscription-price]');
  const subscriptionName = root.querySelector('[data-spuds-subscription-name]');
  const addButton = root.querySelector('[data-spuds-add-to-cart]');
  const addLabel = root.querySelector('[data-spuds-add-label]');

  const content = root.querySelector('[data-spuds-content]');
  const contentCache = new Map();
  let contentRequest;
  let contentSequence = 0;
  if (content) contentCache.set(content.dataset.variantId, content.innerHTML);

  const updateVariantContent = async (variantId, variantUrl) => {
    if (!content || root.dataset.variantContent !== 'true') return;

    contentRequest?.abort();
    const sequence = ++contentSequence;
    const accordionOpen = Boolean(content.querySelector('details')?.open);
    content.setAttribute('aria-busy', 'true');
    content.style.visibility = 'hidden';

    try {
      if (!contentCache.has(variantId)) {
        const request = new AbortController();
        contentRequest = request;
        const sectionUrl = new URL(variantUrl);
        sectionUrl.searchParams.set('section_id', root.dataset.sectionId);
        const response = await fetch(sectionUrl, { signal: request.signal });
        if (!response.ok) throw new Error('Product content request failed');
        const html = await response.text();
        if (sequence !== contentSequence) return;
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const incoming = parsed.querySelector('[data-spuds-content]');
        if (!incoming || incoming.dataset.variantId !== variantId) throw new Error('Selected variant content missing');
        contentCache.set(variantId, incoming.innerHTML);
      }

      if (sequence !== contentSequence) return;
      content.innerHTML = contentCache.get(variantId);
      content.dataset.variantId = variantId;
      const accordion = content.querySelector('details');
      if (accordion) accordion.open = accordionOpen;
      content.style.visibility = '';
      content.setAttribute('aria-busy', 'false');
    } catch (error) {
      if (error.name === 'AbortError' || sequence !== contentSequence) return;
      window.location.assign(variantUrl);
    }
  };

  const updateVariant = () => {
    const option = variantSelect?.selectedOptions[0];
    if (!option) return;

    syncOptionButtons();
    const variantUrl = new URL(window.location.href);
    variantUrl.searchParams.set('variant', option.value);
    variantUrl.searchParams.delete('section_id');
    window.history.replaceState(window.history.state, '', variantUrl);
    if (variantInput) variantInput.value = option.value;
    if (oneTimePrice) oneTimePrice.textContent = option.dataset.price || '';

    const available = option.dataset.available === 'true';
    if (addButton) addButton.disabled = !available;
    if (addLabel) addLabel.textContent = available ? root.dataset.addLabel : root.dataset.soldOutLabel;

    const planId = option.dataset.subscriptionPlan || '';
    if (subscriptionOption) {
      subscriptionOption.dataset.sellingPlanId = planId;
      subscriptionOption.classList.toggle('is-hidden', !planId);
      const subscriptionRadio = subscriptionOption.querySelector('input[type="radio"]');
      if (subscriptionRadio) subscriptionRadio.disabled = !planId;
    }
    if (subscriptionPrice) subscriptionPrice.textContent = option.dataset.subscriptionPrice || '';
    if (subscriptionName) {
      subscriptionName.textContent = (option.dataset.subscriptionName || '')
        .split(',')[0]
        .replace('Deliver every', 'Delivery every');
    }

    const selectedPurchase = purchaseOptions.find((purchaseOption) => purchaseOption.checked);
    if (!planId && selectedPurchase?.value === 'subscription') {
      const oneTimeOption = purchaseOptions.find((purchaseOption) => purchaseOption.value === 'one-time');
      if (oneTimeOption) oneTimeOption.checked = true;
    }
    updateSellingPlan();
    updateVariantContent(option.value, variantUrl);

    updateGallery(option, true);
    const cartButton = addButton?.closest('add-to-cart-component');
    if (cartButton) cartButton.dataset.productVariantMedia = mainImage?.src || '';
  };

  syncOptionButtons();
  updateGallery(variantSelect?.selectedOptions[0]);
  variantSelect?.addEventListener('change', updateVariant);
};

const initializeAllSpudsProducts = (scope = document) => {
  scope.querySelectorAll('[data-spuds-product]').forEach(initializeSpudsProduct);
};

initializeAllSpudsProducts();

document.addEventListener('shopify:section:load', (event) => {
  initializeAllSpudsProducts(event.target);
});
