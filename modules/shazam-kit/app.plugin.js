const { withInfoPlist, withEntitlementsPlist, withXcodeProject } = require("@expo/config-plugins");

const withShazamKit = (config, props = {}) => {
  const microphonePermission =
    props.microphonePermission ||
    "Allow $(PRODUCT_NAME) to access your microphone to identify songs";

  config = withInfoPlist(config, (config) => {
    config.modResults.NSMicrophoneUsageDescription = microphonePermission;
    return config;
  });

  config = withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.developer.applesignin"] =
      config.modResults["com.apple.developer.applesignin"] || ["Default"];
    return config;
  });

  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    
    const targetName = xcodeProject.getFirstTarget().firstTarget.name;
    const buildConfigurations = xcodeProject.pbxXCBuildConfigurationSection();
    
    for (const key in buildConfigurations) {
      const buildConfig = buildConfigurations[key];
      if (buildConfig.buildSettings) {
        if (!buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET ||
            parseFloat(buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET) < 15.0) {
          buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = "15.0";
        }
      }
    }
    
    return config;
  });

  return config;
};

module.exports = withShazamKit;
