import { describe, it, expect, beforeEach } from 'vitest';
import {
  addHomebrew,
  loadHomebrew,
  updateHomebrew,
  removeHomebrew,
  validateHomebrew,
  genId,
} from './homebrew';

beforeEach(() => localStorage.clear());

describe('homebrew store', () => {
  it('adds a character and loads it back', () => {
    addHomebrew({ name: 'My Seer', team: 'townsfolk', ability: 'See things' });
    const list = loadHomebrew();
    expect(list).toHaveLength(1);
    expect(list[0].id).toMatch(/^hb_/);
    expect(list[0].homebrew).toBe(true);
    expect(list[0].edition).toBe('experimental');
    expect(list[0].name).toBe('My Seer');
  });

  it('updates and removes', () => {
    const [created] = addHomebrew({ name: 'A', team: 'minion', ability: 'x' });
    updateHomebrew(created.id, { name: 'B', team: 'demon', ability: 'y' });
    expect(loadHomebrew()[0].name).toBe('B');
    expect(loadHomebrew()[0].team).toBe('demon');
    removeHomebrew(created.id);
    expect(loadHomebrew()).toHaveLength(0);
  });

  it('generates unique ids', () => {
    expect(genId('Seer', new Set(['hb_seer']))).toBe('hb_seer1');
    expect(genId('!!!', new Set())).toBe('hb_role');
  });

  it('validates required fields', () => {
    expect(validateHomebrew({ name: '', team: 'townsfolk', ability: '' })).toHaveLength(2);
    expect(validateHomebrew({ name: 'Ok', team: 'townsfolk', ability: 'does things' })).toHaveLength(0);
  });

  it('returns [] on corrupt storage', () => {
    localStorage.setItem('botc.homebrew', 'not json');
    expect(loadHomebrew()).toEqual([]);
  });
});
