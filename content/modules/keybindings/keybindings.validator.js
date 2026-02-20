
const CONFLICT_RULES = {
  allowSameCommandAcrossSections: true,
  allowLinkedCommands: true,
  allowSameSectionDuplicates: false,
};

export class BindParseError extends Error {
  constructor(message, line) {
    super(message);
    this.name = 'BindParseError';
    this.line = line;
  }
}

export class BindSameKeysError extends Error {
  constructor(combo, conflicts) {
    super(`Key combo ${combo} is assigned to multiple commands: ${conflicts.map((c) => c.command).join(', ')}`);
    this.name = 'BindSameKeysError';
    this.combo = combo;
    this.conflicts = conflicts;
  }
}

// Validate parse
export function validate(bind, line) {
  switch (bind.type) {
    case 'bind':
      validateBind(bind, line);
      break;
    case 'bind_command':
      validateBindCommand(bind, line);
      break;
    default:
      throw new BindParseError(`Unknown bind type: ${bind.type}`, line);
  }
}

function validateBind(bind, line) {
  if (!bind.command || typeof bind.command !== 'string') {
    throw new BindParseError('Missing or invalid command', line);
  }

  if (typeof bind.negated !== 'boolean') {
    throw new BindParseError('Invalid negated flag', line);
  }

  if (bind.value !== null) {
    if (typeof bind.value !== 'string' || !/^[-+]?\d+(\.\d+)?$/.test(bind.value)) {
      throw new BindParseError('Invalid numeric value', line);
    }
  }

  if (bind.keys !== null) {
    if (!Array.isArray(bind.keys)) {
      throw new BindParseError('Keys must be array or null', line);
    }
    for (const k of bind.keys) {
      if (typeof k !== 'string') {
        throw new BindParseError(`Invalid key "${k}"`, line);
      }
    }
  }

  if (bind.value !== null && (!bind.keys || bind.keys.length === 0)) {
    throw new BindParseError('Bind with value requires keys', line);
  }
}

function validateBindCommand(bind, line) {
  if (bind.value !== null) {
    throw new BindParseError('bind_command must not have value', line);
  }

  if (!bind.command || typeof bind.command !== 'string') {
    throw new BindParseError('bind_command requires command', line);
  }

  if (!Array.isArray(bind.keys) || bind.keys.length === 0) {
    throw new BindParseError('bind_command requires keys', line);
  }
}

// key conflicts
function createKeysBindMap(fileModel) {
  const map = new Map();

  for (const section of fileModel.sections) {
    const sectionName = section.name ?? '__global__';

    for (const bind of section.binds) {
      if (!bind.keys || bind.keys.length === 0) continue;

      const combo = [...bind.keys].sort().join('+');

      if (!map.has(combo)) {
        map.set(combo, []);
      }

      map.get(combo).push({
        section: sectionName,
        bind: bind,
      });
    }
  }

  return map;
}

function isAllowed(entries, linkedGroups) {
  function _sameCommandAcrossSections() {
    const sections = new Set(entries.map(e => e.section));
    return sections.size > 1;
  }

  function _linkedCommandsAllowed() {
    for (const group of Object.values(linkedGroups)) {

      if (!group.sections.includes(e.section)) return false;

      const allMatch = entries.every(e =>
        group.members.some(m =>
          m.command === e.bind.command &&
          m.negated === e.bind.negated
        )
      );

      if (allMatch && entries.length === group.members.length) {
        return true;
      }
    }
    return false;
  }

  function _sameSectionDuplicates() {
    const sections = new Set(entries.map(e => e.section));
    return sections.size === 1 && entries.length > 1;
  }

  if (!CONFLICT_RULES.allowSameCommandAcrossSections && _sameCommandAcrossSections()) {
    return false;
  }

  if (!CONFLICT_RULES.allowLinkedCommands && _linkedCommandsAllowed()) {
    return false;
  }

  if (!CONFLICT_RULES.allowSameSectionDuplicates && _sameSectionDuplicates()) {
    return false;
  }

  return true;
}

export function findConflicts(fileModel, linkedGroups) {
  const keysMap = createKeysBindMap(fileModel);
  const conflicts = [];

  for (const [combo, entries] of keysMap.entries()) {
    if (entries.length <= 1) continue;
    if (isAllowed(entries, linkedGroups)) continue;

    conflicts.push({
      combo,
      entries,
    });
  }

  return conflicts;
}