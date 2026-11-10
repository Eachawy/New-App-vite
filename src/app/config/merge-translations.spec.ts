import { mergeTranslations } from 'app/config/merge-translations';

describe('mergeTranslations', () => {
  it('deep-merges files that share top-level keys', () => {
    const global = { global: { title: 'Portal' }, error: { 'url.not.found': 'Not found' } };
    const errors = { error: { http: { 404: 'Missing' } } };
    expect(mergeTranslations([global, errors])).toEqual({
      global: { title: 'Portal' },
      error: { 'url.not.found': 'Not found', http: { 404: 'Missing' } },
    });
  });

  it('lets later files win and replaces non-object values', () => {
    expect(mergeTranslations([{ a: { b: 'old', c: 'keep' } }, { a: { b: 'new' } }])).toEqual({ a: { b: 'new', c: 'keep' } });
    expect(mergeTranslations([{ a: 'text' }, { a: { b: 'object' } }])).toEqual({ a: { b: 'object' } });
    expect(mergeTranslations([{ a: ['x'] }, { a: ['y'] }])).toEqual({ a: ['y'] });
  });

  it('does not modify its inputs', () => {
    const first = { a: { b: '1' } };
    mergeTranslations([first, { a: { c: '2' } }]);
    expect(first).toEqual({ a: { b: '1' } });
  });

  it('ignores non-object files', () => {
    expect(mergeTranslations([null, 'text', 1, ['x'], { a: '1' }])).toEqual({ a: '1' });
  });

  it('never pollutes Object.prototype', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}, "a": {"constructor": {"prototype": {"polluted": true}}}}');
    const merged = mergeTranslations([malicious]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(merged).toEqual({ a: {} });
  });
});
