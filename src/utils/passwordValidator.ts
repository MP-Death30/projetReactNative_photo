export type PasswordValidation = {
  valid: boolean;
  errors: string[];
};

const MIN_LEN = 12;
const upperRe = /[A-Z]/;
const lowerRe = /[a-z]/;
const digitRe = /\d/;
const specialRe = /[@$!%*?&._-]/;

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (!password || password.length < MIN_LEN) {
    errors.push(`Au moins ${MIN_LEN} caractères.`);
  }
  if (!upperRe.test(password)) errors.push("Au moins une majuscule (A-Z).");
  if (!lowerRe.test(password)) errors.push("Au moins une minuscule (a-z).");
  if (!digitRe.test(password)) errors.push("Au moins un chiffre (0-9).");
  if (!specialRe.test(password)) {
    errors.push("Au moins un caractère spécial (@$!%*?&._-).");
  }

  return { valid: errors.length === 0, errors };
}

export function passwordScore(password: string): number {
  let score = 0;
  if (password.length >= MIN_LEN) score++;
  if (upperRe.test(password) && lowerRe.test(password)) score++;
  if (digitRe.test(password)) score++;
  if (specialRe.test(password)) score++;
  return score;
}
