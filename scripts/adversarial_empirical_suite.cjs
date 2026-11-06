#!/usr/bin/env node
/**
 * EMPIRICAL ADVERSARIAL STRESS-TEST SUITE
 * Technomind Healthcare Plantar Pressure Analysis System (PodoPress / PodoLoad v1.0.56)
 * 
 * Challenger: teamwork_challenger_1
 * Scope: Authentication, Kiosk Lockdown, Database Access Control, 21 CFR Part 11 Enforcement (R1 & R4)
 */

const { createJiti } = require('jiti');
const path = require('path');

// Initialize jiti to load TypeScript modules directly
const jiti = createJiti(path.resolve(__dirname, 'dummy.js'));

// Mock browser globals for realistic runtime execution
global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};

class MockLocalStorage {
  constructor() {
    this._store = {};
  }
  getItem(k) {
    return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null;
  }
  setItem(k, v) {
    this._store[k] = String(v);
  }
  removeItem(k) {
    delete this._store[k];
  }
  clear() {
    this._store = {};
  }
}

global.localStorage = new MockLocalStorage();
global.navigator = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', onLine: true };

// Load application services directly
const { dbService, DEFAULT_ADMIN_ACCOUNT } = jiti('../src/services/dbService.ts');
const { deviceBindingService } = jiti('../src/services/deviceBindingService.ts');
const { getAuditEvents } = jiti('../src/services/auditService.ts');

console.log('======================================================================');
console.log('   EMPIRICAL ADVERSARIAL STRESS-TEST SUITE: AUTH, KIOSK & 21 CFR 11   ');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const findings = [];

function runTest(testId, description, fn) {
  totalTests++;
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      throw new Error(`Test ${testId} returned a Promise. Use runAsyncTest.`);
    }
    passedTests++;
    console.log(`  \x1b[32m[PASS]\x1b[0m ${testId}: ${description}`);
  } catch (err) {
    failedTests++;
    console.log(`  \x1b[31m[FAIL / VULNERABILITY FOUND]\x1b[0m ${testId}: ${description}`);
    console.log(`         Error: ${err.message}`);
    findings.push({ testId, description, error: err.message });
  }
}

async function runAsyncTest(testId, description, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  \x1b[32m[PASS]\x1b[0m ${testId}: ${description}`);
  } catch (err) {
    failedTests++;
    console.log(`  \x1b[31m[FAIL / VULNERABILITY FOUND]\x1b[0m ${testId}: ${description}`);
    console.log(`         Error: ${err.message}`);
    findings.push({ testId, description, error: err.message });
  }
}

async function runAllAdversarialTests() {
  console.log('--- SECTION 1: Unauthenticated Database Access & Role Escalation ---');

  // Test 1.1: Brand-new unauthenticated station calling getActiveUserSync()
  runTest('ADV-AUTH-01', 'Unauthenticated station must not default to administrator session', () => {
    localStorage.clear();
    const activeUser = dbService.getActiveUserSync();
    if (activeUser.role === 'admin') {
      throw new Error(
        `CRITICAL PRIVILEGE ESCALATION: getActiveUserSync() returns role 'admin' for unauthenticated/uninitialized station (Username: ${activeUser.username}). Fallback grants default root admin!`
      );
    }
  });

  // Test 1.2: Unauthenticated direct database table write
  await runAsyncTest('ADV-AUTH-02', 'Unauthenticated user must be rejected from updateRecordAdmin', async () => {
    localStorage.clear();
    const res = await dbService.updateRecordAdmin('settings', 'app_settings', { hacked: true }, 'Clinical update test');
    if (res.success) {
      throw new Error(
        `CRITICAL VULNERABILITY: Unauthenticated caller successfully wrote to database settings table without logging in! Success: true.`
      );
    }
  });

  // Test 1.3: Technician role attempting direct table write
  await runAsyncTest('ADV-AUTH-03', 'Technician role must be rejected from direct database table correction', async () => {
    localStorage.clear();
    dbService.setActiveUser('technician', 'Test Technician', 'tech-001', 'hosp-001', 'Test Hospital');
    const res = await dbService.updateRecordAdmin('patients', 'pat-001', { name: 'Compromised Patient' }, 'Valid justification string');
    if (res.success) {
      throw new Error('Technician was permitted to write directly to patients database table!');
    }
    if (!res.error || !res.error.includes('Only Hospital Administrators')) {
      throw new Error(`Unexpected error message: ${res.error}`);
    }
  });

  console.log('\n--- SECTION 2: Station Session Leakage & handleLogout() ---');

  // Test 2.1: Post-logout active user escalation
  runTest('ADV-SES-01', 'Session state after handleLogout() must not elevate to administrator', () => {
    localStorage.clear();
    // User logs in as technician
    dbService.setActiveUser('technician', 'Floor Tech', 'tech-999');
    const techUser = dbService.getActiveUserSync();
    if (techUser.role !== 'technician') {
      throw new Error('Setup failed: active user is not technician');
    }

    // Technician clicks logout
    dbService.logoutUser();

    // Inspect user role after logout
    const postLogoutUser = dbService.getActiveUserSync();
    if (postLogoutUser.role === 'admin') {
      throw new Error(
        `SESSION STATE INVERSION: After logoutUser(), getActiveUserSync() escalated from technician to admin! (Default fallback leaks administrator privileges).`
      );
    }
  });

  // Test 2.2: Post-logout database table write attempt
  await runAsyncTest('ADV-SES-02', 'Logged-out user must not retain administrative database write privileges', async () => {
    localStorage.clear();
    dbService.setActiveUser('technician', 'Shift Tech', 'tech-555');
    dbService.logoutUser();

    const writeRes = await dbService.updateRecordAdmin('settings', 'app_settings', { tampered: true }, 'Post-logout modification attempt');
    if (writeRes.success) {
      throw new Error(
        `CRITICAL PRIVILEGE ESCALATION: Post-logout station successfully executed updateRecordAdmin! Session purge failed to revoke db write access.`
      );
    }
  });

  // Test 2.3: Verification of hasActiveSession() vs getActiveUserSync() discrepancy
  runTest('ADV-SES-03', 'hasActiveSession() must be consistent with getActiveUserSync()', () => {
    localStorage.clear();
    const hasSession = dbService.hasActiveSession();
    const user = dbService.getActiveUserSync();

    if (!hasSession && user && user.role === 'admin') {
      throw new Error(
        `LOGICAL DISCREPANCY: hasActiveSession() is false, but getActiveUserSync() returns active admin user ${user.username}. Internal service components checking getActiveUserSync() believe user is authenticated admin while UI thinks session is locked!`
      );
    }
  });

  console.log('\n--- SECTION 3: 21 CFR Part 11 Clinical Justification Enforcement ---');

  // Setup admin session for justification tests
  dbService.setActiveUser('admin', 'Dr. Specialist', undefined, 'hosp-001', 'Technomind Healthcare Systems');

  // Test 3.1: Empty justification string
  await runAsyncTest('ADV-CFR-01', 'Direct table write with empty justification string must be rejected', async () => {
    const res = await dbService.updateRecordAdmin('patients', 'pat-test-01', { name: 'John Doe' }, '');
    if (res.success) {
      throw new Error('Direct table write succeeded with empty justification string!');
    }
    if (!res.error || !res.error.toLowerCase().includes('justification')) {
      throw new Error(`Expected error containing 'justification', received: ${res.error}`);
    }
  });

  // Test 3.2: Whitespace-only justification string (spaces, tabs, newlines)
  await runAsyncTest('ADV-CFR-02', 'Direct table write with whitespace-only justification string must be rejected', async () => {
    const whitespaceStrings = ['   ', '\t\t', '\n\r\n', '   \t  \n  '];
    for (const ws of whitespaceStrings) {
      const res = await dbService.updateRecordAdmin('patients', 'pat-test-01', { name: 'John Doe' }, ws);
      if (res.success) {
        throw new Error(`Direct table write succeeded with whitespace-only justification: JSON.stringify(${JSON.stringify(ws)})!`);
      }
    }
  });

  // Test 3.3: Null or undefined justification parameter
  await runAsyncTest('ADV-CFR-03', 'Direct table write with null/undefined justification must not crash and be rejected', async () => {
    const resNull = await dbService.updateRecordAdmin('patients', 'pat-test-01', { name: 'John Doe' }, null);
    if (resNull.success) {
      throw new Error('Direct table write succeeded with null justification!');
    }
    const resUndef = await dbService.updateRecordAdmin('patients', 'pat-test-01', { name: 'John Doe' }, undefined);
    if (resUndef.success) {
      throw new Error('Direct table write succeeded with undefined justification!');
    }
  });

  // Test 3.4: Valid justification string produces mandatory 21 CFR 11 audit event
  await runAsyncTest('ADV-CFR-04', 'Valid administrative correction produces 21 CFR 11 audit event with reason and attribution', async () => {
    const initialEvents = getAuditEvents();
    const reason = 'Correction of typographical error in patient record per Dr. Specialist clinical order';
    const res = await dbService.updateRecordAdmin('patients', 'pat-test-01', { name: 'Jane Doe', phone: '+1 555 0199' }, reason);
    if (!res.success) {
      throw new Error(`Valid update failed: ${res.error}`);
    }

    const updatedEvents = getAuditEvents();
    const matching = updatedEvents.find((e) => e.action === 'RECORD_ADMIN_CORRECTED' && e.details.includes(reason));
    if (!matching) {
      throw new Error('21 CFR 11 audit event RECORD_ADMIN_CORRECTED was not found in audit trail!');
    }
    if (!matching.details.includes('pat-test-01') || !matching.details.includes('patients')) {
      throw new Error(`Audit event missing key or store attribution: ${matching.details}`);
    }
  });

  console.log('\n--- SECTION 4: Voucher Code Expiration, Rotation & Cryptographic Binding ---');

  // Test 4.1: Voucher generation adherence
  runTest('ADV-VCH-01', 'Voucher generation complies with prefix and timing format', () => {
    const policy = { duration: 2, unit: 'hours', autoRotateOnExpiry: true };
    const timed = dbService.generateTimedActivationCode('TMH', policy);
    if (!timed.code.startsWith('TMH-TECH-')) {
      throw new Error(`Unexpected voucher format: ${timed.code}`);
    }
    const expTime = new Date(timed.expiresAt).getTime();
    const genTime = new Date(timed.generatedAt).getTime();
    const diffHours = (expTime - genTime) / (60 * 60 * 1000);
    if (Math.abs(diffHours - 2) > 0.05) {
      throw new Error(`Expected 2 hour expiration, got diffHours=${diffHours}`);
    }
  });

  // Test 4.2: Activation with expired voucher must be rejected
  await runAsyncTest('ADV-VCH-02', 'Station activation with expired voucher must be rejected', async () => {
    localStorage.clear();
    // Register technician with expired voucher
    const expiredTimestamp = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3 hours ago
    const techUser = {
      id: 'tech-test-exp',
      name: 'Dr. Test Tech',
      username: 'tech.test',
      pin: '1234',
      hospitalId: 'hosp-001',
      hospitalName: 'Technomind Healthcare Systems',
      role: 'technician',
      status: 'active',
      activationCode: 'TMH-TECH-8899',
      activationCodeExpiresAt: expiredTimestamp,
    };
    await dbService.saveTechnician(techUser);

    const actResult = await dbService.registerDeviceWithActivationCode({
      hospitalCode: 'TMH-CENTRAL',
      activationCode: 'TMH-TECH-8899',
    });

    if (actResult.success) {
      throw new Error(`Expired voucher TMH-TECH-8899 was accepted for device activation! Result: ${JSON.stringify(actResult)}`);
    }
    if (!actResult.error || !actResult.error.toLowerCase().includes('expired')) {
      throw new Error(`Expected expiration error, got: ${actResult.error}`);
    }
  });

  // Test 4.3: Auto-rotation of expired voucher
  runTest('ADV-VCH-03', 'getOrRotateTechnicianActivationCode auto-rotates expired voucher', () => {
    const expiredTimestamp = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    const techUser = {
      id: 'tech-test-rotate',
      name: 'Rotate Tech',
      username: 'tech.rotate',
      pin: '1234',
      hospitalId: 'hosp-001',
      activationCode: 'TMH-TECH-1122',
      activationCodeExpiresAt: expiredTimestamp,
      status: 'active',
      role: 'technician',
    };
    dbService.saveTechnician(techUser);

    const res = dbService.getOrRotateTechnicianActivationCode('tech-test-rotate');
    if (!res.isRotated) {
      throw new Error(`Expected isRotated to be true for expired code, got false.`);
    }
    if (res.code === 'TMH-TECH-1122') {
      throw new Error(`Code was not rotated to a new code: ${res.code}`);
    }
  });

  // Test 4.4: Adversarial pattern voucher spoofing
  await runAsyncTest('ADV-VCH-04', 'Fabricated/Unissued voucher code matching pattern must not grant access', async () => {
    localStorage.clear();
    // Try activation with a completely unissued, fabricated voucher code
    const fakeVoucher = 'TMH-TECH-9999';
    const res = await dbService.registerDeviceWithActivationCode({
      hospitalCode: 'TMH-CENTRAL',
      activationCode: fakeVoucher,
    });

    if (res.success) {
      throw new Error(
        `VOUCHER CRYPTOGRAPHIC SPOOFING: Arbitrary unissued voucher ${fakeVoucher} was successfully accepted by registerDeviceWithActivationCode! Pattern matching fallback creates dynamic technician without administrator cryptographic pre-authorization!`
      );
    }
  });

  console.log('\n--- SECTION 5: Single-Device Binding & Master Password Lockout ---');

  // Test 5.1: Single-device binding restriction (Station 1 succeeds, Station 2 rejected)
  runTest('ADV-DEV-01', 'Single-device binding restricts simultaneous second device access', () => {
    localStorage.clear();
    // Device 1 binds
    deviceBindingService.bindCurrentDevice('Station 1 Primary Lab');
    const auth1 = deviceBindingService.checkDeviceAuthorization();
    if (!auth1.authorized) {
      throw new Error('Device 1 should be authorized after binding');
    }

    // Simulate Device 2 with different device ID
    const dev2Service = new (deviceBindingService.constructor)();
    dev2Service.cachedDeviceId = 'DEV-FAKE-DEVICE2';

    const auth2 = dev2Service.checkDeviceAuthorization();
    if (auth2.authorized || auth2.canAutoBind) {
      throw new Error(`Device 2 was not blocked by single-device limit! reason: ${auth2.reason}`);
    }
    if (auth2.reason !== 'DEVICE_LIMIT_EXCEEDED') {
      throw new Error(`Expected DEVICE_LIMIT_EXCEEDED, got: ${auth2.reason}`);
    }
  });

  // Test 5.2: Multi-device license seat upgrade allows second device
  runTest('ADV-DEV-02', 'License upgrade (payment provision) expands device seats correctly', () => {
    // Current license is 1 device
    const res = deviceBindingService.upgradeLicense('dual', {
      method: 'Credit Card (ending 4242)',
      amount: 49.0,
    });
    if (!res.success || res.license.maxAllowedDevices !== 2) {
      throw new Error(`License upgrade failed: ${JSON.stringify(res)}`);
    }

    // Now Device 2 checks
    const dev2Service = new (deviceBindingService.constructor)();
    dev2Service.cachedDeviceId = 'DEV-FAKE-DEVICE2';
    const auth2 = dev2Service.checkDeviceAuthorization();
    if (!auth2.canAutoBind) {
      throw new Error(`Device 2 should be able to auto-bind after seat expansion, but reason: ${auth2.reason}`);
    }
  });

  // Test 5.3: Master Password brute force & lockout test
  runTest('ADV-PWD-01', 'Master Password must enforce rate limiting / lockout on consecutive failures', () => {
    localStorage.clear();
    const adminAcc = {
      ...DEFAULT_ADMIN_ACCOUNT,
      pin: 'CorrectMasterPin99',
    };
    localStorage.setItem('podopress_admin_account_v1', JSON.stringify(adminAcc));

    let lockoutTriggered = false;
    const maxAttempts = 25;

    for (let i = 1; i <= maxAttempts; i++) {
      const res = dbService.authenticateAdmin('admin@technomind.health', `WrongPin${i}`);
      if (res.error && res.error.toLowerCase().includes('locked')) {
        lockoutTriggered = true;
        break;
      }
    }

    if (!lockoutTriggered) {
      throw new Error(
        `LACK OF BRUTE-FORCE LOCKOUT: Executed ${maxAttempts} consecutive failed master password attempts with zero rate limiting or lockout! System allows unbounded offline/online credential brute forcing.`
      );
    }
  });

  console.log('\n======================================================================');
  console.log(`STRESS TEST SUMMARY: ${passedTests} PASSED, ${failedTests} VULNERABILITIES FOUND out of ${totalTests} TESTS`);
  console.log('======================================================================\n');

  return { totalTests, passedTests, failedTests, findings };
}

runAllAdversarialTests().then((summary) => {
  if (summary.failedTests > 0) {
    console.log(`EMPERICAL CHALLENGE COMPLETE: ${summary.failedTests} security vulnerabilities / non-conformances identified.`);
    process.exit(1);
  } else {
    console.log('EMPERICAL CHALLENGE COMPLETE: All adversarial security stress tests passed.');
    process.exit(0);
  }
}).catch((err) => {
  console.error('Fatal test harness execution error:', err);
  process.exit(2);
});
