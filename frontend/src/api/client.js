// src/api/client.js
// Centralized fetch wrapper that adds base URL, credentials, JSON handling, and error handling.

const BASE_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:5005`;

const ABSOLUTE_URL = /^(https?:|data:|blob:|\/\/)/i;

/**
 * Resolve a server-relative media path (e.g. "/uploads/x.jpg") to a full URL.
 */
export const resolveMediaUrl = (path) => {
  if (!path) return "";
  if (ABSOLUTE_URL.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

/**
 * Wrapper around fetch for API calls.
 * @param {string} path - API endpoint path, e.g. `/api/users`.
 * @param {object} [options] - Fetch options (method, headers, body, etc.).
 * @returns {Promise<any>} Parsed JSON response.
 */
export async function apiFetch(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error || response.statusText;
    throw new Error(error);
  }
  return data;
}

/**
 * Upload a file (multipart/form-data) to an authenticated endpoint.
 * @param {string} path - API endpoint path.
 * @param {File} file - The file to upload.
 * @returns {Promise<any>} Parsed JSON response.
 */
export async function apiUpload(path, file) {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error || response.statusText;
    throw new Error(error);
  }
  return data;
}
