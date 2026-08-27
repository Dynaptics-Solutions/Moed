/**
 * The device is not here, so the parts of it that are native get stood in for.
 *
 * Only two things are mocked, and both are boundaries rather than behaviour: the safe
 * area (which is a device measurement) and the fonts (which are files). Everything
 * else — the theme, the arithmetic, the components — is the real code, because a test
 * against a mock of your own component tests nothing.
 */
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 44, right: 0, bottom: 34, left: 0 };
  return {
    ...jest.requireActual('react-native-safe-area-context'),
    SafeAreaProvider: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 412, height: 824 }),
  };
});

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: jest.fn(),
}));
