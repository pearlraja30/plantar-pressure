#!/usr/bin/env node
/**
 * CHALLENGER R3: COMPREHENSIVE EMPIRICAL ADVERSARIAL STRESS TEST
 * Target: Requirements R1 and R4 Verification
 * 
 * 1. Wildcard / Arbitrary / Punctuation Voucher Rejection & Gate Enforcement
 * 2. Unauthenticated & Unauthorized Direct Database Table Writes Across All Stores
 * 3. Session Leakage & Invalidation Post-Logout
 * 4. Master Password Consecutive Failure Rate-Limiting & Lockout at Attempt 5
 * 5. 21 CFR Part 11 Clinical Justification Enforcement & Audit Log Attribution
 * 6. Administrator Profile & Password Security Controls
 * 7. Cloud Sync Technician Attribution Stamping & Offline Queueing
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

const mockStorage = new MockLocalStorage();
global.localStorage = mockStorage;
global.navigator = { userAgent: 'Mozilla/5.0 Challenger R3 Agent', onLine: true };

const { dbService, DEFAULT_ADMIN_ACCOUNT } = jiti('../src/services/dbService.ts');
const { getAuditEvents } = jiti('../src/services/auditService.ts');
const { CloudSyncService } = jiti('../src/services/cloudSyncService.ts');

console.log('======================================================================');
console.log('   CHALLENGER R3: EMPIRICAL ADVERSARIAL STRESS TEST (R1 & R4)        ');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;
const failures = [];

async function check(id, name, fn) {
  try {
    await fn();
    passCount++;
    console.log(`  \x1b[32m[PASS]\x1b[0m ${id}: ${name}`);
  } catch (err) {
    failCount++;
    failures.push({ id, name, error: err.message });
    console.log(`  \x1b[31m[FAIL]\x1b[0m ${id}: ${name}`);
    console.log(`         Error: ${err.message}`);
  }
}

async function runChallengerR3() {
  // =========================================================================
  // SUITE 1: Wildcard / Arbitrary / Punctuation Voucher Rejection
  // =========================================================================
  console.log('--- SUITE 1: Wildcard, Punctuation & Malformed Voucher Rejection ---');

  const adversarialVouchers = [
    // Single wildcards & symbols
    '*',
    '?',
    '!',
    '.',
    '#',
    '$',
    '%',
    '^',
    '&',
    '+',
    '=',
    '~',
    '@',
    '/',
    '\\',
    ';',
    ':',
    '|',
    '(',
    ')',
    // Multi-char wildcards & punctuation
    '---',
    '###',
    '$$$',
    '***',
    '???',
    '!...',
    '--?--',
    '##$$',
    // Mixed wildcards with valid-looking prefixes
    'TMH-*',
    'TMH-TECH-*',
    'TMH-TECH-????',
    'TMH-TECH-9999',
    'TMH-TECH-0000',
    'TMH*TECH-1001',
    'TMH?TECH-1001',
    'TMH!TECH-1001',
    'TMH#TECH-1001',
    'TMH$TECH-1001',
    'TMH<TECH>1001',
    'TMH\'TECH\'1001',
    'TMH"TECH"1001',
    'TMH`TECH`1001',
    'TMH TECH 1001',
    'TMH-TECH-',
    'TECH',
    // Injection payloads
    "' OR '1'='1",
    '<script>alert(1)</script>',
    '<svg/onload=alert(1)>',
    'admin\' --',
    '1; DROP TABLE users;',
    // Whitespace & sub-length strings
    '   ',
    '\t\t',
    '\n\r',
    'a',
    'ab',
    'abc',
    '1',
    '12',
    '123',
    '---A---',
    '**99**',
    // Random fabricated voucher
    'RANDOM-VOUCHER-1234',
  ];

  for (const v of adversarialVouchers) {
    const safeKey = encodeURIComponent(v.substring(0, 12));
    await check(`R3-VOUCH-${safeKey}`, `Rejection of voucher "${v}" via registerDeviceWithActivationCode`, async () => {
      mockStorage.clear();
      const res = await dbService.registerDeviceWithActivationCode({
        hospitalCode: 'TMH-CENTRAL',
        activationCode: v,
      });
      assert.strictEqual(res.success, false, `Voucher "${v}" was unexpectedly accepted!`);
      assert.ok(res.error, `Missing error message for rejected voucher "${v}"`);
    });

    // Also verify alias activateStationWithCode behaves identically
    await check(`R3-ALIAS-${safeKey}`, `Rejection of voucher "${v}" via activateStationWithCode alias`, async () => {
      mockStorage.clear();
      const res = await dbService.activateStationWithCode({
        hospitalCode: 'TMH-CENTRAL',
        activationCode: v,
      });
      assert.strictEqual(res.success, false, `Voucher "${v}" was accepted through activateStationWithCode!`);
      assert.ok(res.error);
    });
  }

  // Authentic voucher positive control
  await check('R3-VOUCH-AUTHENTIC-PASS', 'Authentic voucher TMH-TECH-1001 succeeds and binds station', async () => {
    mockStorage.clear();
    const res = await dbService.registerDeviceWithActivationCode({
      hospitalCode: 'TMH-CENTRAL',
      activationCode: 'TMH-TECH-1001',
    });
    assert.strictEqual(res.success, true, `Authentic voucher failed: ${res.error}`);
    assert.ok(res.token, 'Must return authorization token');
    assert.ok(res.technician, 'Must return technician object');
    assert.strictEqual(res.technician.id, 'tech-user-01');
  });

  // Expired voucher test
  await check('R3-VOUCH-EXPIRED-REJECT', 'Expired voucher is rejected with explicit expiration error', async () => {
    mockStorage.clear();
    const expiredTimestamp = new Date(Date.now() - 3600000).toISOString();
    await dbService.saveTechnician({
      id: 'tech-test-expired',
      name: 'Expired Tech',
      username: 'expired.tech@tmh.org',
      hospitalId: 'hosp-001',
      role: 'technician',
      status: 'active',
      activationCode: 'TMH-TECH-EXPD',
      activationCodeExpiresAt: expiredTimestamp,
    });

    const res = await dbService.registerDeviceWithActivationCode({
      hospitalCode: 'TMH-CENTRAL',
      activationCode: 'TMH-TECH-EXPD',
    });
    assert.strictEqual(res.success, false, 'Expired voucher was accepted!');
    assert.match(res.error, /expired/i);
  });

  // =========================================================================
  // SUITE 2: Unauthenticated Database Writes Across All Stores
  // =========================================================================
  console.log('\n--- SUITE 2: Unauthenticated & Unauthorized DB Writes Across All Stores ---');

  const allStores = ['patients', 'cases', 'technicians', 'admin_accounts', 'bound_devices', 'settings'];

  // Test 1: Completely empty session
  for (const store of allStores) {
    await check(`R3-STORE-EMPTY-${store.toUpperCase()}`, `Empty session blocked from updating '${store}'`, async () => {
      mockStorage.clear();
      const res = await dbService.updateRecordAdmin(
        store,
        'malicious-key',
        { injected: true },
        'Valid clinical justification'
      );
      assert.strictEqual(res.success, false, `Unauthenticated write to ${store} succeeded!`);
      assert.match(res.error, /Unauthorized access: No active authenticated session/i);
    });
  }

  // Test 2: Non-admin role (Technician)
  for (const store of allStores) {
    await check(`R3-STORE-TECH-${store.toUpperCase()}`, `Technician role blocked from updating '${store}'`, async () => {
      mockStorage.clear();
      dbService.setActiveUser('technician', 'Jane Field Tech', 'tech-user-01');
      assert.strictEqual(dbService.hasActiveSession(), true);
      assert.strictEqual(dbService.getActiveUserSync().role, 'technician');

      const res = await dbService.updateRecordAdmin(
        store,
        'rec-key',
        { tampered: true },
        'Clinical reason'
      );
      assert.strictEqual(res.success, false, `Technician write to ${store} succeeded!`);
      assert.match(res.error, /Only Hospital Administrators hold write & correction privileges/i);
    });
  }

  // Test 3: Attacker / Corrupted session roles
  const badRoles = ['guest', 'auditor', 'attacker', 'ADMIN', null, 1234, ['admin']];
  for (const badRole of badRoles) {
    await check(`R3-ROLE-SPOOF-${String(badRole)}`, `Spoofed role "${JSON.stringify(badRole)}" blocked`, async () => {
      mockStorage.clear();
      mockStorage.setItem('podopress_active_user_v1', JSON.stringify({ role: badRole, name: 'Intruder' }));
      const res = await dbService.updateRecordAdmin(
        'patients',
        'pat-999',
        { hacked: true },
        'Justification text'
      );
      assert.strictEqual(res.success, false);
      assert.ok(res.error);
    });
  }

  // Test 4: Unsupported stores / Injection keys
  const fakeStores = ['audit_logs', '__proto__', 'constructor', 'secrets', 'passwords'];
  for (const fakeStore of fakeStores) {
    await check(`R3-STORE-UNSUPPORTED-${fakeStore}`, `Unsupported store "${fakeStore}" rejected even by admin`, async () => {
      mockStorage.clear();
      dbService.setActiveUser('admin', 'Admin Superuser');
      const res = await dbService.updateRecordAdmin(
        fakeStore,
        'key-01',
        { injected: true },
        'Clinical justification'
      );
      assert.strictEqual(res.success, false, `Write to unsupported store ${fakeStore} succeeded!`);
      assert.match(res.error, /Unsupported database store/i);
    });
  }

  // =========================================================================
  // SUITE 3: Session Leakage & Invalidation Post-Logout
  // =========================================================================
  console.log('\n--- SUITE 3: Session Leakage & Invalidation Post-Logout ---');

  await check('R3-LOGOUT-ADMIN-PURGE', 'Admin logout purges session, drops admin privileges, blocks writes', async () => {
    mockStorage.clear();
    dbService.setActiveUser('admin', 'Dr. Station Administrator');
    assert.strictEqual(dbService.hasActiveSession(), true);
    assert.strictEqual(dbService.getActiveUserSync().role, 'admin');

    // Simulate active patient & case IDs in safeStorage
    mockStorage.setItem('ppa-selected-patient-id', 'pat-100');
    mockStorage.setItem('ppa-selected-case-id', 'case-200');
    mockStorage.setItem('ppa-active-session', JSON.stringify({ active: true }));

    // Execute logout
    dbService.logoutUser();

    // 1. Verify active session is false
    assert.strictEqual(dbService.hasActiveSession(), false, 'hasActiveSession() must be false after logout');

    // 2. Verify localStorage active user is removed
    assert.strictEqual(mockStorage.getItem('podopress_active_user_v1'), null, 'Active user session key not removed');

    // 3. Verify clinical session markers are purged
    assert.strictEqual(mockStorage.getItem('ppa-selected-patient-id'), null, 'ppa-selected-patient-id not cleared');
    assert.strictEqual(mockStorage.getItem('ppa-selected-case-id'), null, 'ppa-selected-case-id not cleared');
    assert.strictEqual(mockStorage.getItem('ppa-active-session'), null, 'ppa-active-session not cleared');

    // 4. Verify fallback role is NOT admin
    const postLogoutUser = dbService.getActiveUserSync();
    assert.notStrictEqual(postLogoutUser.role, 'admin', 'getActiveUserSync() returned admin after logout!');
    assert.strictEqual(postLogoutUser.role, 'technician', 'Fallback must be unprivileged technician');

    // 5. Verify direct table write fails post-logout
    const writeAttempt = await dbService.updateRecordAdmin(
      'cases',
      'case-200',
      { data: 'malicious' },
      'Post-logout attempt'
    );
    assert.strictEqual(writeAttempt.success, false, 'Admin table write succeeded post-logout!');
    assert.match(writeAttempt.error, /Unauthorized access: No active authenticated session/i);

    // 6. Verify audit event was logged
    const logs = getAuditEvents();
    const logoutEvent = logs.find((l) => l.action === 'USER_LOGOUT');
    assert.ok(logoutEvent, 'USER_LOGOUT audit event not generated');
    assert.strictEqual(logoutEvent.role, 'admin');
  });

  await check('R3-LOGOUT-TECH-PURGE', 'Technician logout purges session and prevents active status', async () => {
    mockStorage.clear();
    dbService.setActiveUser('technician', 'Tech Sarah', 'tech-user-01');
    assert.strictEqual(dbService.hasActiveSession(), true);

    dbService.logoutUser();

    assert.strictEqual(dbService.hasActiveSession(), false);
    assert.strictEqual(mockStorage.getItem('podopress_active_user_v1'), null);
  });

  await check('R3-LOGOUT-IDEMPOTENCY', 'Multiple consecutive logouts do not crash or elevate role', async () => {
    mockStorage.clear();
    for (let i = 0; i < 5; i++) {
      dbService.logoutUser();
      assert.strictEqual(dbService.hasActiveSession(), false);
      assert.notStrictEqual(dbService.getActiveUserSync().role, 'admin');
    }
  });

  // =========================================================================
  // SUITE 4: Master Password Consecutive Failure Rate-Limiting & Lockout
  // =========================================================================
  console.log('\n--- SUITE 4: Master Password Rate-Limiting & Lockout at Attempt 5 ---');

  await check('R4-LOCKOUT-EXACT-5-ATTEMPTS', 'Lockout engages strictly on attempt 5 and blocks correct password', async () => {
    mockStorage.clear();
    const testAdmin = {
      ...DEFAULT_ADMIN_ACCOUNT,
      username: 'admin@technomind.health',
      pin: 'ValidMasterPassword#2026',
    };
    mockStorage.setItem('podopress_admin_account_v1', JSON.stringify(testAdmin));

    // Attempts 1 to 4 must fail without locking out
    for (let attempt = 1; attempt <= 4; attempt++) {
      const res = dbService.authenticateAdmin('admin@technomind.health', `WrongPin${attempt}`);
      assert.strictEqual(res.success, false);
      assert.strictEqual(
        res.error.toLowerCase().includes('locked'),
        false,
        `Attempt ${attempt} should not be locked. Got: ${res.error}`
      );
      assert.strictEqual(
        res.error,
        'Invalid Administrator User ID or Master Password.'
      );
    }

    // Attempt 5 MUST trigger lockout
    const res5 = dbService.authenticateAdmin('admin@technomind.health', 'WrongPin5');
    assert.strictEqual(res5.success, false);
    assert.strictEqual(
      res5.error.toLowerCase().includes('locked'),
      true,
      `Attempt 5 must trigger lockout. Got: ${res5.error}`
    );

    // Persisted lockout state inspection
    const lockoutState = JSON.parse(mockStorage.getItem('podopress_admin_lockout_v1'));
    assert.ok(lockoutState, 'Lockout state not persisted');
    assert.strictEqual(lockoutState.failedAttempts, 5);
    assert.ok(lockoutState.lockedUntil > Date.now(), 'lockedUntil must be in the future');

    // Attempt 6: Valid Master Password during lockout MUST BE REJECTED
    const validAttemptDuringLockout = dbService.authenticateAdmin('admin@technomind.health', 'ValidMasterPassword#2026');
    assert.strictEqual(validAttemptDuringLockout.success, false, 'Correct password authenticated during lockout!');
    assert.strictEqual(
      validAttemptDuringLockout.error.toLowerCase().includes('locked'),
      true,
      `Correct password during lockout must return locked message. Got: ${validAttemptDuringLockout.error}`
    );

    // Advance time past the 15-minute lockout window
    lockoutState.lockedUntil = Date.now() - 5000;
    mockStorage.setItem('podopress_admin_lockout_v1', JSON.stringify(lockoutState));

    // Correct password must now authenticate cleanly and clear lockout
    const validAfterExpiry = dbService.authenticateAdmin('admin@technomind.health', 'ValidMasterPassword#2026');
    assert.strictEqual(validAfterExpiry.success, true, `Authentication after lockout expiry failed: ${validAfterExpiry.error}`);
    assert.strictEqual(mockStorage.getItem('podopress_admin_lockout_v1'), null, 'Lockout state not cleared after valid login');
  });

  await check('R4-LOCKOUT-RESET-ON-INTERMEDIATE-SUCCESS', 'Intermediate successful login resets failure counter to 0', async () => {
    mockStorage.clear();
    const testAdmin = {
      ...DEFAULT_ADMIN_ACCOUNT,
      username: 'admin@technomind.health',
      pin: 'SecretKey#123',
    };
    mockStorage.setItem('podopress_admin_account_v1', JSON.stringify(testAdmin));

    // Fail 3 times
    for (let i = 1; i <= 3; i++) {
      const res = dbService.authenticateAdmin('admin@technomind.health', `Wrong${i}`);
      assert.strictEqual(res.success, false);
    }
    let st = JSON.parse(mockStorage.getItem('podopress_admin_lockout_v1'));
    assert.strictEqual(st.failedAttempts, 3);

    // Successful login on attempt 4
    const validRes = dbService.authenticateAdmin('admin@technomind.health', 'SecretKey#123');
    assert.strictEqual(validRes.success, true);
    assert.strictEqual(mockStorage.getItem('podopress_admin_lockout_v1'), null, 'Lockout key should be purged on success');

    // Next failure must start from attempt 1, NOT attempt 4
    const nextFail = dbService.authenticateAdmin('admin@technomind.health', 'WrongAgain');
    assert.strictEqual(nextFail.success, false);
    st = JSON.parse(mockStorage.getItem('podopress_admin_lockout_v1'));
    assert.strictEqual(st.failedAttempts, 1, 'Failure counter did not reset after successful login');
  });

  await check('R4-LOCKOUT-CORRUPTED-STORAGE-SAFETY', 'Corrupted lockout storage does not crash authenticateAdmin', async () => {
    mockStorage.clear();
    mockStorage.setItem('podopress_admin_lockout_v1', 'not-valid-json{{{');
    const res = dbService.authenticateAdmin('admin@technomind.health', 'wrong');
    assert.strictEqual(res.success, false);
    assert.ok(res.error);
  });

  // =========================================================================
  // SUITE 5: 21 CFR Part 11 Justification Requirement for Admin Modifications
  // =========================================================================
  console.log('\n--- SUITE 5: 21 CFR Part 11 Clinical Justification Enforcement ---');

  await check('R5-CFR-EMPTY-REJECT', 'Direct table write with empty justification is rejected', async () => {
    mockStorage.clear();
    dbService.setActiveUser('admin', 'Admin Superuser');
    const res = await dbService.updateRecordAdmin('patients', 'pat-01', { name: 'Amended' }, '');
    assert.strictEqual(res.success, false, 'Empty justification was accepted!');
    assert.match(res.error, /clinical reason or justification/i);
  });

  await check('R5-CFR-WHITESPACE-REJECT', 'Direct table write with whitespace-only justification is rejected', async () => {
    mockStorage.clear();
    dbService.setActiveUser('admin', 'Admin Superuser');
    const res = await dbService.updateRecordAdmin('patients', 'pat-01', { name: 'Amended' }, '    \t\n  ');
    assert.strictEqual(res.success, false, 'Whitespace justification was accepted!');
    assert.match(res.error, /clinical reason or justification/i);
  });

  await check('R5-CFR-NULL-UNDEFINED-REJECT', 'Direct table write with null/undefined justification is rejected safely', async () => {
    mockStorage.clear();
    dbService.setActiveUser('admin', 'Admin Superuser');
    const resNull = await dbService.updateRecordAdmin('patients', 'pat-01', { name: 'Amended' }, null);
    assert.strictEqual(resNull.success, false);
    assert.match(resNull.error, /clinical reason or justification/i);

    const resUndef = await dbService.updateRecordAdmin('patients', 'pat-01', { name: 'Amended' }, undefined);
    assert.strictEqual(resUndef.success, false);
    assert.match(resUndef.error, /clinical reason or justification/i);
  });

  await check('R5-CFR-TECH-WITH-REASON-REJECT', 'Technician with valid justification is STILL rejected (role check precedes)', async () => {
    mockStorage.clear();
    dbService.setActiveUser('technician', 'Jane Tech', 'tech-user-01');
    const res = await dbService.updateRecordAdmin(
      'cases',
      'case-01',
      { status: 'corrected' },
      'Clinical justification: Patient ID mistyped in clinic chart'
    );
    assert.strictEqual(res.success, false);
    assert.match(res.error, /Only Hospital Administrators hold write & correction privileges/i);
  });

  // Verify successful modification produces 21 CFR Part 11 audit trail across all stores
  for (const store of allStores) {
    await check(`R5-CFR-AUDIT-LOG-${store.toUpperCase()}`, `Valid administrative correction on '${store}' logs 21 CFR 11 audit event`, async () => {
      mockStorage.clear();
      dbService.setActiveUser('admin', 'Dr. Audit Admin');

      const justification = `21 CFR Part 11 correction: Hospital database maintenance for store "${store}".`;
      const res = await dbService.updateRecordAdmin(
        store,
        `test-id-${store}`,
        { field: `corrected-value-${store}` },
        justification
      );

      assert.strictEqual(res.success, true, `Admin update to ${store} failed: ${res.error}`);

      const logs = getAuditEvents();
      const auditEntry = logs.find(
        (l) => l.action === 'RECORD_ADMIN_CORRECTED' && l.details.includes(store) && l.details.includes(`test-id-${store}`)
      );
      assert.ok(auditEntry, `No audit entry found for store ${store}`);
      assert.strictEqual(auditEntry.role, 'admin');
      assert.strictEqual(auditEntry.severity, 'security');
      assert.ok(auditEntry.details.includes(justification));
      assert.ok(auditEntry.timestamp);
    });
  }

  // =========================================================================
  // SUITE 6: Administrator Profile & Master Password Security Controls
  // =========================================================================
  console.log('\n--- SUITE 6: Administrator Profile & Master Password Controls ---');

  await check('R6-ADMIN-PROFILE-UPDATE', 'Admin profile updates persist and produce audit event', async () => {
    mockStorage.clear();
    const updated = dbService.updateAdminProfile({
      username: 'dr.director@technomind.org',
      name: 'Dr. Clinical Director',
      phone: '+1 555 4321',
      email: 'dr.director@technomind.org',
      recoveryKey: 'REC-DIR-2026',
    });

    assert.strictEqual(updated.username, 'dr.director@technomind.org');
    assert.strictEqual(updated.name, 'Dr. Clinical Director');
    assert.strictEqual(updated.phone, '+1 555 4321');
    assert.strictEqual(updated.email, 'dr.director@technomind.org');
    assert.strictEqual(updated.recoveryKey, 'REC-DIR-2026');

    // Confirm persisted in storage
    const stored = dbService.getAdminAccountSync();
    assert.strictEqual(stored.username, 'dr.director@technomind.org');

    // Confirm audit log
    const logs = getAuditEvents();
    const profileLog = logs.find((l) => l.action === 'ADMIN_PROFILE_UPDATED');
    assert.ok(profileLog, 'ADMIN_PROFILE_UPDATED log missing');
    assert.strictEqual(profileLog.role, 'admin');
  });

  await check('R6-ADMIN-PASSWORD-UPDATE-CHECKS', 'Master Password update enforces current pin, min length, non-identity', async () => {
    mockStorage.clear();
    const admin = { ...DEFAULT_ADMIN_ACCOUNT, pin: 'CurrentSecret123' };
    mockStorage.setItem('podopress_admin_account_v1', JSON.stringify(admin));

    // Wrong current password
    const resWrong = dbService.updateAdminMasterPassword('IncorrectCurrent', 'BrandNewPin456');
    assert.strictEqual(resWrong.success, false);
    assert.match(resWrong.error, /Incorrect current Master Password/i);

    // Empty new password
    const resEmpty = dbService.updateAdminMasterPassword('CurrentSecret123', '');
    assert.strictEqual(resEmpty.success, false);
    assert.match(resEmpty.error, /at least 4 characters/i);

    // Sub-4 length new password
    const resShort = dbService.updateAdminMasterPassword('CurrentSecret123', '123');
    assert.strictEqual(resShort.success, false);
    assert.match(resShort.error, /at least 4 characters/i);

    // Identical new password
    const resIdentical = dbService.updateAdminMasterPassword('CurrentSecret123', 'CurrentSecret123');
    assert.strictEqual(resIdentical.success, false);
    assert.match(resIdentical.error, /cannot be identical/i);

    // Valid password update
    const resValid = dbService.updateAdminMasterPassword('CurrentSecret123', 'BrandNewPin456');
    assert.strictEqual(resValid.success, true);
    assert.strictEqual(dbService.getAdminAccountSync().pin, 'BrandNewPin456');

    // Audit log check
    const logs = getAuditEvents();
    const pwLog = logs.find((l) => l.action === 'ADMIN_PASSWORD_UPDATED');
    assert.ok(pwLog, 'ADMIN_PASSWORD_UPDATED audit event missing');
  });

  await check('R6-ADMIN-PASSWORD-RECOVERY', 'Password recovery via Recovery Key succeeds and updates password', async () => {
    mockStorage.clear();
    const admin = {
      ...DEFAULT_ADMIN_ACCOUNT,
      username: 'admin@technomind.health',
      recoveryKey: 'REC-TMH-9901',
      pin: 'OldForgottenPin',
    };
    mockStorage.setItem('podopress_admin_account_v1', JSON.stringify(admin));

    // Invalid recovery key
    const resInvalidKey = dbService.recoverAdminPassword('admin@technomind.health', 'WRONG-KEY', 'NewMasterPin999');
    assert.strictEqual(resInvalidKey.success, false);
    assert.match(resInvalidKey.error, /Verification failed/i);

    // Valid recovery key
    const resValidRecovery = dbService.recoverAdminPassword('admin@technomind.health', 'REC-TMH-9901', 'NewMasterPin999');
    assert.strictEqual(resValidRecovery.success, true);
    assert.strictEqual(dbService.getAdminAccountSync().pin, 'NewMasterPin999');
  });

  // =========================================================================
  // SUITE 7: Cloud Sync Technician Attribution & Offline Queueing
  // =========================================================================
  console.log('\n--- SUITE 7: Cloud Sync Attribution & Offline Queueing ---');

  await check('R7-SYNC-ATTRIBUTION-OFFLINE-QUEUE', 'Cloud sync offline queue stamps technicianId, hospitalId, caseNumber', async () => {
    mockStorage.clear();
    const cloudService = CloudSyncService.getInstance();
    cloudService.setOnlineStatus(false);

    const testCase = {
      id: 'case-sync-99',
      caseNumber: 'PPA-2026-99',
      technicianId: 'tech-sarah-07',
      technicianName: 'Tech. Sarah Connor',
      hospitalId: 'hosp-apex-01',
      status: 'completed',
    };

    const res = await cloudService.syncCase(testCase);
    assert.strictEqual(res.success, false, 'Sync should fail when offline');

    const detailedQueue = cloudService.getDetailedQueue();
    const entry = detailedQueue.find((q) => q.caseId === 'case-sync-99');
    assert.ok(entry, 'Case not found in detailed offline sync queue');
    assert.strictEqual(entry.technicianId, 'tech-sarah-07');
    assert.strictEqual(entry.technicianName, 'Tech. Sarah Connor');
    assert.strictEqual(entry.hospitalId, 'hosp-apex-01');
    assert.strictEqual(entry.caseNumber, 'PPA-2026-99');
    assert.strictEqual(entry.status, 'pending');

    // Audit log check
    const logs = getAuditEvents();
    const queueLog = logs.find((l) => l.action === 'CLOUD_SYNC_QUEUED_OFFLINE' && l.caseId === 'case-sync-99');
    assert.ok(queueLog, 'CLOUD_SYNC_QUEUED_OFFLINE audit event missing');
    assert.ok(queueLog.details.includes('Tech. Sarah Connor'));
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n======================================================================');
  console.log(`CHALLENGER R3 VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} CHECKS`);
  console.log('======================================================================\n');

  if (failCount > 0) {
    console.error('FAILURES DETECTED:');
    for (const f of failures) {
      console.error(`  - ${f.id}: ${f.name} -> ${f.error}`);
    }
    process.exit(1);
  }
}

runChallengerR3().catch((err) => {
  console.error('Fatal Oracle error:', err);
  process.exit(2);
});
