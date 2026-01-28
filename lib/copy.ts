const REPLACEMENTS: Array<{ from: RegExp; to: string }> = [
  {
    from: /Small[-‑–]group, culturally grounded experiences led by local practitioners\./gi,
    to: 'Enjoy a safe, culturally rooted experience led by cultural practitioners.'
  },
  {
    from: /local practitioners/gi,
    to: 'cultural practitioners'
  },
  {
    from: /practicioners/gi,
    to: 'practitioners'
  }
];

export function normalizeCopy(text: string) {
  return REPLACEMENTS.reduce((current, rule) => current.replace(rule.from, rule.to), text);
}
