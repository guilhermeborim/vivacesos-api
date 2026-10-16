/**
 * Porta de envio de mensagens ao paciente. Hoje só existe o canal manual (a recepcionista envia
 * pelo WhatsApp); a Z-API entra como outra implementação desta mesma interface, sem mexer em
 * quem compõe a mensagem.
 */
export interface PatientMessageResult {
  /** Foi enviada de verdade por um canal automático. */
  delivered: boolean;
  /** Identificador da mensagem no provedor, quando houver. */
  externalId?: string;
}

export interface PatientMessageChannel {
  /** Canal automático envia sozinho; o manual só devolve o texto para um humano enviar. */
  readonly automatic: boolean;
  send(
    clinicId: string,
    phone: string,
    text: string,
  ): Promise<PatientMessageResult>;
}

export const PATIENT_MESSAGE_CHANNEL = Symbol('PATIENT_MESSAGE_CHANNEL');
