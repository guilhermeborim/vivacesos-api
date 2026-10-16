/** Esconde todos os dígitos do CPF, exceto os dois últimos. */
export function maskCpf(cpf: string): string {
  if (cpf.length !== 11) return cpf;
  return `***.***.***-${cpf.slice(-2)}`;
}
