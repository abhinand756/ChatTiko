// src/api/groupApi.js
import { apiFetch, getApiBase } from "./client";

export const getAllGroups = async () => {
  return await apiFetch(`/api/groups`);
};

export const createGroup = async ({ name, description, members }) => {
  return await apiFetch(`/api/groups`, {
    method: "POST",
    body: JSON.stringify({ name, description, members }),
  });
};

export const getGroup = async (groupId) => {
  return await apiFetch(`/api/groups/${encodeURIComponent(groupId)}`);
};

export const updateGroup = async (groupId, { description, avatar } = {}) => {
  return await apiFetch(`/api/groups/${encodeURIComponent(groupId)}`, {
    method: "PUT",
    body: JSON.stringify({ description, avatar }),
  });
};

export const getGroupMessages = async (groupId, { before, limit } = {}) => {
  const params = new URLSearchParams();
  if (before) params.set("before", before);
  if (limit) params.set("limit", limit);
  const qs = params.toString();
  return await apiFetch(
    `/api/groups/${encodeURIComponent(groupId)}/messages${qs ? `?${qs}` : ""}`,
  );
};

export const addGroupMembers = async (groupId, members) => {
  return await apiFetch(`/api/groups/${encodeURIComponent(groupId)}/members`, {
    method: "POST",
    body: JSON.stringify({ members }),
  });
};

export const removeGroupMember = async (groupId, username) => {
  return await apiFetch(
    `/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(username)}`,
    { method: "DELETE" },
  );
};

export const deleteGroup = async (groupId) => {
  return await apiFetch(`/api/groups/${encodeURIComponent(groupId)}`, {
    method: "DELETE",
  });
};

export const uploadGroupFile = async (groupId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    `${getApiBase()}/api/groups/${encodeURIComponent(groupId)}/upload`,
    {
      method: "POST",
      credentials: "include",
      body: formData,
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || response.statusText);
  }
  return data;
};