/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    config: "e2e/jest.config.js",
    testTimeout: 120000,
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath:
        "apps/mobile/ios/build/Build/Products/Debug-iphonesimulator/mobile.app",
      build:
        "cd apps/mobile && xcodebuild -workspace ios/mobile.xcworkspace -scheme mobile -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build -destination 'platform=iOS Simulator,name=iPhone 16'",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone 16",
        os: "iOS 18.1",
      },
    },
  },
  configurations: {
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.debug",
    },
  },
};
