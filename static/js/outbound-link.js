function outboundLinkInBlank(clipboard) {
  document.querySelectorAll('a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (
      href &&
      href.startsWith('http') &&
      !href.startsWith('https://www.cloudwego.io')
    ) {
      link.setAttribute('target', '_blank');
    }
  });
}

outboundLinkInBlank();
