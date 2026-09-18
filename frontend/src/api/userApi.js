// src/api/userApi.js
import { apiFetch, apiUpload } from "./client";

export const getCurrentUser = async () => {
  return await apiFetch(`/api/me`);
};

export const getAllUsers = async () => {
  return await apiFetch(`/api/users`);
};

export const getProfile = async () => {
  return await apiFetch(`/api/profile`);
};

export const updateProfile = async ({ displayName, status, location } = {}) => {
  return await apiFetch(`/api/profile`, {
    method: "PUT",
    body: JSON.stringify({ displayName, status, location }),
  });
};

export const uploadAvatar = async (file) => {
  return await apiUpload(`/api/profile/avatar`, file);
};

export const uploadCoverImage = async (file) => {
  return await apiUpload(`/api/profile/cover`, file);
};

export const changePassword = async (currentPassword, newPassword) => {
  return await apiFetch(`/api/profile/password`, {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
};

export const updatePreferences = async (prefs) => {
  return await apiFetch(`/api/profile/preferences`, {
    method: "PUT",
    body: JSON.stringify(prefs),
  });
};

export const unfriendUser = async (username) => {
  return await apiFetch(`/api/users/${username}/unfriend`, { method: "POST" });
};

export const sendConnectionRequest = async (receiverId) => {
  return await apiFetch(`/api/requests`, {
    method: "POST",
    body: JSON.stringify({ receiverId }),
  });
};

export const acceptRequest = async (requestId) => {
  return await apiFetch(`/api/requests/${requestId}/accept`, { method: "POST" });
};

export const declineRequest = async (requestId) => {
  return await apiFetch(`/api/requests/${requestId}/reject`, { method: "POST" });
};

export const blockUser = async (username) => {
  return await apiFetch(`/api/users/${username}/block`, { method: "POST" });
};

export const unblockUser = async (username) => {
  return await apiFetch(`/api/users/${username}/unblock`, { method: "POST" });
};

export const getBlockedUsers = async () => {
  return await apiFetch(`/api/users/blocked`);
};

export const getCallLogs = async () => {
  return await apiFetch(`/api/calls`);
};

export const clearCallLogs = async () => {
  return await apiFetch(`/api/calls/clear`, { method: "DELETE" });
};