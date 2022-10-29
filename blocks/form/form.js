import { createForm } from '../../scripts/helix-forms.esm.js';
import { readBlockConfig, toClassName } from '../../scripts/helix-web-library.esm.js';
import { getPlaceholders, store } from '../../scripts/scripts.js';

const log = logger('form');

function validateConfig(config) {
  if (typeof config !== 'object') {
    throw Error(`invalid config, expected object and got ${typeof config}`);
  }

  const { definition } = config;
  if (!definition || typeof definition !== 'string') {
    throw Error('missing or invalid definition');
  }
}

/** @param {HTMLDivElement} block */
export default async function decorate(block) {
  /** @type {FormConfig} */
  const config = readBlockConfig(block);
  console.log('config: ', config);

  block.innerHTML = '';

  try {
    validateConfig(config);
  } catch (e) {
    log.error(`invalid form config: ${e.message}`, config);
    return;
  }

  const placeholders = await getPlaceholders();
  console.log('placeholders: ', placeholders);

  const {
    definition,
    event,
    template,
    autocorrect,
  } = config;

  // if event is defined, emit that through the store
  // otherwise, data will be submitted to the workbook's `incoming` sheet
  let action;
  if (event) {
    const ev = event.replace(/-/g, ':');
    log.debug('using submit event: ', ev);
    action = (data) => {
      store.emit(ev, { data });
    };
  }

  /** @type {CreateFormOptions} */
  const opts = {
    action,
    autocorrect,
    placeholders,
  };
  const form = await createForm(definition, opts);
  if (template) {
    const templs = template.trim().split(',').map((t) => toClassName(`form-${t.trim()}`));
    form.classList.add(...templs);
    block.classList.add(...templs);
    const section = block.closest('.section');
    if (section) {
      section.classList.add(...templs.map((t) => `${t}-container`));
    }
  }

  // forward events
  form.addEventListener('form-event', ({ detail = {} }) => {
    const { type, data } = detail;
    if (type) {
      store.emit(type, data);
    }
  });
  block.append(form);
}
