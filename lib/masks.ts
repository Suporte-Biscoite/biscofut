/**
 * Máscaras e validações dos campos obrigatórios do briefing
 * (nome completo, CPF, e-mail, telefone).
 *
 * Tudo roda no navegador, só para dar erro imediato em vez de ida e volta ao
 * servidor. A validação que vale é a do backend — ver app/api/meus-numeros.
 */

export function onlyDigits(value: string): string {
  return value.replace(/D/g, "");
}

export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function isValidCPF(value: string): boolean {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const checkDigit = (base: string, factor: number) => {
    let total = 0;
    for (const digit of base) total += Number(digit) * factor--;
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    checkDigit(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    checkDigit(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
}

/** Celular ou fixo, com DDD. */
export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.replace(/^(\d{0,2})/, "($1");
  if (d.length <= 6) return d.replace(/^(\d{2})(\d{0,4})/, "($1) $2");
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

export function isValidPhone(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  // Celular (11 dígitos) sempre começa com 9 depois do DDD.
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value.trim());
}

/** Nome completo = pelo menos dois nomes, sem dígitos. */
export function isValidFullName(value: string): boolean {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 5 || /\d/.test(name)) return false;
  return name.split(" ").filter((part) => part.length >= 2).length >= 2;
}

/** Idade completa na data de referência. */
export function ageOn(birthISO: string, reference: Date): number {
  const birth = new Date(`${birthISO}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return NaN;

  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
