import { randomBytes, scrypt } from "node:crypto";

const scryptOptions = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
};

function deriveKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      scryptOptions.dkLen,
      {
        N: scryptOptions.N,
        r: scryptOptions.r,
        p: scryptOptions.p,
        maxmem: 128 * scryptOptions.N * scryptOptions.r * 2,
      },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export async function hashPortalPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPortalPassword(input: {
  hash: string;
  password: string;
}) {
  const [salt, expectedKey] = input.hash.split(":");
  if (!salt || !expectedKey) return false;
  const key = await deriveKey(input.password, salt);
  return key.toString("hex") === expectedKey;
}
