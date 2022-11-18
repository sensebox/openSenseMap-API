'use strict';

const replacements = [
  [/\*/g, '\\*', 'asterisks'],
  [/#/g, '\\#', 'number signs'],
  [/\//g, '\\/', 'slashes'],
  [/\(/g, '\\(', 'parentheses'],
  [/\)/g, '\\)', 'parentheses'],
  [/\[/g, '\\[', 'square brackets'],
  [/\]/g, '\\]', 'square brackets'],
  [/</g, '&lt;', 'angle brackets'],
  [/>/g, '&gt;', 'angle brackets'],
  [/_/g, '\\_', 'underscores'],
  [/`/g, '\\`', 'codeblocks']
];

const escapeMarkdown = function (string, skips) {
  skips = skips || [];

  return replacements.reduce(function (string, replacement) {
    const name = replacement[2];

    return name && skips.indexOf(name) !== -1
      ? string
      : string.replace(replacement[0], replacement[1]);
  }, string);
};

module.exports = escapeMarkdown;
