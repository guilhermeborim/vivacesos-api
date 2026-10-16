import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

export interface FieldCryptoOptions {
  /** 32 bytes em UTF-8 ou 64 caracteres hexadecimais (mesmo formato de CRYPTO_SECRET_KEY). */
  secretKey: string;
  /** Isola o campo. Ex.: 'patient:cpf'. Mudar o contexto invalida dados e hashes existentes. */
  context: string;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const VERSION = 'v1';
const ENVELOPE = /^v1\.[a-f0-9]{24}\.[a-f0-9]{32}\.[a-f0-9]*$/;

function parseSecretKey(value: string): Buffer {
  if (!value) {
    throw new Error('CRYPTO_SECRET_KEY não foi configurada.');
  }

  const key = /^[a-f0-9]{64}$/i.test(value)
    ? Buffer.from(value, 'hex')
    : Buffer.from(value, 'utf8');

  if (key.length !== 32) {
    throw new Error(
      'CRYPTO_SECRET_KEY deve conter 32 bytes em UTF-8 ou 64 caracteres hexadecimais.',
    );
  }

  return key;
}

/**
 * Criptografia de um campo sensível.
 * - encrypt/decrypt: AES-256-GCM (autenticado), IV aleatório e contexto como AAD.
 * - hash: HMAC-SHA256 com chave secreta, determinístico para buscas.
 * A chave de cifra e a de hash são derivadas (HKDF) da chave mestra e do contexto,
 * então cada campo usa chaves próprias.
 */
export class FieldCryptoService {
  private readonly encryptionKey: Buffer;
  private readonly hashKey: Buffer;
  private readonly aad: Buffer;

  constructor({ secretKey, context }: FieldCryptoOptions) {
    if (!context) {
      throw new Error('O contexto do campo é obrigatório.');
    }

    const master = parseSecretKey(secretKey);
    const derive = (purpose: string) =>
      Buffer.from(
        hkdfSync(
          'sha256',
          master,
          Buffer.alloc(0),
          `vivace:field:${context}:${purpose}:${VERSION}`,
          32,
        ),
      );

    this.encryptionKey = derive('enc');
    this.hashKey = derive('hash');
    this.aad = Buffer.from(`vivace:field:${context}:${VERSION}`, 'utf8');
  }

  encrypt(text: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv, {
      authTagLength: TAG_LENGTH,
    });
    cipher.setAAD(this.aad);

    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);

    return [
      VERSION,
      iv.toString('hex'),
      cipher.getAuthTag().toString('hex'),
      encrypted.toString('hex'),
    ].join('.');
  }

  decrypt(encryptedText: string): string {
    if (typeof encryptedText !== 'string' || !ENVELOPE.test(encryptedText)) {
      throw new Error('Valor criptografado inválido.');
    }

    const [, ivHex, tagHex, dataHex] = encryptedText.split('.');

    try {
      const decipher = createDecipheriv(
        ALGORITHM,
        this.encryptionKey,
        Buffer.from(ivHex, 'hex'),
        { authTagLength: TAG_LENGTH },
      );
      decipher.setAAD(this.aad);
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

      return Buffer.concat([
        decipher.update(Buffer.from(dataHex, 'hex')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      // Não expõe detalhes de criptografia.
      throw new Error('Não foi possível descriptografar o valor.');
    }
  }

  hash(value: string): string {
    return createHmac('sha256', this.hashKey)
      .update(value, 'utf8')
      .digest('hex');
  }
}
