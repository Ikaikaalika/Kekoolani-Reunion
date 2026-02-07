import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'a',
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'span',
  'div',
  'img'
];

export function sanitizeCustomHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title'],
      '*': ['class']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noreferrer' }, true)
    }
  });
}
