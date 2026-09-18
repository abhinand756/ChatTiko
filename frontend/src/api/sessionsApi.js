import { apiFetch } from "./client";

export const getSessions = async () => {
  return await apiFetch(`/api/sessions`);
};

export const revokeSession = async (id) => {
  return await apiFetch(`/api/sessions/${id}/revoke`, { method: "POST" });
};

export const logoutOtherSessions = async () => {
  return await apiFetch(`/api/sessions/logoutothers`, { method: "POST" });
};

export const setupTwoStep = async (pin) => {
  return await apiFetch(`/api/twostep/setup`, {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
};

export const disableTwoStep = async (pin) => {
  return await apiFetch(`/api/twostep/disable`, {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
};

export const verifyTwoStep = async (pin) => {
  return await apiFetch(`/api/twostep/verify`, {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
};