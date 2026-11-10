import { byteSize, openFile, paddingSize, toBase64, toOpenableContentType } from 'app/shared/util/data-utils';

describe('data utils', () => {
  it('computes base64 padding and byte size', () => {
    expect(paddingSize('AA==')).toBe(2);
    expect(paddingSize('AAA=')).toBe(1);
    expect(paddingSize('AAAA')).toBe(0);
    expect(byteSize('AAAA')).toBe('3 bytes');
  });

  it('never opens XML-based content inline', () => {
    expect(toOpenableContentType('image/svg+xml', 'image')).toBe('application/octet-stream');
    expect(toOpenableContentType('image/png; charset=binary', 'image')).toBe('image/png');
    expect(toOpenableContentType('text/plain', 'text')).toBe('text/plain');
    expect(toOpenableContentType('text/html', 'text')).toBe('application/octet-stream');
    expect(toOpenableContentType(undefined)).toBe('application/octet-stream');
  });

  it('opens decoded files through an object URL', () => {
    const win = {} as Window;
    const openSpy = vi.spyOn(globalThis, 'open').mockReturnValue(win);
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    openFile(btoa('hi'), 'text/plain', 'text');

    expect(createSpy).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith('blob:x');
    (win.onload as () => void)();
    expect(revokeSpy).toHaveBeenCalledWith('blob:x');
    vi.restoreAllMocks();
  });

  it('reads a file as base64', async () => {
    const data = await new Promise<string>(resolve => toBase64(new File(['hi'], 'a.txt', { type: 'text/plain' }), resolve));
    expect(data).toBe(btoa('hi'));
  });
});
