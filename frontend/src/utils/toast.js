let push = null;
let pop = null;
let nextId = 0;

export function registerToastHandlers(pushFn, popFn) {
  push = pushFn;
  pop = popFn;
}

export function showToast(message, variant = "info", duration = 3500) {
  if (!push) return null;
  const id = ++nextId;
  push({ id, message, variant });
  if (duration > 0) setTimeout(() => pop?.(id), duration);
  return id;
}

export function dismissToast(id) {
  pop?.(id);
}
