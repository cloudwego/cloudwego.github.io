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

  var toast = document.getElementById('copy-fulltext-toast');

  function getSourceData() {
    var mdEl = document.getElementById('copy-fulltext-markdown');
    return {
      title: container.getAttribute('data-title') || '',
      url: container.getAttribute('data-url') || '',
      successMarkdown: container.getAttribute('data-success-markdown') || 'Copied as Markdown',
      successText: container.getAttribute('data-success-text') || 'Copied as plain text',
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
    var actualType = type;

    if (type === 'markdown' && data && data.markdown) {
      text = '# ' + data.title + '\n\n' + data.markdown;
      if (data.url) {
        text += '\n\n---\nSource: ' + data.url;
      }
    } else {
      actualType = 'text';
      text = getPlainText();
    }

    copyToClipboard(text, data, actualType);
  }

  function copyToClipboard(text, data, type) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showFeedback(data, type);
      }).catch(function () {
        fallbackCopy(text, data, type);
      });
    } else {
      fallbackCopy(text, data, type);
    }
  }

  function fallbackCopy(text, data, type) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showFeedback(data, type);
    } catch (e) {
      // silent fail
    }
    document.body.removeChild(textarea);
  }

  function showFeedback(data, type) {
    // Swap icon to checkmark
    var icon = defaultBtn.querySelector('i');
    icon.classList.replace('fa-copy', 'fa-check');
    defaultBtn.classList.add('copy-fulltext__btn--success');

    // Show toast
    var toastText = type === 'markdown' ? data.successMarkdown : data.successText;
    toast.textContent = '✅ ' + toastText;
    toast.classList.add('copy-fulltext__toast--visible');

    setTimeout(function () {
      icon.classList.replace('fa-check', 'fa-copy');
      defaultBtn.classList.remove('copy-fulltext__btn--success');
      toast.classList.remove('copy-fulltext__toast--visible');
    }, 2000);
  }
})();
