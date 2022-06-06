import { getMetadata } from '../../scripts/helix-web-library.esm.js';
import { getCategoriesKeyDictionary, getCategoriesIdDictionary } from '../../scripts/scripts.js';

function renderBreadcrumbs(block, breadcrumbs) {
  breadcrumbs.unshift({
    name: 'Home',
    path: '/',
  });

  const breadCrumbsHTML = /* html */`
    <ul>
      ${breadcrumbs.map(({ name, path }) => /* html */`<li><a href="${path}">${name}</a></li>`).join('')}
    </ul > `;

  block.innerHTML = breadCrumbsHTML;
}

/**
 * Decorates a categories page
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  const pageType = getMetadata('pagetype');
  const { pathname } = window.location;
  const pathsArray = pathname.split('/');

  const breadcrumbs = [];
  if (pageType === 'category') {
    const categories = await getCategoriesKeyDictionary();

    // pop current page
    let segment = pathsArray.pop();
    while (segment !== 'category') {
      const { name, url_key: categoryUrlKey } = categories[segment];
      breadcrumbs.push({
        name,
        path: `${pathsArray.join('/')}/${categoryUrlKey}`,
      });
      segment = pathsArray.pop();
    }

    breadcrumbs.reverse();
    renderBreadcrumbs(block, breadcrumbs);
  } else if (pageType === 'product') {
    document.addEventListener('product-loaded', async () => {
      const categoryIdDictionary = await getCategoriesIdDictionary();
      const {
        categories: productCategories,
        details: { title: productName, url_key: productUrlKey },
      } = window.wesco.product;
      pathsArray.pop();
      pathsArray.push('category');
      productCategories.forEach((productCategoryId) => {
        const productCategory = categoryIdDictionary[productCategoryId];
        if (productCategory) {
          const { name: categoryName, url_key: categoryUrlKey } = productCategory;
          breadcrumbs.push({
            name: categoryName,
            path: `${pathsArray.join('/')}/${categoryUrlKey}`,
          });

          pathsArray.push(categoryUrlKey);
        }
      });

      breadcrumbs.push({
        name: productName,
        path: `${pathsArray.join('/')}/${productUrlKey}`,
      });

      renderBreadcrumbs(block, breadcrumbs);
    });
  }
}
