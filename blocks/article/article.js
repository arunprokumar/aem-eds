import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  /* Transform the block without creating extra wrapper divs */
  [...block.children].forEach((row) => {
    const div1 = document.createElement('div');
    div1.className = 'class1';

    const div2 = document.createElement('div');
    div2.className = 'class2';
    // Process image
    const picture = row.querySelector('picture');
    if (picture) {
      div1.append(picture);
    }

    // Process other content
    const paragraphs = [...row.querySelectorAll('p')];
    paragraphs.forEach((p, index) => {
      if (index === 0) {
        div2.append(p); // Append the first paragraph
      } else if (index === 1) {
        div2.append(p); // Append the second paragraph
      }
    });

    // Handle button link if exists
    const buttonContainer = row.querySelector('.button-container');
    if (buttonContainer) {
      div2.append(buttonContainer);
    }

    // Append the processed divs back to the block
    block.append(div1);
    block.append(div2);
  });

  // Optimize image handling
  block.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
}
