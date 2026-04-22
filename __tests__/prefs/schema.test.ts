import { DEFAULT_PREFERENCES, PREFERENCES_SCHEMA } from '../../src/prefs/schema';

describe('preferences schema', () => {
  it('contains ignoreSysEx defaulting to true', () => {
    expect(PREFERENCES_SCHEMA.ignoreSysEx.default).toBe(true);
    expect(PREFERENCES_SCHEMA.ignoreSysEx.type).toBe('boolean');
  });

  it('contains ignoreSystemRealTime defaulting to true', () => {
    expect(PREFERENCES_SCHEMA.ignoreSystemRealTime.default).toBe(true);
    expect(PREFERENCES_SCHEMA.ignoreSystemRealTime.type).toBe('boolean');
  });

  it('DEFAULT_PREFERENCES matches the schema defaults', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      ignoreSysEx: true,
      ignoreSystemRealTime: true,
    });
  });
});
