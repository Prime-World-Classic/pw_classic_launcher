export function normalizeKey(e) {
  const parts = [];

  if (e.ctrlKey) parts.push('CTRL');
  if (e.altKey) parts.push('ALT');
  if (e.shiftKey) parts.push('SHIFT');

  let main = e.key.toUpperCase();

  if (main === ' ') main = 'SPACE';

  parts.push(main);

  return parts.join(' + ');
}