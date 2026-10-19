import { grants } from './permission';

describe('grants', () => {
  it('matches exact and wildcard permissions', () => {
    expect(grants(['request:read'], 'request:read')).toBe(true);
    expect(grants(['request:*'], 'request:accept')).toBe(true);
    expect(grants(['*:read'], 'history:read')).toBe(true);
    expect(grants(['*:*'], 'member:manage')).toBe(true);
  });

  it('refuses other permissions', () => {
    expect(grants(['request:read'], 'request:accept')).toBe(false);
    expect(grants(['vehicle:*'], 'request:read')).toBe(false);
    expect(grants([], 'request:read')).toBe(false);
  });
});
