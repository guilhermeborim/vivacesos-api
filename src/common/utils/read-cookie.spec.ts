import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { readCookie } from './read-cookie.js';

const req = (cookie?: string) => ({ headers: { cookie } }) as Request;

describe('readCookie', () => {
  it('lê o cookie pelo nome', () => {
    expect(readCookie(req('a=1; token=abc.def; b=2'), 'token')).toBe('abc.def');
  });
  it('retorna undefined quando ausente ou malformado', () => {
    expect(readCookie(req(), 'token')).toBeUndefined();
    expect(readCookie(req('tokenx=1'), 'token')).toBeUndefined();
    expect(readCookie(req('token=%E0%A4%A'), 'token')).toBeUndefined();
  });
});
