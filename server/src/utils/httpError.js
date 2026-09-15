export function httpError(status, message, details = {}) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  error.expose = true;
  return error;
}
