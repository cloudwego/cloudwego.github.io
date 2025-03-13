function outboundLinkInBlank(clipboard) {
  document.querySelectorAll('a').forEach(function (link) {
    const href = link.getAttribute('href');
    if (href && href.startsWith('http')) {
      try {
        const url = new URL(href);
        const host = url.host;
        if (!host.endsWith('cloudwego.io') && !host.endsWith('cloudwego.cn')) {
          link.setAttribute('target', '_blank');
        }
      } catch (e) {
        console.error('Invalid URL:', href);
      }
    }
  });
}

outboundLinkInBlank();
