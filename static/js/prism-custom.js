(function (Prism) {
  Prism.languages.golang = Prism.languages.go;
  Prism.languages.thrift = {
    'comment': [/\/\*[\s\S]*?\*\//, /\/\/.*/, /#.*/],
    'string': {
      pattern: /"(?:\\.|[^\\"])*"/, greedy: true
    },
    'class-name': {
      pattern: /(\b(?:struct|service|enum|namespace|extends|throws)\s+)\w+/, lookbehind: true, greedy: true
    },
    'keyword': /\b(?:namespace|struct|union|typedef|include|enum|const|service|extends|throws)\b/,
    'builtin': /\b(?:bool|i8|i16|i32|i64|double|string|binary|list|set|map|void|optional|required|oneway)\b/,
    'number': /\b\d+\b/,
    'operator': /[=,;]/,
    'punctuation': /[{}()<>]/,
    'annotation': {
      pattern: /@\w+/, alias: 'at-rule'
    }
  };
}(Prism));
