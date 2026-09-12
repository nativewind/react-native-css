# react-native-css Expo 57 release candidate

Publication draft. The proposed engine is react-native-css 3.1.0-rc.0, paired with Nativewind 5.0.0-rc.0. The packages are not published yet. Nativewind requires this exact engine candidate.

The audited target is Expo 57.0.22, React Native 0.86.3, React 19.2.3, Reanimated 4.5.1 and Worklets 0.10.1. Keep native dependency versions aligned with Expo. Native dependency changes require rebuilding the application.

After publication, install the exact engine and Nativewind pair:

```sh
npm install --save-exact nativewind@5.0.0-rc.0 react-native-css@3.1.0-rc.0
```

The engine source used to prepare the archive is commit 06b7bda3cc04b76c62715e537c371ad16869ec8b. The archive SHA256 is a03235e206ef49e48fb960e59eebea14bbb69e623aa168250d8ccca2ff200072. This documentation commit does not change the audited package contents.

The RC updates Expo integration, Node ESM tooling exports, TypeScript setup, style and prop mappings, variable resolution, compiler behavior, component identities and cache invalidation. Each accepted contract is associated with explicit expected values and deliberately incorrect controls in the compatibility audit. The full library run passed 1434 tests across the two libraries plus 42 engine Node tests. The release verifier passed 670 tests with no skips. The reviewed inventory accounts for 6129 entries and requires 4985 execution cells. All 4985 passed the final release checker, with zero missing assertions. Public source review and a subsequent publication instruction remain necessary before npm release.

Android animation cancellation remains affected by [Reanimated issue 10507](https://github.com/software-mansion/react-native-reanimated/issues/10507), which also reproduces without react-native-css or Nativewind. The exact Android animate-none reset case is retained as an accepted upstream defect and excluded from passing support claims. Its isolated result can pass, so the cancellation behavior remains intermittent. iPhone and browser cancellation and every other motion requirement remain independently verified. No Reanimated patch is bundled. Physical Android verification was waived; a Release emulator and physical iPhone are required. Browser object fitting in the original React Native Web and Expo Image adapters requires explicit component props. Some browser selection, backface and fragmentation examples remain explicitly limited. These are not universal CSS support claims.

Use React Native Appearance and useColorScheme for native dark mode. Appearance.setColorScheme('unspecified') restores the system preference on this Expo target. The full [Nativewind RC compatibility guide](https://github.com/nativewind/nativewind/blob/danstepanov/expo-57-rc-review/docs/rc-compatibility.md) records supported value domains, migration requirements and exact platform limitations. The [installation guide](https://github.com/nativewind/nativewind/blob/danstepanov/expo-57-rc-review/docs/expo57-rc.md) includes Tailwind, PostCSS, Metro and Babel configuration.

Report problems with exact package and Expo versions, platform, build mode, configuration and a minimal reproduction. Include whether a direct React Native or Reanimated reference also fails. The public v4 to v5 migration skill follows RC publication and must be verified against the published packages before stable promotion. Stable npm tags stay unchanged during the RC release.
