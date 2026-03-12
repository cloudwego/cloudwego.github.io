(function () {
  'use strict';

  var container = document.getElementById('copy-fulltext');
  if (!container) return;

  var toggleBtn = document.getElementById('copy-fulltext-toggle');
  var defaultBtn = document.getElementById('copy-fulltext-default');
  var dropdown = document.getElementById('copy-fulltext-dropdown');
  var options = dropdown.querySelectorAll('.copy-fulltext__option');

  toggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (dropdown.classList.contains('copy-fulltext__dropdown--open')) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  function openDropdown() {
    dropdown.classList.add('copy-fulltext__dropdown--open');
    toggleBtn.querySelector('i').classList.replace('fa-chevron-up', 'fa-chevron-down');
  }

  function closeDropdown() {
    dropdown.classList.remove('copy-fulltext__dropdown--open');
    toggleBtn.querySelector('i').classList.replace('fa-chevron-down', 'fa-chevron-up');
  }

  document.addEventListener('click', function (e) {
    if (!container.contains(e.target)) {
      closeDropdown();
    }
  });

  // Default button copies markdown (most useful for LLM)
  defaultBtn.addEventListener('click', function () {
    copyContent('markdown');
  });

  options.forEach(function (opt) {
    opt.addEventListener('click', function () {
      copyContent(this.getAttribute('data-copy-type'));
      closeDropdown();
    });
  });

  function getSourceData() {
    var mdEl = document.getElementById('copy-fulltext-markdown');
    return {
      title: container.getAttribute('data-title') || '',
      url: container.getAttribute('data-url') || '',
      successText: container.getAttribute('data-success-text') || 'Copied',
      markdown: mdEl ? mdEl.textContent : ''
    };
  }

  function getPlainText() {
    var contentEl = document.querySelector('.td-content');
    if (!contentEl) return '';
    var clone = contentEl.cloneNode(true);

    // Remove UI elements that shouldn't be copied
    var removals = clone.querySelectorAll('.copy-fulltext, .td-page-meta, script, style, .feedback--container');
    removals.forEach(function (el) { el.remove(); });

    // Replace mermaid SVGs with placeholder (SVG textContent is gibberish)
    clone.querySelectorAll('pre.mermaid, .mermaid').forEach(function (el) {
      var placeholder = document.createElement('p');
      placeholder.textContent = '[diagram]';
      el.replaceWith(placeholder);
    });

    // Replace images with their alt text
    clone.querySelectorAll('img').forEach(function (img) {
      var alt = img.getAttribute('alt');
      if (alt) {
        var text = document.createElement('span');
        text.textContent = '[image: ' + alt + ']';
        img.replaceWith(text);
      } else {
        img.remove();
      }
    });

    return clone.textContent.replace(/\n{3,}/g, '\n\n').trim();
  }

  function copyContent(type) {
    var data = getSourceData();
    var text = '';

    if (type === 'markdown' && data && data.markdown) {
      text = '# ' + data.title + '\n\n' + data.markdown;
      if (data.url) {
        text += '\n\n---\nSource: ' + data.url;
      }
    } else {
      text = getPlainText();
    }

    copyToClipboard(text, data);
  }

  function copyToClipboard(text, data) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showFeedback(data);
      }).catch(function () {
        fallbackCopy(text, data);
      });
    } else {
      fallbackCopy(text, data);
    }
  }

  function fallbackCopy(text, data) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showFeedback(data);
    } catch (e) {
      // silent fail
    }
    document.body.removeChild(textarea);
  }

  function showFeedback(data) {
    var span = defaultBtn.querySelector('span');
    var original = span.textContent;
    var successText = (data && data.successText) || 'Copied';
    span.textContent = '✓ ' + successText;
    defaultBtn.classList.add('copy-fulltext__btn--success');
    setTimeout(function () {
      span.textContent = original;
      defaultBtn.classList.remove('copy-fulltext__btn--success');
    }, 2000);
  }
})();
