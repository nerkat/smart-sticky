(function() {
  'use strict';
  
  // Avoid duplicate injection
  if (window.smartStickyLoaded) {
    console.log('StickyBar: Already loaded, skipping duplicate injection');
    return;
  }
  window.smartStickyLoaded = true;
  
  console.log('StickyBar script initialized');
  
  // Only load on product pages
  const isProductPage = () => {
    const pathname = window.location.pathname;
    return (
      pathname.includes('/products/') ||
      pathname.includes('/product/') ||
      document.querySelector('[data-product-id]') ||
      document.querySelector('.product-form') ||
      document.querySelector('[action*="/cart/add"]')
    );
  };

  if (!isProductPage()) {
    console.log('StickyBar: Not a product page, skipping initialization');
    return;
  }

  // Configuration
  const config = {
    productFormSelector: 'form[action^="/cart/add"], form[action*="/cart/add"], .product-form',
    addToCartButtonSelector: 'button[name="add"], input[name="add"], button[type="submit"]',
    fallbackButtonSelector: '[data-testid="add-to-cart-button"], .btn[data-action="add-to-cart"], .product-form__cart-submit, .btn-product-form, .add-to-cart-button, .product-form--add-to-cart-button',
    offset: 100,
    position: 'bottom',
    backgroundColor: '#000',
    textColor: '#fff',
    zIndex: 9999,
    animationDuration: 300
  };
  
  let originalForm = null;
  let originalButton = null;
  let stickyBar = null;
  let stickyForm = null;
  let isVisible = false;
  let mutationObserver = null;
  let scrollTimeout = null;
  let resizeTimeout = null;

  // Find the original add to cart form and button
  function findAddToCartForm() {
    const forms = document.querySelectorAll(config.productFormSelector);
    for (const form of forms) {
      if (form.offsetParent !== null) {
        const button = form.querySelector(config.addToCartButtonSelector);
        if (button) {
          return { form, button };
        }
      }
    }
    
    // Fallback: look for standalone buttons
    const fallbackButton = document.querySelector(config.fallbackButtonSelector);
    if (fallbackButton && fallbackButton.offsetParent !== null) {
      const parentForm = fallbackButton.closest('form');
      return { form: parentForm, button: fallbackButton };
    }
    
    return { form: null, button: null };
  }

  // Extract product information
  function getProductInfo() {
    const productTitle = (
      document.querySelector('.product-title, .product__title, .product-meta__title, h1.product-title, h1')?.textContent?.trim() ||
      document.querySelector('[data-product-title]')?.textContent?.trim() ||
      'Product'
    );
    
    const productPrice = (
      document.querySelector('.price, .product-price, .money, .price__current, .product__price')?.textContent?.trim() ||
      document.querySelector('[data-price]')?.textContent?.trim() ||
      ''
    );

    const productImage = (
      document.querySelector('.product__image img, .product-image img, .featured-image img')?.src ||
      document.querySelector('[data-product-image]')?.src ||
      null
    );

    return { productTitle, productPrice, productImage };
  }

  // Clone form data for sticky version
  function cloneFormData() {
    if (!originalForm) return {};
    
    const formData = {};
    const inputs = originalForm.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      if (input.name) {
        if (input.type === 'radio' || input.type === 'checkbox') {
          if (input.checked) {
            formData[input.name] = input.value;
          }
        } else {
          formData[input.name] = input.value;
        }
      }
    });
    
    return formData;
  }

  // Create sticky bar HTML
  function createStickyBar() {
    if (stickyBar) return stickyBar;
    
    const { productTitle, productPrice, productImage } = getProductInfo();
    
    const bar = document.createElement('div');
    bar.id = 'smart-sticky-bar';
    bar.setAttribute('data-smart-sticky', 'true');
    
    // Base styles
    const baseStyles = `
      position: fixed;
      left: 0;
      right: 0;
      ${config.position}: 0;
      background: ${config.backgroundColor};
      color: ${config.textColor};
      padding: 12px 16px;
      z-index: ${config.zIndex};
      transform: translateY(${config.position === 'bottom' ? '100%' : '-100%'});
      transition: transform ${config.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border-top: 1px solid rgba(255,255,255,0.1);
    `;

    // Mobile responsive styles
    const mobileStyles = `
      @media (max-width: 768px) {
        #smart-sticky-bar {
          padding: 10px 12px;
          gap: 8px;
        }
        #smart-sticky-bar .product-info {
          min-width: 0 !important;
        }
        #smart-sticky-bar .product-title {
          font-size: 13px !important;
        }
        #smart-sticky-bar .product-price {
          font-size: 11px !important;
        }
        #smart-sticky-bar .sticky-add-to-cart {
          padding: 8px 16px !important;
          font-size: 13px !important;
        }
      }
      @media (max-width: 480px) {
        #smart-sticky-bar .product-image {
          display: none !important;
        }
        #smart-sticky-bar {
          padding: 8px 10px;
        }
      }
    `;

    bar.style.cssText = baseStyles;
    
    // Add mobile styles to document
    if (!document.getElementById('smart-sticky-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'smart-sticky-styles';
      styleSheet.textContent = mobileStyles;
      document.head.appendChild(styleSheet);
    }
    
    const containerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; width: 100%; max-width: 1200px; margin: 0 auto;">
        ${productImage ? `
          <div class="product-image" style="width: 40px; height: 40px; border-radius: 4px; overflow: hidden; background: rgba(255,255,255,0.1); flex-shrink: 0;">
            <img src="${productImage}" alt="Product" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
        ` : ''}
        <div class="product-info" style="flex: 1; min-width: 0;">
          <div class="product-title" style="font-weight: 600; font-size: 14px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">
            ${productTitle}
          </div>
          ${productPrice ? `
            <div class="product-price" style="font-size: 12px; opacity: 0.9; line-height: 1;">
              ${productPrice}
            </div>
          ` : ''}
        </div>
        <div class="sticky-form-container" style="flex-shrink: 0;">
          <!-- Form will be inserted here -->
        </div>
      </div>
    `;
    
    bar.innerHTML = containerHTML;
    document.body.appendChild(bar);
    
    // Clone and insert the form
    createStickyForm();
    
    return bar;
  }

  // Create sticky form with cloned data
  function createStickyForm() {
    if (!originalForm || !stickyBar) return;
    
    const formContainer = stickyBar.querySelector('.sticky-form-container');
    if (!formContainer) return;

    // Clone the original form
    stickyForm = originalForm.cloneNode(true);
    stickyForm.setAttribute('data-sticky-form', 'true');
    
    // Reset form styles to fit in sticky bar
    stickyForm.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 0;
      background: none;
      border: none;
    `;

    // Style form elements to be compact
    const formElements = stickyForm.querySelectorAll('input, select, textarea, button');
    formElements.forEach(element => {
      if (element.type === 'submit' || element.name === 'add' || element.classList.contains('btn')) {
        // Style the submit button
        element.style.cssText = `
          background: #fff;
          color: #000;
          border: none;
          padding: 8px 20px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          white-space: nowrap;
          transition: all 0.2s ease;
          min-width: auto;
        `;
        
        // Add hover effect
        element.addEventListener('mouseenter', () => {
          element.style.background = '#f0f0f0';
        });
        element.addEventListener('mouseleave', () => {
          element.style.background = '#fff';
        });
      } else if (element.type !== 'hidden') {
        // Style other form inputs to be compact
        element.style.cssText = `
          padding: 4px 8px;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 2px;
          background: rgba(255,255,255,0.1);
          color: ${config.textColor};
          font-size: 12px;
          max-width: 80px;
        `;
      }
    });

    // Add form submit handler
    stickyForm.addEventListener('submit', function(e) {
      console.log('StickyBar: Form submitted from sticky bar');
      
      // Sync form data from original form before submitting
      syncFormData();
      
      // Let the form submit naturally
      // The browser will handle the cart addition
      
      // Optional: Track the conversion
      try {
        if (typeof gtag !== 'undefined') {
          gtag('event', 'add_to_cart', {
            event_category: 'ecommerce',
            event_label: 'sticky_bar'
          });
        }
      } catch (e) {
        // Ignore analytics errors
      }
    });

    formContainer.appendChild(stickyForm);
  }

  // Sync form data from original form to sticky form
  function syncFormData() {
    if (!originalForm || !stickyForm) return;
    
    const originalInputs = originalForm.querySelectorAll('input, select, textarea');
    const stickyInputs = stickyForm.querySelectorAll('input, select, textarea');
    
    originalInputs.forEach(originalInput => {
      if (originalInput.name) {
        const stickyInput = stickyForm.querySelector(`[name="${originalInput.name}"]`);
        if (stickyInput) {
          if (originalInput.type === 'radio' || originalInput.type === 'checkbox') {
            stickyInput.checked = originalInput.checked;
          } else {
            stickyInput.value = originalInput.value;
          }
        }
      }
    });
  }

  // Check if original form/button is visible
  function isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom >= config.offset && rect.top <= windowHeight - config.offset;
  }

  // Show/hide sticky bar with animation
  function toggleStickyBar() {
    if (!originalButton || !stickyBar) return;
    
    const shouldShow = !isElementVisible(originalButton);
    
    if (shouldShow && !isVisible) {
      stickyBar.style.transform = 'translateY(0)';
      isVisible = true;
      console.log('StickyBar: Showing sticky bar');
    } else if (!shouldShow && isVisible) {
      stickyBar.style.transform = `translateY(${config.position === 'bottom' ? '100%' : '-100%'})`;
      isVisible = false;
      console.log('StickyBar: Hiding sticky bar');
    }
  }

  // Debounced scroll handler
  function handleScroll() {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      toggleStickyBar();
    }, 10);
  }

  // Debounced resize handler
  function handleResize() {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      toggleStickyBar();
    }, 100);
  }

  // Setup MutationObserver to handle dynamically-loaded sections
  function setupMutationObserver() {
    if (!window.MutationObserver) return;

    mutationObserver = new MutationObserver((mutations) => {
      let shouldReinit = false;
      
      mutations.forEach((mutation) => {
        // Check if new nodes were added that might contain product forms
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node contains a product form
              if (node.matches && (
                node.matches(config.productFormSelector) ||
                node.querySelector(config.productFormSelector)
              )) {
                shouldReinit = true;
                break;
              }
            }
          }
        }
      });

      if (shouldReinit) {
        console.log('StickyBar: DOM mutation detected, reinitializing...');
        reinitialize();
      }
    });

    // Observe the entire document for changes
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Reinitialize the sticky bar
  function reinitialize() {
    // Clean up existing sticky bar
    cleanup();
    
    // Wait a bit for DOM to settle, then reinit
    setTimeout(() => {
      init();
    }, 500);
  }

  // Clean up DOM and observers
  function cleanup() {
    console.log('StickyBar: Cleaning up...');
    
    // Remove sticky bar
    if (stickyBar && stickyBar.parentNode) {
      stickyBar.parentNode.removeChild(stickyBar);
    }
    
    // Remove styles
    const styles = document.getElementById('smart-sticky-styles');
    if (styles && styles.parentNode) {
      styles.parentNode.removeChild(styles);
    }
    
    // Clean up event listeners
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleResize);
    
    // Clean up timeouts
    if (scrollTimeout) clearTimeout(scrollTimeout);
    if (resizeTimeout) clearTimeout(resizeTimeout);
    
    // Disconnect mutation observer
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    
    // Reset variables
    originalForm = null;
    originalButton = null;
    stickyBar = null;
    stickyForm = null;
    isVisible = false;
    scrollTimeout = null;
    resizeTimeout = null;
  }

  // Handle page unload/reload
  function handleUnload() {
    cleanup();
    window.smartStickyLoaded = false;
  }

  // Initialize
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    console.log('StickyBar: Initializing...');
    
    // Find the add to cart form and button
    const { form, button } = findAddToCartForm();
    
    if (!button) {
      console.log('StickyBar: Add to cart button not found, retrying in 2 seconds...');
      setTimeout(init, 2000);
      return;
    }
    
    originalForm = form;
    originalButton = button;
    
    console.log('StickyBar: Found add to cart form and button:', { form, button });
    
    // Create sticky bar
    stickyBar = createStickyBar();
    
    // Set up event listeners with passive scrolling for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    // Handle page unload
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    
    // Setup mutation observer for dynamic content
    setupMutationObserver();
    
    // Initial check after a brief delay
    setTimeout(toggleStickyBar, 500);
    
    console.log('StickyBar: Initialization complete');
  }

  // Start initialization
  init();

})();