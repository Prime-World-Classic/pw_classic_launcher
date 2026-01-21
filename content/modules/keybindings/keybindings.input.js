export function normalizeKey(e) {
  const keys = [];

  if (e.ctrlKey) keys.push('CTRL');
  if (e.altKey) keys.push('ALT');
  if (e.shiftKey) keys.push('SHIFT');

  let main = e.key.toUpperCase();
  if (main === ' ') main = 'SPACE';

  if (!['CONTROL','SHIFT','ALT'].includes(main)) {
    keys.push(main);
  }
  
  return keys;
}