const initializeSpudsProduct = (root) => {
  if (root.dataset.spudsProductInitialized === 'true') return;
  root.dataset.spudsProductInitialized = 'true';

  const mainImage = root.querySelector('[data-spuds-main-image]');
  const thumbnails = [...root.querySelectorAll('[data-spuds-gallery-thumb]')];
  const previousButton = root.querySelector('[data-spuds-gallery-previous]');
  const nextButton = root.querySelector('[data-spuds-gallery-next]');

  const showThumbnail = (thumbnail) => {
    if (!thumbnail || !mainImage) return;

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
    if (!thumbnails.length) return;
    const currentIndex = Math.max(
      0,
      thumbnails.findIndex((thumbnail) => thumbnail.classList.contains('is-active'))
    );
    const nextIndex = (currentIndex + direction + thumbnails.length) % thumbnails.length;
    showThumbnail(thumbnails[nextIndex]);
    thumbnails[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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

  const readMoreButton = root.querySelector('[data-spuds-read-more]');
  const descriptionShort = root.querySelector('[data-spuds-description-short]');
  const descriptionFull = root.querySelector('[data-spuds-description-full]');

  readMoreButton?.addEventListener('click', () => {
    if (!descriptionFull || !descriptionShort) return;
    const isExpanded = !descriptionFull.hidden;
    descriptionFull.hidden = isExpanded;
    descriptionShort.hidden = !isExpanded;
    readMoreButton.textContent = isExpanded ? 'Read More.' : 'Read Less.';
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
  const variantInput = root.querySelector('[data-spuds-variant-id]');
  const oneTimePrice = root.querySelector('[data-spuds-one-time-price]');
  const subscriptionPrice = root.querySelector('[data-spuds-subscription-price]');
  const subscriptionName = root.querySelector('[data-spuds-subscription-name]');
  const addButton = root.querySelector('[data-spuds-add-to-cart]');
  const addLabel = root.querySelector('[data-spuds-add-label]');

  const updateVariant = () => {
    const option = variantSelect?.selectedOptions[0];
    if (!option) return;

    if (variantInput) variantInput.value = option.value;
    if (oneTimePrice) oneTimePrice.textContent = option.dataset.price || '';

    const available = option.dataset.available === 'true';
    if (addButton) addButton.disabled = !available;
    if (addLabel) addLabel.textContent = available ? 'Add to cart' : 'Sold out';

    const planId = option.dataset.subscriptionPlan || '';
    if (subscriptionOption) {
      subscriptionOption.dataset.sellingPlanId = planId;
      subscriptionOption.classList.toggle('is-hidden', !planId);
      const subscriptionRadio = subscriptionOption.querySelector('input[type="radio"]');
      if (subscriptionRadio) subscriptionRadio.disabled = !planId;
    }
    if (subscriptionPrice) subscriptionPrice.textContent = option.dataset.subscriptionPrice || '';
    if (subscriptionName) subscriptionName.textContent = option.dataset.subscriptionName || '';

    const selectedPurchase = purchaseOptions.find((purchaseOption) => purchaseOption.checked);
    if (!planId && selectedPurchase?.value === 'subscription') {
      const oneTimeOption = purchaseOptions.find((purchaseOption) => purchaseOption.value === 'one-time');
      if (oneTimeOption) oneTimeOption.checked = true;
    }
    updateSellingPlan();

    if (root.dataset.deliveredGallery !== 'true' && option.dataset.image && mainImage) {
      mainImage.removeAttribute('srcset');
      mainImage.removeAttribute('sizes');
      mainImage.src = option.dataset.image;
    }
  };

  variantSelect?.addEventListener('change', updateVariant);
};

const initializeAllSpudsProducts = (scope = document) => {
  scope.querySelectorAll('[data-spuds-product]').forEach(initializeSpudsProduct);
};

initializeAllSpudsProducts();

document.addEventListener('shopify:section:load', (event) => {
  initializeAllSpudsProducts(event.target);
});
