document.addEventListener('DOMContentLoaded', function() {
  updateEngravingPrices();
});

function updateEngravingPrices() {
  fetch('/cart.js')
    .then(response => response.json())
    .then(cart => {
      cart.items.forEach(item => {
        if (item.properties && item.properties._engraving_fee) {
          const engravingRow = document.querySelector(`[data-cart-item-key="${item.key}"]`);
          if (engravingRow) {
            const priceElement = engravingRow.querySelector('.cart-item__price, [data-cart-item-price]');
            if (priceElement) {
              const feeText = item.properties._engraving_fee;
              const feeMatch = feeText.match(/[\d,]+\.?\d*/);
              if (feeMatch) {
                const engravingFee = parseFloat(feeMatch[0].replace(',', '')) * 100;
                const newPrice = item.price + engravingFee;
                priceElement.innerHTML = `₱${(newPrice / 100).toFixed(2)}<br><small style="color: #666; font-size: 0.85em;">(includes ${feeText} engraving fee)</small>`;
              }
            }
          }
        }
      });
    });
}