import { Injectable } from '@nestjs/common';
import type {
  PatientMessageChannel,
  PatientMessageResult,
} from './patient-message-channel.js';

/** Sem automação: nada é enviado; a tela abre o WhatsApp com a mensagem pronta. */
@Injectable()
export class ManualChannel implements PatientMessageChannel {
  readonly automatic = false;

  send(): Promise<PatientMessageResult> {
    return Promise.resolve({ delivered: false });
  }
}
