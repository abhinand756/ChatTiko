// src/api/messageApi.js
import { apiFetch, getApiBase } from "./client";

export const searchMessages = async (receiverId, query) => {
  return await apiFetch(
    `/api/messages/search/${encodeURIComponent(receiverId)}?q=${encodeURIComponent(query)}`,
  );
};

export const getStarredMessages = async () => {
  return await apiFetch(`/api/messages/starred`);
};

export const toggleStar = async (messageId) => {
  return await apiFetch(`/api/messages/${messageId}/star`, { method: "POST" });
};

export const togglePin = async (messageId) => {
  return await apiFetch(`/api/messages/${messageId}/pin`, { method: "POST" });
};

export const uploadMessageFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const BASE = getApiBase();
  const response = await fetch(`${BASE}/api/messages/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || response.statusText);
  }
  return data;
};