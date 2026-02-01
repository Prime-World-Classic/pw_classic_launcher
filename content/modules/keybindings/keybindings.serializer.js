
/**
 * Serialize keybind file model into string
 * @param {{ sections: Array<{name: string|null, binds: any[]}> }} fileModel
 * @returns {string} Serialized keybind config
 */
export function serializeCfg(fileModel) {
  if (!fileModel) return '';
  let out = 'unbindall\n';

  for (const section of fileModel.sections) {
    if (section.name) out += `bindsection ${section.name}\n`;

    for (const bind of section.binds) {
      const neg = bind.negated ? '!' : '';
      const val = bind.value ? ` ${bind.value}` : '';
      const keys = bind.keys && bind.keys.length ? bind.keys.map((k) => `'${k}'`).join(' + ') : "''";

      out += `${bind.type} ${neg}${bind.command}${val} ${keys}\n`;
    }
  }

  return out;
}