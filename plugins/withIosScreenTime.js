const { withEntitlementsPlist, withXcodeProject } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for iOS Apple Screen Time (Family Controls & Device Activity)
 * 
 * Thêm entitlement `com.apple.developer.family-controls` và liên kết các framework:
 * - FamilyControls.framework
 * - DeviceActivity.framework
 * - ManagedSettings.framework
 */
const withIosScreenTime = (config) => {
  // 1. Thêm Entitlement cho Family Controls
  config = withEntitlementsPlist(config, (modConfig) => {
    modConfig.modResults['com.apple.developer.family-controls'] = true;
    return modConfig;
  });

  // 2. Cấu hình Frameworks trong Xcode Project
  config = withXcodeProject(config, (modConfig) => {
    const xcodeProject = modConfig.modResults;
    const target = xcodeProject.getFirstTarget().uuid;

    // Thêm các framework Screen Time của Apple
    xcodeProject.addFramework('FamilyControls.framework', { target });
    xcodeProject.addFramework('DeviceActivity.framework', { target });
    xcodeProject.addFramework('ManagedSettings.framework', { target });

    return modConfig;
  });

  return config;
};

module.exports = withIosScreenTime;

