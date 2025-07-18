// app/routes/stickybar.js.jsx
export async function loader({ request }) {
  // JavaScript content for the sticky bar
  const jsContent = `
(function() {
  'use strict';
  
  // Avoid duplicate loading
  if (window.smartStickyLoaded) return;
  window.smartStickyLoaded = true;
  
  console.log('StickyBar script initialized');
  
  // Only load on product pages
  if (!window.location.pathname.includes('/products/')) {
    console.log('Smart Sticky: Not a product page, skipping initialization');
    return;
  }
  
  // Default configuration (will be overridden by settings)
  let config = {
    formSelector: 'form[action^="/cart/add"]',
    buttonSelector: '[data-testid="add-to-cart-button"], .btn[data-action="add-to-cart"], button[name="add"], .product-form__cart-submit, .btn-product-form, .add-to-cart-button, .product-form--add-to-cart-button',
    offset: 100,
    position: 'bottom',
    enabled: true,
    backgroundColor: '#000',
    textColor: '#fff',
    buttonText: 'Add to Cart',
    zIndex: 9999
  };
  
  // Fetch settings from API
  async function loadSettings() {
    try {
      const response = await fetch('/api/settings?themeId=main');
      const data = await response.json();
      
      if (data.settings) {
        config = {
          ...config,
          enabled: data.settings.enabled,
          position: data.settings.position,
          offset: data.settings.offset
        };
        console.log('Smart Sticky: Settings loaded:', config);
      }
    } catch (error) {
      console.warn('Smart Sticky: Failed to load settings, using defaults:', error);
    }
  }
  
  let originalForm = null;
  let originalButton = null;
  let stickyBar = null;
  let isVisible = false;
  let mutationObserver = null;
  
  // Find the cart form and submit button
  function findCartForm() {
    const forms = document.querySelectorAll(config.formSelector);
    for (const form of forms) {
      const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
      if (submitButton && form.offsetParent !== null) {
        return { form, button: submitButton };
      }
    }
    
    // Fallback: look for standalone add to cart buttons
    const selectors = config.buttonSelector.split(',').map(s => s.trim());
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button && button.offsetParent !== null) {
        const form = button.closest('form');
        return { form, button };
      }
    }
    return { form: null, button: null };
  }
  
  // Create sticky bar HTML with cloned form content
  function createStickyBar() {
    if (stickyBar) return stickyBar;
    
    const bar = document.createElement('div');
    bar.id = 'smart-sticky-bar';
    bar.style.cssText = \`
      position: fixed;
      left: 0;
      right: 0;
      \${config.position}: 0;
      background: \${config.backgroundColor};
      color: \${config.textColor};
      padding: 15px 20px;
      z-index: \${config.zIndex};
      transform: translateY(\${config.position === 'bottom' ? '100%' : '-100%'});
      transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      box-shadow: 0 -2px 20px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      backdrop-filter: blur(10px);
      
      @media (max-width: 768px) {
        padding: 12px 16px;
        gap: 12px;
      }
    \`;
    
    // Get product info
    const productTitle = document.querySelector('.product-title, .product__title, h1')?.textContent?.trim() || 'Product';
    const productPrice = document.querySelector('.price, .product-price, .money')?.textContent?.trim() || '';
    
    // Clone form content if available
    let formContent = '';
    if (originalForm) {
      // Clone important form fields (variants, quantity, etc.)
      const formClone = originalForm.cloneNode(true);
      formClone.id = 'smart-sticky-form';
      formClone.style.cssText = 'display: flex; align-items: center; gap: 10px; margin: 0;';
      
      // Hide non-essential elements in the cloned form
      const elementsToHide = formClone.querySelectorAll('label, .product-description, .product-images, .product-reviews');
      elementsToHide.forEach(el => el.style.display = 'none');
      
      // Style variant selectors and quantity inputs
      const selects = formClone.querySelectorAll('select');
      const inputs = formClone.querySelectorAll('input[type="number"], input[name="quantity"]');
      
      selects.forEach(select => {
        select.style.cssText = 'padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; max-width: 120px;';
      });
      
      inputs.forEach(input => {
        input.style.cssText = 'padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; width: 60px;';
      });
      
      formContent = formClone.outerHTML;
    }
    
    bar.innerHTML = \`
      <div style="display: flex; align-items: center; gap: 15px; width: 100%; max-width: 1200px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px;">
          <div style="font-weight: bold; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            \${productTitle}
          </div>
          \${productPrice ? \`<div style="font-size: 12px; opacity: 0.9;">\${productPrice}</div>\` : ''}
        </div>
        \${formContent || ''}
        \${!formContent ? \`
          <button id="smart-sticky-add-to-cart" style="
            background: #fff;
            color: #000;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer;
            font-size: 14px;
            white-space: nowrap;
            transition: all 0.2s ease;
            min-width: 120px;
          " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
            \${config.buttonText}
          </button>
        \` : ''}
      </div>
    \`;
    
    document.body.appendChild(bar);
    
    // Add click handler for cloned form or fallback button
    if (originalForm && formContent) {
      const clonedForm = bar.querySelector('#smart-sticky-form');
      if (clonedForm) {
        clonedForm.addEventListener('submit', function(e) {
          e.preventDefault();
          console.log('Smart Sticky: Form submitted from sticky bar');
          
          // Copy form data to original form and submit
          const formData = new FormData(clonedForm);
          const originalFormData = new FormData(originalForm);
          
          // Update original form with sticky form data
          for (const [key, value] of formData.entries()) {
            const originalField = originalForm.querySelector(\`[name="\${key}"]\`);
            if (originalField) {
              if (originalField.type === 'checkbox' || originalField.type === 'radio') {
                originalField.checked = value === originalField.value;
              } else {
                originalField.value = value;
              }
            }
          }
          
          // Submit original form
          if (originalButton) {
            originalButton.click();
          } else {
            originalForm.submit();
          }
          
          // Optional: scroll to original form
          originalForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    } else {
      const stickyButton = bar.querySelector('#smart-sticky-add-to-cart');
      if (stickyButton) {
        stickyButton.addEventListener('click', function() {
          if (originalButton) {
            console.log('Smart Sticky: Add to cart clicked from sticky bar');
            originalButton.click();
            originalButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }
    }
    
    return bar;
  }
  
  // Check if original element is visible
  function isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom >= config.offset && rect.top <= windowHeight - config.offset;
  }
  
  // Show/hide sticky bar
  function toggleStickyBar() {
    if (!config.enabled || (!originalButton && !originalForm) || !stickyBar) return;
    
    const elementToCheck = originalButton || originalForm;
    const shouldShow = !isElementVisible(elementToCheck);
    
    if (shouldShow && !isVisible) {
      stickyBar.style.transform = 'translateY(0)';
      isVisible = true;
      console.log('Smart Sticky: Showing sticky bar');
    } else if (!shouldShow && isVisible) {
      stickyBar.style.transform = \`translateY(\${config.position === 'bottom' ? '100%' : '-100%'})\`;
      isVisible = false;
      console.log('Smart Sticky: Hiding sticky bar');
    }
  }
  
  // Set up MutationObserver for dynamically loaded content
  function setupMutationObserver() {
    if (mutationObserver) return;
    
    mutationObserver = new MutationObserver(function(mutations) {
      let shouldReinitialize = false;
      
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if new form or button was added
              if (node.matches && (
                node.matches(config.formSelector) || 
                node.matches(config.buttonSelector) ||
                node.querySelector(config.formSelector) ||
                node.querySelector(config.buttonSelector)
              )) {
                shouldReinitialize = true;
              }
            }
          });
        }
      });
      
      if (shouldReinitialize) {
        console.log('Smart Sticky: DOM change detected, reinitializing...');
        setTimeout(() => {
          initializeComponents();
        }, 500);
      }
    });
    
    // Observe changes to body and product-specific containers
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Also observe common product containers
    const productContainers = document.querySelectorAll('.product, .product-form, [class*="product"]');
    productContainers.forEach(container => {
      mutationObserver.observe(container, {
        childList: true,
        subtree: true
      });
    });
  }
  
  // Initialize components
  function initializeComponents() {
    // Skip if disabled
    if (!config.enabled) {
      console.log('Smart Sticky: Disabled in settings');
      return false;
    }
    
    // Find the cart form and submit button
    const { form, button } = findCartForm();
    originalForm = form;
    originalButton = button;
    
    if (!originalForm && !originalButton) {
      console.log('Smart Sticky: Cart form or button not found, retrying in 2 seconds...');
      return false;
    }
    
    console.log('Smart Sticky: Found cart form/button:', { form: !!originalForm, button: !!originalButton });
    
    // Create or update sticky bar
    if (stickyBar) {
      stickyBar.remove();
      stickyBar = null;
    }
    stickyBar = createStickyBar();
    
    return true;
  }
  
  // Cleanup function
  function cleanup() {
    if (stickyBar) {
      stickyBar.remove();
      stickyBar = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleScroll);
    window.removeEventListener('beforeunload', cleanup);
    isVisible = false;
  }
  
  // Initialize
  async function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    // Load settings first
    await loadSettings();
    
    // Skip if disabled
    if (!config.enabled) {
      console.log('Smart Sticky: Disabled in settings, skipping initialization');
      return;
    }
    
    // Initialize components
    const success = initializeComponents();
    if (!success) {
      setTimeout(init, 2000);
      return;
    }
    
    // Set up MutationObserver for dynamic content
    setupMutationObserver();
    
    // Set up scroll listener with throttling
    let ticking = false;
    function handleScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          toggleStickyBar();
          ticking = false;
        });
        ticking = true;
      }
    }
    
    // Make handleScroll available for cleanup
    window.handleScroll = handleScroll;
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    window.addEventListener('beforeunload', cleanup, { passive: true });
    
    // Initial check
    setTimeout(toggleStickyBar, 500);
    
    console.log('Smart Sticky: Initialization complete');
  }
  
  // Start initialization
  init();
  
})();`;

  // Return JavaScript with proper headers
  return new Response(jsContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*', // Allow cross-origin requests
    },
  });
}