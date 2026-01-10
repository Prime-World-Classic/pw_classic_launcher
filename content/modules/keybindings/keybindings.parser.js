export function parseBinds(cfgText) {
  const binds = {};
  const regex = /bind cmd_action_bar_slot(\d+) '(.+?)'/g;
  let match;

  while ((match = regex.exec(cfgText)) !== null) {
    binds[`slot${match[1]}`] = match[2];
  }

  return binds;
}

export function serializeBinds(binds) {
  let out = '';
  for (let i = 1; i <= 10; i++) {
    const key = binds[`slot${i}`];
    if (key) {
      out += `bind cmd_action_bar_slot${i} '${key}'\n`;
    }
  }
  return out;
}