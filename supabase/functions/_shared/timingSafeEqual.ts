// Comparação de strings em tempo constante (independente de onde ocorre a diferença).
// Ambos os valores são reduzidos a digests SHA-256 (32 bytes fixos), então comprimentos
// diferentes não causam early-return nem vazam informação de tamanho. O resultado final
// combina o XOR acumulado dos digests com a igualdade de comprimento via OR bit a bit.

const encoder = new TextEncoder();

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return new Uint8Array(digest);
}

export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const [digestA, digestB] = await Promise.all([sha256(a), sha256(b)]);

  let diff = digestA.length ^ digestB.length;
  for (let i = 0; i < digestA.length; i++) {
    diff |= digestA[i] ^ (digestB[i] ?? 0);
  }

  // Comprimentos originais diferentes também reprovam (sem desvio condicional antes do fim).
  diff |= a.length ^ b.length;

  return diff === 0;
}
