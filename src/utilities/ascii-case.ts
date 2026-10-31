// Selectors §6.3 and HTML fold ASCII letters only: toLowerCase would also fold U+212A KELVIN SIGN onto k
export function asciiLowerCase(text: string): string {
  return text.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}
