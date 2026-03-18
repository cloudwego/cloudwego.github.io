{{ with .Site.Params.mermaid }}
{{ if .enable }}
(function($) {
    var needMermaid = false;
    function parseFrontMatter(text) {
        var m = text.match(/^\s*---\s*[\r\n]([\s\S]*?)[\r\n]---\s*[\r\n]?/);
        if (!m) return { cfg: null, body: text };
        var yamlStr = m[1];
        var doc = null;
        try {
            if (window.jsyaml && typeof window.jsyaml.load === 'function') {
                doc = window.jsyaml.load(yamlStr);
            } else {
                doc = JSON.parse(yamlStr);
            }
        } catch (e) {
            console.warn('Mermaid front matter parse failed, fallback to global settings:', e);
            return { cfg: null, body: text.replace(m[0], '') };
        }
        var cfg = doc && typeof doc === 'object' && doc.config ? doc.config : doc;
        return { cfg: cfg, body: text.replace(m[0], '') };
    }

    function preprocessMermaid(text) {
        var fm = parseFrontMatter(text);
        var directive = '';
        var body = fm.body;
        if (fm.cfg && typeof fm.cfg === 'object' && Object.keys(fm.cfg).length > 0) {
            directive = '%%{init: ' + JSON.stringify(fm.cfg) + '}%%\n';
        }
        var isV10 = typeof mermaid !== 'undefined' && mermaid.version && parseInt(mermaid.version.split('.')[0], 10) >= 10;
        body = body.replace(/<br\s*\/?>(?![^`]*`)/gi, '\\n');
        if (!isV10) {
            body = body.split('\n').map(function(line) {
                var m = line.match(/^\s*([A-Za-z0-9_]+)\s*@\{\s*([^}]*)\s*\}\s*$/);
                if (m) {
                    var id = m[1];
                    var props = m[2];
                    var lm = props.match(/label\s*:\s*("[^"]*"|'[^']*'|[^,]+)/);
                    var label = lm ? lm[1].replace(/^['"]|['"]$/g, '') : id;
                    return id + '["' + label + '"]';
                }
                return line;
            }).join('\n');
        }
        return directive + body;
    }

    function isMermaidLike(text) {
        var t = text.trim();
        if (/^%%\{init:/.test(t) || /^---\s*/.test(t)) return true;
        var firstLine = t.split('\n')[0].trim();
        if (/^(flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt|pie)\b/.test(firstLine)) return true;
        // Only treat as mermaid when 'graph' starts with a valid direction token
        if (/^graph\s+(TD|TB|LR|RL)\b/.test(firstLine)) return true;
        return false;
    }

    var toReplace = [];
    $('pre > code.language-mermaid').each(function() { toReplace.push($(this)); });

    toReplace.forEach(function($code) {
        needMermaid = true;
        var raw = $code.text();
        var processed = preprocessMermaid(raw);
        var $wrapper = $code.closest('div[class*=language-]');
        var $new = $('<pre class="mermaid">').text(processed);
        if ($wrapper.length) {
            $wrapper.replaceWith($new);
        } else {
            $code.parent().replaceWith($new);
        }
    });

    if (!needMermaid)  {
        mermaid.initialize({startOnLoad: false});
        return;
    }

    var params = {{ . | jsonify | safeJS }};

    // site params are stored with lowercase keys; lookup correct casing
    // from Mermaid default config.
    var norm = function(defaultConfig, params) {
        var result = {};
        for (const key in defaultConfig) {
            const keyLower = key.toLowerCase();
            if (defaultConfig.hasOwnProperty(key) && params.hasOwnProperty(keyLower)) {
                if (typeof defaultConfig[key] === "object") {
                    result[key] = norm(defaultConfig[key], params[keyLower]);
                } else {
                    result[key] = params[keyLower];
                }
            }
        }
        return result;
    };
    var settings = norm(mermaid.mermaidAPI.defaultConfig, params);
    settings.startOnLoad = true;
    mermaid.initialize(settings);

    function ensureModal() {
        if (!$('#mermaidModal').length) {
            var html = '' +
            '<div class="modal fade" id="mermaidModal" tabindex="-1" role="dialog" aria-hidden="true">' +
            '<div class="modal-dialog modal-dialog-centered modal-xl" role="document">' +
            '<div class="modal-content">' +
            '<div class="modal-body">' +
            '<div class="mermaid-zoom-controls">' +
            '<button type="button" class="btn btn-sm btn-light" id="mermaidZoomIn">+</button>' +
            '<button type="button" class="btn btn-sm btn-light" id="mermaidZoomOut">-</button>' +
            '<button type="button" class="btn btn-sm btn-light" id="mermaidZoomReset">Reset</button>' +
            '<button type="button" class="btn btn-sm btn-light" id="mermaidDownload">Download</button>' +
            '</div>' +
            '<div class="mermaid-zoom-wrapper"><div class="mermaid-zoom-content"></div></div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
            $('body').append(html);
        }
    }

    var scale = 1;
    function applyScale() {
        $('.mermaid-zoom-content').css('transform', 'scale(' + scale + ')');
    }

    $(document).on('click', 'pre.mermaid, .mermaid', function() {
        ensureModal();
        var $svg = $(this).find('svg').clone();
        var $content = $('#mermaidModal .mermaid-zoom-content');
        $content.empty().append($svg);
        scale = 1;
        applyScale();
        $('#mermaidModal').modal('show');
    });

    $(document).on('click', '#mermaidZoomIn', function() {
        scale = Math.min(scale + 0.2, 5);
        applyScale();
    });
    $(document).on('click', '#mermaidZoomOut', function() {
        scale = Math.max(scale - 0.2, 0.2);
        applyScale();
    });
    $(document).on('click', '#mermaidZoomReset', function() {
        scale = 1;
        applyScale();
    });
    $(document).on('wheel', '.mermaid-zoom-wrapper', function(e) {
        e.preventDefault();
        var dy = e.originalEvent.deltaY;
        scale += (dy > 0 ? -0.1 : 0.1);
        scale = Math.max(0.2, Math.min(5, scale));
        applyScale();
    });

    var isDragging = false;
    var startX = 0;
    var startY = 0;
    var scrollLeft = 0;
    var scrollTop = 0;

    $(document).on('mousedown touchstart', '.mermaid-zoom-wrapper', function(e) {
        var $wrap = $(this);
        isDragging = true;
        $wrap.addClass('dragging');
        var ev = e.type === 'touchstart' ? e.originalEvent.touches[0] : e;
        startX = ev.pageX - $wrap.offset().left;
        startY = ev.pageY - $wrap.offset().top;
        scrollLeft = $wrap.scrollLeft();
        scrollTop = $wrap.scrollTop();
    });

    $(document).on('mousemove touchmove', '.mermaid-zoom-wrapper', function(e) {
        if (!isDragging) return;
        var $wrap = $(this);
        var ev = e.type === 'touchmove' ? e.originalEvent.touches[0] : e;
        var x = ev.pageX - $wrap.offset().left;
        var y = ev.pageY - $wrap.offset().top;
        var dx = x - startX;
        var dy = y - startY;
        $wrap.scrollLeft(scrollLeft - dx);
        $wrap.scrollTop(scrollTop - dy);
    });

    $(document).on('mouseup mouseleave touchend', '.mermaid-zoom-wrapper', function() {
        isDragging = false;
        $(this).removeClass('dragging');
    });

    $(document).on('click', '#mermaidDownload', function() {
        var $svg = $('#mermaidModal .mermaid-zoom-content svg');
        if (!$svg.length) return;
        var node = $svg.get(0);
        if (!node.getAttribute('xmlns')) {
            node.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        var serializer = new XMLSerializer();
        var source = serializer.serializeToString(node);
        var blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var name = (document.title || 'diagram') + '-' + Date.now() + '.svg';
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            URL.revokeObjectURL(url);
            a.remove();
        }, 0);
    });
})(jQuery);
{{ end }}
{{ end }}
