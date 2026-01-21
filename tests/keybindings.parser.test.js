import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  parseKeybindCfg,
  parseBindLine,
  tokenize
} from '../content/modules/keybindings/keybindings.parser.js';


// =======================
// TOKENIZER
// =======================

describe('tokenize()', () => {
  it('parses simple tokens', () => {
    const t = tokenize("cmd_move 'Q'");
    expect(t).toEqual(["cmd_move", "'Q'"]);
  });

  it('parses multi key combo', () => {
    const t = tokenize("cs_toggle_healthbars 'CTRL' + 'L'");
    expect(t).toEqual(["cs_toggle_healthbars", "'CTRL'", "+", "'L'"]);
  });

  it('parses numeric values', () => {
    const t = tokenize("camera_zoom -1.0 'PG_UP'");
    expect(t).toEqual(["camera_zoom", "-1.0", "'PG_UP'"]);
  });

  it('handles empty key', () => {
    const t = tokenize("cmd_action_bar_slot11 ''");
    expect(t).toEqual(["cmd_action_bar_slot11", "''"]);
  });

});


// =======================
// parseBindLine
// =======================

describe('parseBindLine()', () => {

  it('parses simple bind', () => {
    const b = parseBindLine("bind cmd_move 'Q'");
    expect(b.command).toBe("cmd_move");
    expect(b.value).toBe(null);
    expect(b.negated).toBe(false);
    expect(b.keys).toStrictEqual(['Q']);
  });

  it('parses negated bind', () => {
    const b = parseBindLine("bind !self_cast_off 'ALT'");
    expect(b.command).toBe("self_cast_off");
    expect(b.negated).toBe(true);
  });

  it('parses numeric value', () => {
    const b = parseBindLine("bind camera_zoom -1.0 'PG_UP'");
    expect(b.value).toBe("-1.0");
  });

  it('parses empty key', () => {
    const b = parseBindLine("bind cmd_action_bar_slot11 ''");
    expect(b.keys).toBe(null);
  });

  it('parses mouse axis', () => {
    const b = parseBindLine("bind camera_zoom_mouse -0.003 'MOUSE_AXIS_Z'");
    expect(b.command).toBe("camera_zoom_mouse");
    expect(b.value).toBe("-0.003");
  });

  it('parses multiple keys', () => {
    const b = parseBindLine("bind exit_game 'ALT' + 'X'");
    expect(b.type).toBe("bind");
    expect(b.command).toBe("exit_game");
    expect(b.keys).toStrictEqual(['ALT', 'X']);
  });

  it('parses bind_command, simple key', () => {
    const b = parseBindLine("bind_command 'F11' \"toggle_fps\"");
    expect(b.type).toBe("bind_command");
    expect(b.command).toBe("toggle_fps");
    expect(b.keys).toStrictEqual(['F11']);
  });

  it('parses bind_command, combo key', () => {
    const b = parseBindLine("bind_command 'SHIFT' + 'F10' \"screenshot .png\"");
    expect(b.type).toBe("bind_command");
    expect(b.command).toBe("screenshot .png");
    expect(b.keys).toStrictEqual(['SHIFT', 'F10']);
  });

});


// =======================
// parseKeybindCfg
// =======================

describe('parseKeybindCfg()', () => {

  it('creates initial global section', () => {
    const cfg = "bind cmd_move 'Q'";
    const model = parseKeybindCfg(cfg);

    expect(model.sections.length).toBe(1);
    expect(model.sections[0].name).toBe(null);
  });

  it('parses bindsection', () => {
    const cfg = `
bind cmd_move 'Q'
bindsection adventure_screen
bind cmd_attack 'E'
`;

    const model = parseKeybindCfg(cfg);

    expect(model.sections.length).toBe(2);
    expect(model.sections[0].name).toBe(null);
    expect(model.sections[1].name).toBe("adventure_screen");
  });

  it('returns to global section on empty bindsection', () => {
    const cfg = `
bindsection adventure_screen
bind cmd_attack 'E'
bindsection
bind cmd_move 'Q'
`;

    const model = parseKeybindCfg(cfg);

    expect(model.sections[2].name).toBe(null);
  });

  it('keeps order of binds', () => {
    const cfg = `
bind cmd_move 'Q'
bind cmd_attack 'E'
`;

    const model = parseKeybindCfg(cfg);

    expect(model.sections[0].binds[0].command).toBe("cmd_move");
    expect(model.sections[0].binds[1].command).toBe("cmd_attack");
  });

  it('supports repeated commands', () => {
    const cfg = `
bind camera_zoom +1.0 'PG_DOWN'
bind camera_zoom -1.0 'PG_UP'
`;

    const model = parseKeybindCfg(cfg);

    expect(model.sections[0].binds.length).toBe(2);
    expect(model.sections[0].binds[0].command).toBe("camera_zoom");
    expect(model.sections[0].binds[1].command).toBe("camera_zoom");
  });

});


// =======================
// REAL FILE TEST
// =======================

describe('real /content/keybindsFallback.cfg', () => {

  it('parses full real config file without crashing', () => {

    const filePath = path.resolve(__dirname, '../content/keybindsFallback.cfg');
    const cfgText = fs.readFileSync(filePath, 'utf8');

    const model = parseKeybindCfg(cfgText);

    expect(model).toBeDefined();
    expect(model.sections.length).toBeGreaterThan(3);
  });

  it('contains adventure_screen section', () => {

    const filePath = path.resolve(__dirname, '../content/keybindsFallback.cfg');
    const cfgText = fs.readFileSync(filePath, 'utf8');

    const model = parseKeybindCfg(cfgText);

    const adv = model.sections.find(s => s.name === 'adventure_screen');
    expect(adv).toBeDefined();
    expect(adv.binds.length).toBeGreaterThan(10);
    
  });

  it('contains smart chat binds', () => {

    const filePath = path.resolve(__dirname, '../content/keybindsFallback.cfg');
    const cfgText = fs.readFileSync(filePath, 'utf8');

    const model = parseKeybindCfg(cfgText);

    const found = model.sections.some(section =>
      section.binds.some(b => b.command === 'cmd_smart_chat')
    );

    expect(found).toBe(true);
  });

  it('contains negated commands', () => {

    const filePath = path.resolve(__dirname, '../content/keybindsFallback.cfg');
    const cfgText = fs.readFileSync(filePath, 'utf8');

    const model = parseKeybindCfg(cfgText);

    const negatedExists = model.sections.some(section =>
      section.binds.some(b => b.negated === true)
    );

    expect(negatedExists).toBe(true);
  });

  it('contains numeric values', () => {

    const filePath = path.resolve(__dirname, '../content/keybindsFallback.cfg');
    const cfgText = fs.readFileSync(filePath, 'utf8');

    const model = parseKeybindCfg(cfgText);

    const hasValue = model.sections.some(section =>
      section.binds.some(b => b.value !== null)
    );

    expect(hasValue).toBe(true);
  });

  it('contains multi-key binds', () => {

    const filePath = path.resolve(__dirname, '../content/keybindsFallback.cfg');
    const cfgText = fs.readFileSync(filePath, 'utf8');

    const model = parseKeybindCfg(cfgText);

    const multiKeyExists = model.sections.some(section =>
      section.binds.some(b => Array.isArray(b.keys) && b.keys.length > 1)
    );

    expect(multiKeyExists).toBe(true);
  });

  it('contains bind_command entries', () => {

    const filePath = path.resolve(__dirname, '../content/keybindsFallback.cfg');
    const cfgText = fs.readFileSync(filePath, 'utf8');
    
    const model = parseKeybindCfg(cfgText);

    console.log(JSON.stringify(model, null, 2));

    const bindCommandExists = model.sections.some(section =>
      section.binds.some(b => b.type === 'bind_command')
    );

    expect(bindCommandExists).toBe(true);
  });

});
