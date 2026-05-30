// @ts-check
export function throwIfSupabaseError(result, fallbackMessage = 'Supabase request failed') {
  if (result && result.error) {
    throw new Error(result.error.message || fallbackMessage);
  }
  return result;
}

export function dataOrThrow(result, fallbackMessage) {
  throwIfSupabaseError(result, fallbackMessage);
  return result && result.data != null ? result.data : null;
}

export function listOrThrow(result, fallbackMessage) {
  const data = dataOrThrow(result, fallbackMessage);
  return Array.isArray(data) ? data : [];
}

export async function runRequired(label, requestPromise, timeoutMs = 12000) {
  const result = await withTimeout(requestPromise, label, timeoutMs);
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data || [];
}

export async function runOptional(label, requestPromise, timeoutMs = 6500, warnings = null) {
  try {
    const result = await withTimeout(requestPromise, label, timeoutMs);
    if (result.error) {
      if (warnings) warnings.push(`${label}: ${result.error.message}`);
      return [];
    }
    return result.data || [];
  } catch (error) {
    if (warnings) warnings.push(`${label}: ${error.message || error}`);
    return [];
  }
}

export async function withTimeout(promise, label, timeoutMs = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: timeout ${Math.round(timeoutMs / 1000)}s`)), timeoutMs))
  ]);
}
