/** Mantém só os dígitos (CNPJ, telefone, CPF...). */
export const onlyDigits = (value: string): string => value.replace(/\D/g, '');
