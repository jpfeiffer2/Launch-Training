/* Capture each exam's existing certificate with its existing print CSS.
 * PDF pages are image-based. The existing Print / Save feature stays available.
 */
window.launchGenerateCertificatePdf = async function (source) {
  if (!source) throw Error('The completed certificate is unavailable.');
  if (!window.PDFLib) throw Error('The PDF library could not load.');
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden','true');
  frame.style.cssText = 'position:fixed;left:-12000px;top:0;width:979.2px;height:2000px;border:0;';
  document.body.appendChild(frame);
  try {
    const styles = [...document.querySelectorAll('style')]
      .filter(s => s.id !== 'launch-certificate-delivery-style')
      .map(s => s.textContent.replace(/@media\s+print/g,'@media all')).join('\n');
    let subtree = source.cloneNode(true);
    // Keep wrappers that affect the original certificate's print appearance.
    let parent = source.parentElement;
    while (parent && parent !== document.body) {
      const wrapper = parent.cloneNode(false);
      wrapper.appendChild(subtree);subtree = wrapper;parent = parent.parentElement;
    }
    const fd = frame.contentDocument;
    fd.open();
    fd.write('<!doctype html><html class="portal-authenticated"><head><meta charset="UTF-8"><style>' + styles + '</style></head><body>' + subtree.outerHTML + '</body></html>');
    fd.close();
    await fd.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const root = fd.body;
    const height = Math.ceil(Math.max(root.getBoundingClientRect().height,root.scrollHeight));
    if (height < 10 || height > 24000) throw Error('The certificate print layout could not be captured.');
    const clone = root.cloneNode(true);
    const originals = [root,...root.querySelectorAll('*')];
    const clones = [clone,...clone.querySelectorAll('*')];
    for (let i = 0; i < originals.length; i++) {
      const computed = frame.contentWindow.getComputedStyle(originals[i]);
      let css = '';
      for (const prop of computed) if (!prop.startsWith('--')) css += prop + ':' + computed.getPropertyValue(prop) + ';';
      clones[i].setAttribute('style',css);
      for (const attr of [...clones[i].attributes]) if (attr.name.startsWith('on')) clones[i].removeAttribute(attr.name);
    }
    clone.querySelectorAll('script').forEach(e => e.remove());
    // All current certificate implementations use text and CSS, not external assets.
    if (clone.querySelector('img[src]:not([src^="data:"])')) throw Error('Certificate contains an external image that requires preparation.');
    const width = 979.2,scale = 2;
    const serialized = new XMLSerializer().serializeToString(clone);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><foreignObject x="0" y="0" width="100%" height="100%">' + serialized + '</foreignObject></svg>';
    const img = new Image();
    await new Promise((resolve,reject) => {
      img.onload = resolve;img.onerror = () => reject(Error('The browser could not render this certificate.'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);canvas.height = height * scale;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';context.fillRect(0,0,canvas.width,canvas.height);
    context.scale(scale,scale);context.drawImage(img,0,0);
    const top = root.getBoundingClientRect().top;
    const blocks = [...root.querySelectorAll('.cert-header,.cert-head,.cert-info-row,.cert-grid,.cert-statement,.missed-item,.wrong,.cert-sig-row,.signatures,.sig-row')]
      .filter(e => e.getBoundingClientRect().height > 0)
      .map(e => ({top:e.getBoundingClientRect().top-top,bottom:e.getBoundingClientRect().bottom-top}));
    const pdf = await PDFLib.PDFDocument.create();
    let start = 0;
    while (start < height) {
      let end = Math.min(height,start + 739.2);
      const crossing = blocks.find(b => b.top < end && b.bottom > end && b.top > start + 5 && b.bottom-b.top <= 739.2);
      if (crossing) end = Math.floor(crossing.top);
      if (end <= start) throw Error('The certificate could not be paginated.');
      const chunk = document.createElement('canvas');
      chunk.width = canvas.width;chunk.height = Math.ceil((end-start)*scale);
      chunk.getContext('2d').drawImage(canvas,0,Math.floor(start*scale),canvas.width,chunk.height,0,0,chunk.width,chunk.height);
      const image = await pdf.embedPng(chunk.toDataURL('image/png'));
      const page = pdf.addPage([792,612]);const drawnHeight = (end-start)*0.75;
      page.drawImage(image,{x:28.8,y:612-28.8-drawnHeight,width:734.4,height:drawnHeight});
      start = end;
    }
    pdf.setTitle('Launch Training Assessment Record');
    return await pdf.save();
  } finally {frame.remove();}
};
