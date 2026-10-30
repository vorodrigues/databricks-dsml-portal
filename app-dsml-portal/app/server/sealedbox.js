// libsodium sealed box (crypto_box_seal), used to encrypt GitHub Actions secrets.
// sealed = ephemeral_pk || crypto_box(message, nonce = BLAKE2b-192(ephemeral_pk || pk), pk, ephemeral_sk)
import nacl from "tweetnacl";
import blake from "blakejs";

// Encrypts `message` (string) for the base64 X25519 public key; returns base64.
export function sealedBox(message, publicKeyBase64) {
  const pk = Buffer.from(publicKeyBase64, "base64");
  const eph = nacl.box.keyPair();
  const nonce = blake.blake2b(Buffer.concat([eph.publicKey, pk]), undefined, nacl.box.nonceLength);
  const box = nacl.box(Buffer.from(message, "utf8"), nonce, pk, eph.secretKey);
  return Buffer.concat([eph.publicKey, box]).toString("base64");
}
