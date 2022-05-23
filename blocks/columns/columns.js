export default function decorate(block) {
  block.querySelectorAll(':scope > div > div').forEach((cell) => {
    if (cell.querySelector('picture') && cell.querySelector('h2')) cell.classList.add('columns-overlay');
  });
}
