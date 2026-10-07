/**
 * Unit tests for shared guards. No server or database needed:
 *   node --test test/unit.core.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isAlwaysAllowedRequest } from '../src/core/admin/adminFeatures.js';
import errorHandler from '../src/middleware/errorHandler.js';

const run = (err) => {
  const out = {};
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  errorHandler(err, { method: 'GET', originalUrl: '/t' }, res, () => {});
  return out;
};

test('sub-admins may read always-allowed paths but not write through them', () => {
  assert.equal(isAlwaysAllowedRequest('GET', '/business-settings'), true);
  assert.equal(isAlwaysAllowedRequest('PATCH', '/business-settings'), false);
  assert.equal(isAlwaysAllowedRequest('PATCH', '/customization-settings'), false);
  assert.equal(isAlwaysAllowedRequest('POST', '/notifications/broadcast'), false);
  assert.equal(isAlwaysAllowedRequest('POST', '/notifications/send'), false);
  assert.equal(isAlwaysAllowedRequest('POST', '/common/app-modules'), false);
  assert.equal(isAlwaysAllowedRequest('POST', '/orders'), false);
});

test('sub-admins keep their self-service writes', () => {
  assert.equal(isAlwaysAllowedRequest('PUT', '/notifications/read-all'), true);
  assert.equal(isAlwaysAllowedRequest('PUT', '/notifications/abc123/read'), true);
  assert.equal(isAlwaysAllowedRequest('DELETE', '/notifications'), true);
  assert.equal(isAlwaysAllowedRequest('PUT', '/fcm-token'), true);
  assert.equal(isAlwaysAllowedRequest('PATCH', '/profile'), true);
  assert.equal(isAlwaysAllowedRequest('POST', '/upload-image'), true);
});

test('error handler hides driver/runtime internals but keeps our own messages', () => {
  const cast = run(Object.assign(new Error('Cast to ObjectId failed for value "x" at path "_id" for model "FoodOrder"'), { name: 'CastError' }));
  assert.equal(cast.status, 400);
  assert.doesNotMatch(cast.body.error, /FoodOrder|ObjectId/);

  const dup = run(Object.assign(new Error('E11000 duplicate key error collection: x index: phone_1'), { name: 'MongoServerError', code: 11000 }));
  assert.equal(dup.status, 409);
  assert.doesNotMatch(dup.body.error, /E11000|index/);

  const type = run(new TypeError("Cannot read properties of undefined (reading 'x')"));
  assert.equal(type.status, 500);
  assert.equal(type.body.error, 'Server Error');

  const ours = run(Object.assign(new Error('Restaurant is closed'), { statusCode: 409 }));
  assert.deepEqual([ours.status, ours.body.error], [409, 'Restaurant is closed']);

  const badStatus = run(Object.assign(new Error('x'), { status: 'failed' }));
  assert.equal(badStatus.status, 500);
});
