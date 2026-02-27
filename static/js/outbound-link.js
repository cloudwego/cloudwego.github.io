/**
 * Extracts the top-level domain from a given hostname.
 *
 * @param hostname - The full hostname string from which to extract the top-level domain.
 * @returns The top-level domain string, or the original hostname if it has two or fewer parts.
 */
function getTopLevelDomain(hostname) {
  if (hostname.startsWith("www.")) {
    hostname = hostname.substring(4);
  }

  const parts = hostname.split(".").filter(Boolean);
  if (parts.length > 2) {
    return parts.slice(-2).join(".");
  } else {
    return hostname;
  }
}

/**
 * Extracts the domain without subdomains from a given URL string.
 *
 * @param urlString - The URL string from which to extract the domain without subdomains.
 * @returns The domain without subdomains if the URL is valid, otherwise null.
 */
function getDomainWithoutSubdomains(urlString) {
  try {
    const url = new URL(urlString);
    return getTopLevelDomain(url.hostname);
  } catch (error) {
    console.error("Invalid URL:", error);
    return null;
  }
}

function outboundLinkInBlank() {
  const selfDomains = ["cloudwego.io", "cloudwego.cn"];
  document.querySelectorAll("a").forEach(function (link) {
    const href = link.getAttribute("href");
    if (href && href.startsWith("http")) {
      try {
        const url = new URL(href);
        const host = url.host;
        const domain = getDomainWithoutSubdomains(host);
        if (!selfDomains.includes(domain)) {
          link.setAttribute("target", "_blank");
        }
      } catch (e) {
        console.error("Invalid URL:", href);
      }
    }
  });
}

outboundLinkInBlank();
