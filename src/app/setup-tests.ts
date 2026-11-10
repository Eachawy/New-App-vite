Object.assign(globalThis as any, {
  IS_REACT_ACT_ENVIRONMENT: true,
  SERVER_API_URL: '',
  DEVELOPMENT: false,
});

if (!(globalThis as any)._virtualConsole) {
  (globalThis as any)._virtualConsole = { emit: () => false };
}
