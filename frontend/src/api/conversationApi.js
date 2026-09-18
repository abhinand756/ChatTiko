import { apiFetch } from "./client";

export const getConversationSettings = async (partnerId, type = "user") => {
  return await apiFetch(
    `/api/conversations/settings?partnerId=${encodeURIComponent(partnerId)}&type=${type}`,
  );
};

export const updateConversationSettings = async (
  partnerId,
  settings,
  type = "user",
) => {
  return await apiFetch(`/api/conversations/settings`, {
    method: "PUT",
    body: JSON.stringify({ partnerId, type, ...settings }),
  });
};

export const clearChat = async (receiverId, type = "user") => {
  return await apiFetch(`/api/conversations/clear`, {
    method: "POST",
    body: JSON.stringify({ receiverId, type }),
  });
};

export const exportChat = async (receiverId, type = "user") => {
  return await apiFetch(
    `/api/conversations/${encodeURIComponent(receiverId)}/export?type=${type}`,
  );
};

export const scheduleMessage = async (receiverId, text, scheduledAt, type) => {
  return await apiFetch(`/api/messages/schedule`, {
    method: "POST",
    body: JSON.stringify({ receiverId, text, scheduledAt, type }),
  });
};