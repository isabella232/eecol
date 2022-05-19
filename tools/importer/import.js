/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */

// eslint-disable-next-line no-unused-vars
const cleanupName = (name) => {
  let n = name;
  const firstChar = n.charAt(0);
  const lastChar = n.charAt(n.length - 1);
  if (!/[A-Za-z0-9]/.test(firstChar)) {
    n = n.substring(1);
  }
  if (!/[A-Za-z0-9]/.test(lastChar)) {
    n = n.slice(0, -1);
  }
  return n;
};

const createMetadata = (main, document, url) => {
  const meta = {};

  const title = document.querySelector('title');
  if (title) {
    meta.Title = title.innerHTML.replace(/[\n\t]/gm, '');
  }

  const desc = document.querySelector('[property="og:description"]');
  if (desc) {
    meta.Description = desc.content;
  }

  if (url.includes('product-page')) {
    const breadcrump = document.querySelector('.cmp-breadcrumb__list');
    if (breadcrump) {
      const cat = breadcrump.querySelector('li:nth-last-child(2)');
      if (cat) {
        meta.Category = cat.textContent.trim();
      }
    }

    const manu = document.querySelector('.productFullDetail__manufacturerDisplay');
    if (manu) {
      meta.Manufacturer = manu.textContent.trim();
    }

    const manuId = document.querySelector('.productFullDetail__supplierPartNumber');
    if (manuId) {
      const split = manuId.textContent.split(':');
      if (split && split.length > 1) {
        meta['Manufacturer #'] = split[1].trim();
      }
    }

    const sku = document.querySelector('.productFullDetail__sku');
    if (sku) {
      const split = sku.textContent.split(':');
      if (split && split.length > 1) {
        meta['SKU'] = split[1].trim();
      }
    }

    // const qty = document.querySelector('.cmp-Pricing__pricingContainer__quantity');
    // if (qty) {
    //   meta['Quantity'] = qty.value;
    // }
    meta['Quantity'] = 500;
  }


  // const img = document.querySelector('[property="og:image"]');
  // if (img) {
  //   const el = document.createElement('img');
  //   el.src = img.content;
  //   meta.Image = el;
  // }

  const block = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.append(block);

  return meta;
};

const cleanupHeadings = (main, document) => {
  main.querySelectorAll('.h1, .h2, .h3, .h4, .h5, .h6').forEach((h) => {
    const level = h.classList.contains('h1') ? 'h1' : 
      h.classList.contains('h2') ? 'h2' :
      h.classList.contains('h3') ? 'h3' : 
      h.classList.contains('h4') ? 'h4' : 
      h.classList.contains('h5') ? 'h5' : 
      h.classList.contains('h6') ? 'h6' : null;
    if (level) {
      const heading = document.createElement(level);
      heading.innerHTML = h.textContent;
      h.replaceWith(heading);
    }
  });
};

const cleanupHero = (main, document) => {
  let hero = main.querySelector('.venia-HeroImage');
  if (hero) {
    const h1 = hero.querySelector('h1');
    if (h1) {
      hero.before(h1);
    }
    const h3 = hero.querySelector('h3');
    if (h3) {
      hero.before(h3);
    }
    hero = WebImporter.DOMUtils.replaceBackgroundByImg(hero, document);
    if (h1) h1.before(hero);
  }
}

const downgradeSummary = (main, document) => {
  const h = main.querySelector('.productFullDetail__descriptionHeader');
  if (h) {
    const h2 = document.createElement('h2');
    h2.innerHTML = h.textContent;
    h.replaceWith(h2);
  }
}

export default {
  /**
   * Apply DOM operations to the provided document and return
   * the root element to be then transformed to Markdown.
   * @param {HTMLDocument} document The document
   * @returns {HTMLElement} The root element
   */
  transformDOM: ({ document, html, url }) => {
    WebImporter.DOMUtils.remove(document, [
      '.header-fragment',
      '.footer-fragment',
    ]);

    const main = document.querySelector('main');

    cleanupHeadings(main, document);
    cleanupHero(main, document);
    downgradeSummary(main, document);

    createMetadata(main, document, url);
 
    WebImporter.DOMUtils.remove(document, [
      '.cmp-breadcrumb__list',
      '.productFullDetail__manufacturerDisplay',
      '.productFullDetail__supplierPartNumber',
      '.productFullDetail__sku',
      '.pricingcontainer'
    ]);

    return main;
  },

  /**
   * Return a path that describes the document being transformed (file name, nesting...).
   * The path is then used to create the corresponding Word document.
   * @param {String} url The url of the document being transformed.
   * @param {HTMLDocument} document The document
   */
  // eslint-disable-next-line arrow-body-style
  generateDocumentPath: ({ url }) => {
    return new URL(url).pathname.replace(/\.html/gm, '');
  },
};