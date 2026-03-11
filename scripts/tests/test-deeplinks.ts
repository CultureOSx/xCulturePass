/**
 * CulturePass Deep Link Testing Suite
 * Validates Universal Links (iOS) and App Links (Android) configuration.
 */

const TEST_ROUTES = [
  'https://culturepass.app/',
  'https://culturepass.app/event/CP-EVT-101',
  'https://culturepass.app/community/c1',
  'culturepass://event/CP-EVT-101',
];

console.log('🧪 Starting Deep Link configuration check...');



function verifyAppJson() {
  console.log('\n--- 2. App.json Verification ---');
  const appJson = require('../../app.json');
  
  if (appJson.expo.scheme !== 'culturepass') {
    throw new Error('❌ Missing scheme "culturepass" in app.json');
  }
  console.log('✅ Custom Scheme verified (culturepass://)');

  const iosDomains = appJson.expo.ios.associatedDomains || [];
  if (!iosDomains.includes('applinks:culturepass.app')) {
    throw new Error('❌ Missing applinks:culturepass.app in iOS associatedDomains');
  }
  console.log('✅ iOS Universal Links verified (associatedDomains)');

  const androidIntents = appJson.expo.android.intentFilters || [];
  const hasAppLinks = androidIntents.some((intent: any) => {
    return intent.data?.some((data: any) => data.host === 'culturepass.app' && data.scheme === 'https');
  });
  
  if (!hasAppLinks) {
    throw new Error('❌ Missing https://culturepass.app intent filter for Android');
  }
  console.log('✅ Android App Links verified (intentFilters)');
}

try {
  verifyAppJson();
  console.log('\n✨ All Deep Link configurations are correct and validated.');
} catch (error) {
  console.error(error);
  process.exit(1);
}
