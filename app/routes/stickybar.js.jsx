// app/routes/stickybar.js.jsx
export async function loader({ request }) {
  // JavaScript content for the sticky bar
  const jsContent = `
(function() {
  'use strict';
  
  // Avoid duplicate loading
  if (window.smartStickyLoaded) return;
  window.smartStickyLoaded = true;
  
  console.log('Smart Sticky: Loading sticky bar functionality');
  
  // Configuration
  const config = {
    selector: '[data-testid="add-to-cart-button"], .btn[data-action="add-to-cart"], button[name="add"], .product-form__cart-submit, .btn-product-form, .add-to-cart-button, .product-form--add-to-cart-button',
    offset: 100,
    position: 'bottom',
    backgroundColor: '#000',
    textColor: '#fff',
    buttonText: 'Add to Cart',
    zIndex: 9999
  };
  
  let originalButton = null;
  let stickyBar = null;
  let isVisible = false;
  
  // Find the original add to cart button
  function findAddToCartButton() {
    const selectors = config.selector.split(',').map(s => s.trim());
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button && button.offsetParent !== null) {
        return button;
      }
    }
    return null;
  }
  
  // Create sticky bar HTML
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
      transition: transform 0.3s ease-in-out;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
    \`;
    
    // Get product info
    const productTitle = document.querySelector('.product-title, .product__title, h1')?.textContent?.trim() || 'Product';
    const productPrice = document.querySelector('.price, .product-price, .money')?.textContent?.trim() || '';
    
    bar.innerHTML = \`
      <div style="display: flex; align-items: center; gap: 15px; width: 100%; max-width: 1200px;">
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: bold; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            \${productTitle}
          </div>
          \${productPrice ? \`<div style="font-size: 12px; opacity: 0.9;">\${productPrice}</div>\` : ''}
        </div>
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
        " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
          \${config.buttonText}
        </button>
      </div>
    \`;
    
    document.body.appendChild(bar);
    
    // Add click handler
    const stickyButton = bar.querySelector('#smart-sticky-add-to-cart');
    stickyButton.addEventListener('click', function() {
      if (originalButton) {
        // Track the click
        console.log('Smart Sticky: Add to cart clicked from sticky bar');
        
        // Trigger the original button click
        originalButton.click();
        
        // Optional: scroll to original button
        originalButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    
    return bar;
  }
  
  // Check if original button is visible
  function isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom >= config.offset && rect.top <= windowHeight - config.offset;
  }
  
  // Show/hide sticky bar
  function toggleStickyBar() {
    if (!originalButton || !stickyBar) return;
    
    const shouldShow = !isElementVisible(originalButton);
    
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
  
  // Initialize
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    // Find the add to cart button
    originalButton = findAddToCartButton();
    if (!originalButton) {
      console.log('Smart Sticky: Add to cart button not found, retrying in 2 seconds...');
      setTimeout(init, 2000);
      return;
    }
    
    console.log('Smart Sticky: Found add to cart button:', originalButton);
    
    // Create sticky bar
    stickyBar = createStickyBar();
    
    // Set up scroll listener
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
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    
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