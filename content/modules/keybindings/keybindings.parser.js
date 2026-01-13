/**
 * Parse Prime World keybind cfg into file model
 * @param {string} cfgText
 * @returns {{ sections: Array<{name: string|null, binds: any[]}> }}
 */
export function parseKeybindCfg(cfgText) {
  const lines = cfgText.split(/\r?\n/);

  /** @type {{ sections: any[] }} */
  const model = { sections: [] };

  let currentSection = { name: null, binds: [] };
  model.sections.push(currentSection);

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === 'unbindall') continue;

    // bindsection 
    if (line.startsWith('bindsection')) {
      const parts = line.split(/\s+/);
      const name = parts.length > 1 ? parts[1] : null;

      currentSection = { name, binds: [] };
      model.sections.push(currentSection);
      continue;
    }

    //  bind_command 
    if (line.startsWith('bind_command')) {
      // ignored or could be stored separately
      continue;
    }

    //  bind
    if (line.startsWith('bind ')) {
      const bind = parseBindLine(line);
      if (bind) currentSection.binds.push(bind);
    }
  }

  return model;
}

/**
 * Parse single bind line
 * @param {string} line
 */
export function parseBindLine(line) {
  let rest = "";
  let type = "bind";

  if (line.startsWith("bind_command ")) {
    rest = line.slice(13).trim();
    type = "bind_command";
  } else if (line.startsWith("bind ")) {
    rest = line.slice(5).trim();
  } else {
    return null;
  }

  let negated = false;
  if (rest.startsWith("!")) {
    negated = true;
    rest = rest.slice(1).trim();
  }

  const tokens = tokenize(rest);
  if (tokens.length === 0) return null;

  let command = null;
  let value = null;

  if (type === "bind") {
    command = tokens.shift();

    if (tokens.length && /^[-+]?\d/.test(tokens[0])) {
      value = tokens.shift();
    }
  } else {
    // bind_command: последняя строка — команда
    command = tokens.pop()?.replace(/^"|"$/g, "");
  }

  // === парсинг клавиш ===
  const keyTokens = tokens.filter(t => t !== "+");

  const keys = keyTokens
    .map(k => k.replace(/^'|'$/g, ""))
    .filter(k => k.length > 0);

  return {
    type,
    command,
    value,
    negated,
    keys: keys.length ? keys : null
  };
}


/**
 * Tokenizer supporting: 'A' + 'B'  and numbers
 */
export function tokenize(str) {
  const regex = /'[^']*'|\+|[^\s]+/g;
  return str.match(regex) || [];
}

// export function serializeBinds(binds) {
//   let out = '';
//   for (let i = 1; i <= 10; i++) {
//     const key = binds[`slot${i}`];
//     if (key) {
//       out += `bind cmd_action_bar_slot${i} '${key}'\n`;
//     }
//   }
//   return out;
// }