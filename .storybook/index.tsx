import { view } from './storybook.requires';

const StorybookUIRoot = view.getStorybookUI({
  storage: {
    getItem: async () => null,
    setItem: async () => {
      // no-op: last-selected story persistence is best-effort.
    },
  },
});

export default StorybookUIRoot;
