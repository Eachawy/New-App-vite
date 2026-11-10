import { MESSAGE_ALERT_HEADER_NAME, MESSAGE_ERROR_HEADER_NAME, MESSAGE_PARAM_HEADER_NAME } from 'app/shared/jhipster/constants';
import { byteSize, openFile, paddingSize, toBase64, toOpenableContentType } from 'app/shared/jhipster/data-utils';
import { getMessageFromHeaders } from 'app/shared/jhipster/headers';
import { ProblemWithMessageType, isProblemWithMessage } from 'app/shared/jhipster/problem-details';

describe('getMessageFromHeaders', () => {
  it('distinguishes translation keys from plain messages', () => {
    expect(
      getMessageFromHeaders({ [MESSAGE_ALERT_HEADER_NAME]: 'app.entity.created', [MESSAGE_PARAM_HEADER_NAME]: 'a+b%20c' }),
    ).toMatchObject({
      alertKey: 'app.entity.created',
      alertMessage: undefined,
      param: 'a b c',
    });
    expect(getMessageFromHeaders({ [MESSAGE_ERROR_HEADER_NAME]: 'Something failed!' })).toMatchObject({
      errorKey: undefined,
      errorMessage: 'Something failed!',
    });
  });

  it('accepts single-element arrays and rejects ambiguous header values', () => {
    expect(getMessageFromHeaders({ [MESSAGE_ALERT_HEADER_NAME]: ['key.one'] }).alertKey).toBe('key.one');
    expect(() => getMessageFromHeaders({ [MESSAGE_ALERT_HEADER_NAME]: ['a', 'b'] })).toThrow(TypeError);
    expect(() => getMessageFromHeaders({ [MESSAGE_ALERT_HEADER_NAME]: 42 })).toThrow(TypeError);
  });

  it('returns empty fields when no headers are present', () => {
    expect(getMessageFromHeaders({})).toMatchObject({ alert: undefined, error: undefined, param: undefined });
  });
});

describe('problem details', () => {
  it('detects JHipster problem responses', () => {
    expect(isProblemWithMessage({ type: ProblemWithMessageType })).toBe(true);
    expect(isProblemWithMessage({ type: 'about:blank' })).toBe(false);
    expect(isProblemWithMessage(null)).toBe(false);
  });
});

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
