import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import appConfig from '../config/app.config.js';
import { FieldCryptoService } from './field-crypto.js';

@Injectable()
export class CryptoService {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  /** Cria o serviço de um campo sensível. Ex.: `forField('patient:cpf')`. */
  forField(context: string): FieldCryptoService {
    return new FieldCryptoService({
      secretKey: this.config.cryptoSecretKey,
      context,
    });
  }
}
