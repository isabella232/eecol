export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);
  if (block.classList.contains('dark-section')) {
    block.classList.add('dark');
    block.closest('.section').classList.add('dark');
  }
  if (block.classList.contains('no-buttons')) {
    block.querySelectorAll('a.button, p.button-container').forEach((a) => { a.className = ''; });
  }
}
