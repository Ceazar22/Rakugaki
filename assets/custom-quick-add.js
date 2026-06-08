if (!customElements.get('quick-add-modal')) {
  customElements.define(
    'quick-add-modal',
    class QuickAddModal extends ModalDialog {
      constructor() {
        super();
        this.modalContent = this.querySelector('[id^="QuickAddInfo-"]');

        this.addEventListener('product-info:loaded', ({ target }) => {
          target.addPreProcessCallback(this.preprocessHTML.bind(this));
        });
      }

      hide(preventFocus = false) {
        const cartNotification = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        if (cartNotification) cartNotification.setActiveElement(this.openedBy);
        this.modalContent.innerHTML = '';

        if (preventFocus) this.openedBy = null;
        super.hide();
      }

      show(opener) {
        opener.setAttribute('aria-disabled', true);
        opener.classList.add('loading');
        const spinner = opener.querySelector('.loading__spinner');
        if (spinner) spinner.classList.remove('hidden');

        fetch(opener.getAttribute('data-product-url'))
          .then((response) => response.text())
          .then((responseText) => {
            const responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
            const productElement = responseHTML.querySelector('product-info');

            this.preprocessHTML(productElement);
            HTMLUpdateUtility.setInnerHTML(this.modalContent, productElement.outerHTML);

            if (window.Shopify && Shopify.PaymentButton) {
              Shopify.PaymentButton.init();
            }
            if (window.ProductModel) window.ProductModel.loadShopifyXR();

            super.show(opener);
          })
          .finally(() => {
            opener.removeAttribute('aria-disabled');
            opener.classList.remove('loading');
            if (spinner) spinner.classList.add('hidden');
          });
      }

      preprocessHTML(productElement) {
        productElement.classList.forEach((classApplied) => {
          if (classApplied.startsWith('color-') || classApplied === 'gradient') {
            this.modalContent.classList.add(classApplied);
          }
        });
        this.preventDuplicatedIDs(productElement);
        this.removeDOMElements(productElement);
        this.removeGalleryListSemantic(productElement);
        this.updateImageSizes(productElement);
        this.preventVariantURLSwitching(productElement);
      }

      preventVariantURLSwitching(productElement) {
        productElement.setAttribute('data-update-url', 'false');
      }

      removeDOMElements(productElement) {
        ['pickup-availability', 'product-modal'].forEach((selector) => {
          const element = productElement.querySelector(selector);
          if (element) element.remove();
        });

        productElement.querySelectorAll('modal-dialog').forEach((modal) => modal.remove());
      }

      preventDuplicatedIDs(productElement) {
        const sectionId = productElement.dataset.section;
        const newId = `quickadd-${sectionId}`;
        productElement.innerHTML = productElement.innerHTML.replaceAll(sectionId, newId);
        productElement.dataset.originalSection = sectionId;
      }

      removeGalleryListSemantic(productElement) {
        const galleryList = productElement.querySelector('[id^="Slider-Gallery"]');
        if (!galleryList) return;

        galleryList.setAttribute('role', 'presentation');
        galleryList.querySelectorAll('[id^="Slide-"]').forEach((li) => li.setAttribute('role', 'presentation'));
      }

      updateImageSizes(productElement) {
        const product = productElement.querySelector('.product');
        if (!product) return;

        const mediaImages = product.querySelectorAll('.product__media img');
        if (!mediaImages.length) return;

        let mediaImageSizes =
          '(min-width: 1000px) 715px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)';

        if (product.classList.contains('product--medium')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '605px');
        } else if (product.classList.contains('product--small')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '495px');
        }

        mediaImages.forEach((img) => img.setAttribute('sizes', mediaImageSizes));
      }
    }
  );
}

// Ensure quick-add buttons inside Swiper work
function initializeQuickAddButtons() {
  document.querySelectorAll('.swiper-slide [data-product-url]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const quickAddModal = document.querySelector('quick-add-modal');
      if (quickAddModal) {
        quickAddModal.show(event.currentTarget);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeQuickAddButtons();
  
  // Ensure event listeners are reattached after Swiper updates
  const swiperContainer = document.querySelector('.swiper-wrapper');
  if (swiperContainer) {
    const observer = new MutationObserver(() => {
      initializeQuickAddButtons();
    });
    observer.observe(swiperContainer, { childList: true, subtree: true });
  }

  // Define fetchConfig if not already defined
  if (typeof fetchConfig !== 'function') {
    window.fetchConfig = (type = 'json') => {
      return {
        method: 'POST',
        headers: {
          'Content-Type': type === 'json' ? 'application/json' : 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      };
    };
  }
});
