import test from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt } from '../core.mjs';

// Known answers generated with the supplied Node nonseamless ccavutil.js.
// Archive provenance and limits of this verification: ../../KIT_VALIDATION.md.
// This key is synthetic; no merchant keys or vendor source are committed.
test('matches supplied CCAvenue Node kit known answers', () => {
  const key = 'synthetic-working-key-20260924';
  const samples = [
    ['', 'c2645a46cdfce535e5e7293c441812bb'],
    ['merchant_id=12345&order_id=synthetic&currency=INR&amount=1234.00',
      'acc98b66690ba6bf27acf5792864320584b301cfaa5bb934849785c68d123060fa299e9d1d9c4aa5ef8d65d5a1bc952d4be9957d26937e022a37f991e4b77713a4f18de71049728e8c2bf5b7bb38ac98'],
    ['order_id=synthetic&tracking_id=123456&order_status=Success&currency=INR&amount=1234.00',
      '6eb1862f4f2467c0ef10f0312a39289ceeee741a9ad91a74643274ca330de26940e7d08b9d529860b904284dcb9f2f6e7457278d7b16048e7dc62d736233db7bb50335081b83d147014aee542c0601faec03423c5a16d6b7350b8261786529c3'],
    ['Unicode: ₹ नमस्ते & + %',
      'fd8e2e98dfeb81002278d24393a40f86d3f10c8e9415cfb9042720be81155dae802752e4ec1276cd65a2e97ca4a42e3f'],
  ];
  for (const [plain, ciphertext] of samples) {
    assert.equal(encrypt(plain, key), ciphertext);
    assert.equal(decrypt(ciphertext, key), plain);
  }
});
