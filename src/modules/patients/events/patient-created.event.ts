export const PATIENT_CREATED = 'patient.created';

export class PatientCreatedEvent {
  constructor(
    readonly clinicId: string,
    readonly patientId: string,
  ) {}
}
