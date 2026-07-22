import assert from "node:assert/strict";
import test from "node:test";
import { decideRequestAccess } from "../../lib/auth/boundary.ts";
import { hashPassword, verifyPassword } from "../../lib/auth/password.ts";
import { authorizeSession, canAccessStore, createAdminSessionToken, verifySessionToken } from "../../lib/auth/session.ts";

const secret = "test-only-session-secret-with-at-least-32-characters";

test("passwords are verified from a salted scrypt hash", () => {
  const encoded = hashPassword("correct-horse", "00112233445566778899aabbccddeeff");
  assert.equal(verifyPassword("correct-horse", encoded), true);
  assert.equal(verifyPassword("wrong-horse", encoded), false);
  assert.equal(encoded.includes("correct-horse"), false);
});

test("signed admin session expires and cannot be tampered with", () => {
  const token = createAdminSessionToken("admin", secret, 1000, 900);
  assert.equal(verifySessionToken(token, secret, 1001)?.role, "admin");
  assert.equal(verifySessionToken(`${token}x`, secret, 1001), null);
  assert.equal(verifySessionToken(token, secret, 1900), null);
});

test("store authorization blocks an unrelated store for non-admin roles", () => {
  const staffSession = {
    userId: "staff-1",
    username: "staff",
    role: "staff",
    storeIds: ["store-a"],
    issuedAt: 1000,
    expiresAt: 2000,
  };
  assert.equal(canAccessStore(staffSession, "store-b"), false);
  assert.deepEqual(authorizeSession(staffSession, { storeId: "store-b" }), {
    ok: false,
    reason: "store_forbidden",
  });
});

test("boundary returns 401 for unauthenticated API and redirects page requests", () => {
  assert.deepEqual(decideRequestAccess("/api/erp/stores", "", null), { action: "unauthorized" });
  assert.deepEqual(decideRequestAccess("/", "?storeId=store-a", null), {
    action: "redirect",
    destination: "/login?next=%2F%3FstoreId%3Dstore-a",
  });
});

test("boundary allows public login and a valid authenticated session", () => {
  const token = createAdminSessionToken("admin", secret);
  const session = verifySessionToken(token, secret);
  assert.deepEqual(decideRequestAccess("/login", "", null), { action: "allow" });
  assert.deepEqual(decideRequestAccess("/store/123/daylist", "", null), { action: "allow" });
  assert.deepEqual(decideRequestAccess("/store/123/info", "", null), { action: "allow" });
  assert.deepEqual(decideRequestAccess("/api/public/stores/123/information", "", null), { action: "allow" });
  assert.deepEqual(decideRequestAccess("/api/erp/stores", "", session), { action: "allow" });
});
