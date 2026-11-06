#!/usr/bin/env node
/**
 * EMPIRICAL CHALLENGER R2 ADVERSARIAL ORACLE & STRESS HARNESS
 * Specifically stress-testing:
 * 1. Unauthenticated database writes are blocked across all tables & roles
 * 2. Logout does not leak or escalate privileges
 * 3. Wildcard / arbitrary voucher codes are strictly rejected
 * 4. Brute-force Master Password attempts trigger lockout on exactly the 5th failure
 *    and block even the correct password during lockout window
 */

const { createJiti } = require('jiti');
const path = require('path');
const assert = require('assert');

const jiti = createJiti(path.resolve(__dirname, 'dummy.js'));

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
global.navigator = { userAgent: 'Mozilla/5.0 Challenger Agent', onLine: true };

const { dbService, DEFAULT_ADMIN_ACCOUNT } = jiti('../src/services/dbService.ts');
const { getAuditEvents } = jiti('../src/services/auditService.ts');

console.log('======================================================================');
console.log('   CHALLENGER R2: INDEPENDENT EMPIRICAL ADVERSARIAL VERIFICATION     ');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;

async function check(id, name, fn) {
  try {
    await fn();
    passCount++;
    console.log(`  \x1b[32m[PASS]\x1b[0m ${id}: ${name}`);
  } catch (err) {
    failCount++;
    console.log(`  \x1b[31m[FAIL]\x1b[0m ${id}: ${name}`);
    console.log(`         Error: ${err.message}`);
  }
}

async function runOracle() {
  // =========================================================================
  // REQUIREMENT 1: Unauthenticated Database Writes are Blocked
  // =========================================================================
  console.log('--- SUITE 1: Unauthenticated & Unauthorized Database Writes ---');

  const targetStores = ['patients', 'cases', 'technicians', 'admin_accounts', 'bound_devices', 'settings'];

  for (const store of targetStores) {
    await check(`R1-STORE-${store.toUpperCase()}`, `Unauthenticated write to '${store}' is blocked`, async () => {
      localStorage.clear();
      const res = await dbService.updateRecordAdmin(
        store,
        'malicious-key',
        { injected: true },
        'Valid looking clinical reason'
      );
      assert.strictEqual(res.success, false, `Unauthenticated write to ${store} succeeded!`);
      assert.match(res.error, /Unauthorized access: No active authenticated session/i);
    });
  }

  await check('R1-CORRUPTED-SESSION', 'Corrupted session role is blocked from updateRecordAdmin', async () => {
    localStorage.clear();
    localStorage.setItem('podopress_active_user_v1', JSON.stringify({ role: 'attacker', name: 'Intruder' }));
    const res = await dbService.updateRecordAdmin(
      'patients',
      'pat-01',
      { hacked: true },
      'Clinical justification'
    );
    assert.strictEqual(res.success, false, 'Attacker role write succeeded!');
    assert.match(res.error, /Unauthorized access: No active authenticated session/i);
  });

  await check('R1-TECHNICIAN-DENIED', 'Active Technician session is rejected from updateRecordAdmin', async () => {
    localStorage.clear();
    dbService.setActiveUser('technician', 'Jane Technician', 'tech-44');
    const res = await dbService.updateRecordAdmin(
      'settings',
      'app_settings',
      { tampered: true },
      'Routine calibration'
    );
    assert.strictEqual(res.success, false, 'Technician was able to update settings!');
    assert.match(res.error, /Only Hospital Administrators/i);
  });

  // =========================================================================
  // REQUIREMENT 2: Logout Does Not Leak or Escalate Privileges
  // =========================================================================
  console.log('\n--- SUITE 2: Logout Session Invalidation & Privilege De-escalation ---');

  await check('R2-LOGOUT-ADMIN', 'Logging out from admin cleans session and drops privileges', async () => {
    localStorage.clear();
    dbService.setActiveUser('admin', 'Admin Superuser');
    assert.strictEqual(dbService.hasActiveSession(), true, 'Precondition: admin active session');
    assert.strictEqual(dbService.getActiveUserSync().role, 'admin', 'Precondition: role is admin');

    dbService.logoutUser();

    assert.strictEqual(dbService.hasActiveSession(), false, 'hasActiveSession() must be false after logout');
    const postUser = dbService.getActiveUserSync();
    assert.notStrictEqual(postUser.role, 'admin', 'Logout escalated or leaked admin role in fallback!');
    assert.strictEqual(postUser.role, 'technician', 'Fallback should be unprivileged technician');

    // Confirm that admin write fails immediately after logout
    const writeRes = await dbService.updateRecordAdmin(
      'cases',
      'case-01',
      { modified: true },
      'Post logout edit'
    );
    assert.strictEqual(writeRes.success, false, 'Write succeeded after admin logout!');
  });

  await check('R2-LOGOUT-TECH', 'Logging out from technician cleanly clears session', async () => {
    localStorage.clear();
    dbService.setActiveUser('technician', 'Field Tech', 'tech-88');
    assert.strictEqual(dbService.hasActiveSession(), true);

    dbService.logoutUser();

    assert.strictEqual(dbService.hasActiveSession(), false);
    assert.strictEqual(localStorage.getItem('podopress_active_user_v1'), null);
  });

  await check('R2-DOUBLE-LOGOUT', 'Repeated logout calls are idempotent and do not crash or elevate', async () => {
    localStorage.clear();
    dbService.logoutUser();
    dbService.logoutUser();
    assert.strictEqual(dbService.hasActiveSession(), false);
    assert.notStrictEqual(dbService.getActiveUserSync().role, 'admin');
  });

  // =========================================================================
  // REQUIREMENT 3: Wildcard / Arbitrary Voucher Codes Are Rejected
  // =========================================================================
  console.log('\n--- SUITE 3: Wildcard & Arbitrary Voucher Rejection ---');

  const adversarialVouchers = [
    '*',
    '?',
    '!',
    '.',
    '---',
    '###',
    '$$$',
    'TMH-*',
    'TMH-TECH-*',
    'TMH-TECH-????',
    'TMH-TECH-9999',
    'TMH-TECH-0000',
    'RANDOM-VOUCHER-1234',
    "' OR '1'='1",
    '<script>alert(1)</script>',
    '   ',
    'TMH-TECH-',
    'TECH',
  ];

  for (const v of adversarialVouchers) {
    await check(`R3-VOUCHER-${encodeURIComponent(v.substring(0, 10))}`, `Arbitrary/wildcard voucher "${v}" is rejected`, async () => {
      localStorage.clear();
      const res = await dbService.registerDeviceWithActivationCode({
        hospitalCode: 'TMH-CENTRAL',
        activationCode: v,
      });
      assert.strictEqual(res.success, false, `Voucher "${v}" was accepted!`);
      assert.ok(res.error, `Missing error for voucher "${v}"`);
    });
  }

  await check('R3-EXPIRED-VOUCHER', 'Explicitly expired voucher is rejected', async () => {
    localStorage.clear();
    const expiredTimestamp = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    await dbService.saveTechnician({
      id: 'tech-expired-99',
      name: 'Expired Tech',
      username: 'expired.tech',
      hospitalId: 'hosp-001',
      role: 'technician',
      status: 'active',
      activationCode: 'TMH-TECH-EXPIRED',
      activationCodeExpiresAt: expiredTimestamp,
    });

    const res = await dbService.registerDeviceWithActivationCode({
      hospitalCode: 'TMH-CENTRAL',
      activationCode: 'TMH-TECH-EXPIRED',
    });
    assert.strictEqual(res.success, false, 'Expired voucher was accepted!');
    assert.match(res.error, /expired/i);
  });

  // =========================================================================
  // REQUIREMENT 4: Brute-Force Master Password Lockout on 5 Failures
  // =========================================================================
  console.log('\n--- SUITE 4: Master Password Lockout on Exactly 5 Failures ---');

  await check('R4-BRUTE-FORCE-LOCKOUT', 'Consecutive failed logins lock account at attempt 5 and reject correct password', async () => {
    localStorage.clear();
    const testAdmin = {
      ...DEFAULT_ADMIN_ACCOUNT,
      username: 'admin@technomind.health',
      pin: 'CorrectSuperSecretMasterPin!2026',
    };
    localStorage.setItem('podopress_admin_account_v1', JSON.stringify(testAdmin));

    // Attempts 1 to 4 should fail with standard error, NOT locked
    for (let attempt = 1; attempt <= 4; attempt++) {
      const res = dbService.authenticateAdmin('admin@technomind.health', `WrongPassword#${attempt}`);
      assert.strictEqual(res.success, false, `Attempt ${attempt} should fail`);
      assert.strictEqual(
        res.error.includes('locked'),
        false,
        `Attempt ${attempt} should not be locked yet (lockout occurs after 5 failures). Got: ${res.error}`
      );
    }

    // Attempt 5 should trigger lockout
    const res5 = dbService.authenticateAdmin('admin@technomind.health', 'WrongPassword#5');
    assert.strictEqual(res5.success, false, 'Attempt 5 should fail');
    assert.strictEqual(
      res5.error.toLowerCase().includes('locked'),
      true,
      `Attempt 5 must trigger lockout! Got: ${res5.error}`
    );

    // Attempt 6: Even with the CORRECT password, authentication MUST BE REJECTED during lockout!
    const resCorrectDuringLockout = dbService.authenticateAdmin('admin@technomind.health', 'CorrectSuperSecretMasterPin!2026');
    assert.strictEqual(
      resCorrectDuringLockout.success,
      false,
      'Authentication with correct password succeeded while account should be locked out!'
    );
    assert.strictEqual(
      resCorrectDuringLockout.error.toLowerCase().includes('locked'),
      true,
      `Correct password attempt during lockout must return locked error! Got: ${resCorrectDuringLockout.error}`
    );

    // Verify lockout state in localStorage
    const savedLockout = JSON.parse(localStorage.getItem('podopress_admin_lockout_v1'));
    assert.ok(savedLockout, 'Lockout state must be persisted in storage');
    assert.strictEqual(savedLockout.failedAttempts, 5);
    assert.ok(savedLockout.lockedUntil > Date.now(), 'lockedUntil must be in the future');

    // Advance time past the 15-minute lockout window
    savedLockout.lockedUntil = Date.now() - 1000; // 1 second in the past
    localStorage.setItem('podopress_admin_lockout_v1', JSON.stringify(savedLockout));

    // Now correct password MUST succeed and reset lockout!
    const resAfterExpiry = dbService.authenticateAdmin('admin@technomind.health', 'CorrectSuperSecretMasterPin!2026');
    assert.strictEqual(resAfterExpiry.success, true, `Login after lockout expiry failed: ${resAfterExpiry.error}`);
    assert.strictEqual(localStorage.getItem('podopress_admin_lockout_v1'), null, 'Successful login must clear lockout state');
  });

  console.log('\n======================================================================');
  console.log(`ORACLE EXECUTION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runOracle().catch((err) => {
  console.error('Fatal Oracle error:', err);
  process.exit(2);
});
