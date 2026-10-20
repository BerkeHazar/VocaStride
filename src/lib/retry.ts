let keys: string[] | null = null;

export function setRetryKeys(list: string[] | null) {
  keys = list && list.length ? list : null;
}

export function peekRetryKeys(): string[] | null {
  return keys;
}

export function clearRetryKeys() {
  keys = null;
}
