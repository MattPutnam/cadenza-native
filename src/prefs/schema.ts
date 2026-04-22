// Preferences schema — single source of truth for all user-configurable settings.
//
// Adding a new preference: add one entry here. The `Preferences` type, the
// `DEFAULT_PREFERENCES` constant, and the preferences menu UI all derive from
// this schema, so a new entry is strictly additive.

export const PREFERENCES_SCHEMA = {
  ignoreSysEx: {
    default: true as boolean,
    type: 'boolean' as const,
    label: 'Ignore SysEx',
  },
  ignoreSystemRealTime: {
    default: true as boolean,
    type: 'boolean' as const,
    label: 'Ignore System Real-Time',
  },
} as const;

export type PreferenceKey = keyof typeof PREFERENCES_SCHEMA;

/**
 * Concrete preferences shape. Widened from the schema's `default` values so
 * callers can pass either boolean literal — the literal-typing would otherwise
 * force `ignoreSysEx: true` to be rejected against a `false`-typed slot.
 */
export type Preferences = {
  [K in PreferenceKey]: Widen<(typeof PREFERENCES_SCHEMA)[K]['default']>;
};

type Widen<T> = T extends boolean
  ? boolean
  : T extends number
    ? number
    : T extends string
      ? string
      : T;

/** Immutable defaults, computed once from the schema. */
export const DEFAULT_PREFERENCES: Preferences = (() => {
  const out = {} as Preferences;
  (Object.keys(PREFERENCES_SCHEMA) as PreferenceKey[]).forEach((key) => {
    out[key] = PREFERENCES_SCHEMA[key].default as Preferences[typeof key];
  });
  return out;
})();
