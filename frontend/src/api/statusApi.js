import { apiFetch, apiUpload } from "./client";

export const getStatuses = async () => {
  return await apiFetch(`/api/status/all`);
};

export const createStatus = async ({
  text,
  mediaUrl,
  mediaType,
  background,
  fontColor,
}) => {
  return await apiFetch(`/api/status`, {
    method: "POST",
    body: JSON.stringify({ text, mediaUrl, mediaType, background, fontColor }),
  });
};

export const uploadStatusImage = async (file) => {
  return await apiUpload(`/api/status/upload`, file);
};

export const viewStatus = async (id) => {
  return await apiFetch(`/api/status/${id}/view`, { method: "POST" });
};

export const reactStatus = async (id, emoji) => {
  return await apiFetch(`/api/status/${id}/react`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
};

export const deleteStatus = async (id) => {
  return await apiFetch(`/api/status/${id}`, { method: "DELETE" });
};