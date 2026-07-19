const test = require('node:test');
const assert = require('node:assert/strict');
const { applyProfileUpdates } = require('../utils/profileUpdate');

test('applyProfileUpdates saves supported profile fields and handles image removal', () => {
  const user = {
    name: 'Old Name',
    email: 'old@example.com',
    phone: '',
    address: '',
    designation: '',
    companyInfo: '',
    username: '',
    biography: '',
    photo: { url: 'https://old.example/a.jpg', publicId: 'old-id' },
  };

  const result = applyProfileUpdates(user, {
    name: 'New Name',
    email: 'new@example.com',
    phone: '+1 234 567 8900',
    address: '123 Main St',
    designation: 'Engineer',
    company: 'Acme Inc',
    biography: 'Builder',
    username: 'new-user',
    removePhoto: true,
  }, { removePhoto: true, photo: null, deleteAsset: async () => {} });

  assert.equal(result.user.name, 'New Name');
  assert.equal(result.user.email, 'new@example.com');
  assert.equal(result.user.phone, '+1 234 567 8900');
  assert.equal(result.user.address, '123 Main St');
  assert.equal(result.user.designation, 'Engineer');
  assert.equal(result.user.companyInfo, 'Acme Inc');
  assert.equal(result.user.username, 'new-user');
  assert.equal(result.user.biography, 'Builder');
  assert.deepEqual(result.user.photo, { url: null, publicId: null });
  assert.equal(result.changedFields.length >= 7, true);
});
