export class BindParseError extends Error {
  constructor(message, line) {
    super(message);
    this.name = 'BindParseError';
    this.line = line;
  }
}

export function validateBind(bind, line) {
  if (!bind.command || typeof bind.command !== 'string') {
    console.log(bind);
    throw new BindParseError('Missing or invalid command', line);
  }

  if (bind.type === 'bind_command') {
    if (bind.value !== null) {
      throw new BindParseError('bind_command must not have value', line);
    }
    if (!bind.keys || bind.keys.length === 0) {
      throw new BindParseError('bind_command requires keys', line);
    }
  }

  if (bind.type === 'bind') {
    if (bind.value !== null && !/^[-+]?\d+(\.\d+)?$/.test(bind.value)) {
      throw new BindParseError('Invalid numeric value', line);
    }
  }

  if (bind.keys !== null) {
    if (!Array.isArray(bind.keys)) {
      throw new BindParseError('Keys must be array or null', line);
    }
    for (const k of bind.keys) {
      if (typeof k !== 'string' || !k.length) {
        throw new BindParseError(`Invalid key "${k}"`, line);
      }
    }
  }
}