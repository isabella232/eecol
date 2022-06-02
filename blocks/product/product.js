import { getMetadata, toClassName } from 'https://cdn.skypack.dev/@dylandepass/helix-web-library@v1.6.1/dist/helix-web-library.esm.js';

import {
  getPlaceholders,
  lookupProduct,
  formatCurrency,
} from '../../scripts/scripts.js';

export default async function decorateProduct(block) {
  const ph = await getPlaceholders('/ca/en');
  const selectedModifiers = {};

  const getProduct = async () => {
    if (window.wesco && window.wesco.currentProduct) return window.wesco.currentProduct;
    let sku = window.location.pathname.split('/').pop();
    const [product] = await lookupProduct(sku);
    const { final_price, name, image, description } = product;
    const details = {};
    details.title = name;
    details.image = image;
    details.description = description;
    window.wesco = {
      product: {
        sku, details, final_price
      },
    };
    return { sku, details, final_price };
  };

  const enableAddToCart = async () => {
    const addToButton = block.querySelector('.product-addto button');
    const quantity = +block.querySelector('.product-quantity input').value;
    const modkeys = Object.keys(selectedModifiers);
    if (modkeys.every((key) => selectedModifiers[key])) {
      const product = await getProduct();
      if (window.cart
        && window.cart.canAdd(product.sku, product.details, product.price, quantity)) {
        addToButton.disabled = false;
        return;
      }
    }
    addToButton.disabled = true;
  };

  const selectImage = (picture) => {
    const images = picture.closest('.product-images');
    const wrapper = images.parentElement;
    const selectedImage = wrapper.querySelector('.product-selected-image');
    const buttons = wrapper.querySelector('.product-images-buttons');
    const index = [...images.children].indexOf(picture);
    const button = [...buttons.children][index];
    images.scrollTo({ top: 0, left: picture.offsetLeft - images.offsetLeft, behavior: 'smooth' });

    [...images.children].forEach((r) => r.classList.remove('selected'));
    picture.classList.add('selected');

    [...buttons.children].forEach((r) => r.classList.remove('selected'));
    button.classList.add('selected');

    selectedImage.textContent = '';
    selectedImage.append(picture.cloneNode(true));
  };

  const createQuantity = () => {
    const div = document.createElement('div');
    div.className = 'product-quantity';
    div.innerHTML = `<h3>${ph.quantity}</h3><div><button class="product-quantity-minus"></button>
    <input type="number" min="1" value="1" max="20">
    <button class="product-quantity-plus"></button></div>`;
    const [minus, input, plus] = [...div.querySelectorAll('button, input')];
    minus.addEventListener('click', () => {
      if (input.value !== input.getAttribute('min')) {
        input.value = +input.value - 1;
        enableAddToCart();
      }
    });
    input.addEventListener('input', () => {
      enableAddToCart();
    });
    plus.addEventListener('click', () => {
      if (input.value !== input.getAttribute('max')) {
        input.value = +input.value + 1;
        enableAddToCart();
      }
    });
    return div;
  };

  // eslint-disable-next-line no-unused-vars
  const createPickList = (values, prefix, title) => {
    selectedModifiers[prefix] = '';
    const div = document.createElement('div');
    div.className = `product-${prefix}s`;
    div.innerHTML = `<h3>${title}</h3>`;
    const options = document.createElement('div');
    options.className = 'product-option-radios';
    values.forEach((c) => {
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = prefix;
      radio.id = `product-${prefix}-${toClassName(c)}`;
      radio.value = c;
      radio.addEventListener('change', () => {
        document.getElementById(`product-${prefix}`).textContent = c;
        const picture = [...document.querySelectorAll('.product-images picture')].find((p) => p.dataset.hints.includes(c));
        if (picture) {
          selectImage(picture);
          selectedModifierImage = picture.querySelector('img').currentSrc;
        }
        selectedModifiers[prefix] = c;
        enableAddToCart();
      });
      options.append(radio);
      const label = document.createElement('label');
      label.setAttribute('for', radio.id);
      label.textContent = c;
      options.append(label);
    });
    div.append(options);
    const selected = document.createElement('div');
    selected.className = `product-${prefix}-selected`;
    selected.innerHTML = `Selected ${title}: <span id="product-${prefix}">${ph.none}</span>`;
    div.append(selected);
    return (div);
  };

  const addToCart = async () => {
    const quantity = +block.querySelector('.product-quantity input').value;
    const product = await getProduct();
    if (window.cart) window.cart.add(product.sku, product.details, product.final_price, quantity);
    enableAddToCart();
  };

  const createAddToButtons = () => {
    const div = document.createElement('div');
    div.className = 'product-addto';
    div.innerHTML = `<p class="button-container"><button>${ph.addToCart}</button></p>`;
    div.querySelector('button').addEventListener('click', () => {
      addToCart();
    });
    return div;
  };

  const createHeading = (h1, price) => {
    const div = document.createElement('div');
    div.className = 'product-heading';
    div.innerHTML = `<div class="product-price">${formatCurrency(price, ph.currency)}</div>`;
    div.prepend(h1);
    return (div);
  };

  const product = await getProduct();
  console.log(product);
  const { final_price, details, sku } = product;
  const { image, title, description } = details;
  console.log(details);
  block.textContent = '';

  const picture = document.createElement('picture');
  picture.innerHTML = `<img src="${image}">`;

  const h1 = document.createElement('h1');
  h1.textContent = title;

  const p = document.createElement('p');
  p.textContent = description;

  const config = document.createElement('div');
  config.className = 'product-config';
  config.append(createQuantity(), createAddToButtons());
  block.append(createHeading(h1, final_price), picture, config);
  block.append(p);
  enableAddToCart();

  document.body.addEventListener('cart-update', enableAddToCart);
}
