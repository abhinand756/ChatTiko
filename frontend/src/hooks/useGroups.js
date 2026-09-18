import { useState, useCallback } from "react";
import {
  getAllGroups,
  createGroup,
  getGroupMessages,
  deleteGroup,
  addGroupMembers,
  removeGroupMember,
  updateGroup,
  uploadGroupFile,
} from "../api/groupApi";

export function useGroups() {
  const [groups, setGroups] = useState([]);

  const loadGroups = useCallback(async () => {
    try {
      const data = await getAllGroups();
      setGroups(data);
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  }, []);

  const createNewGroup = useCallback(async ({ name, description, members }) => {
    const group = await createGroup({ name, description, members });
    await loadGroups();
    return group;
  }, [loadGroups]);

  const removeGroup = useCallback(async (groupId) => {
    await deleteGroup(groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  const addMembers = useCallback(
    async (groupId, members) => {
      const result = await addGroupMembers(groupId, members);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, members: result.members } : g,
        ),
      );
      return result;
    },
    [],
  );

  const removeMember = useCallback(
    async (groupId, username) => {
      const result = await removeGroupMember(groupId, username);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, members: result.members } : g,
        ),
      );
      return result;
    },
    [],
  );

  const editGroup = useCallback(async (groupId, fields) => {
    const updated = await updateGroup(groupId, fields);
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...fields } : g)),
    );
    return updated;
  }, []);

  const fetchGroupMessages = useCallback((groupId, params) => {
    return getGroupMessages(groupId, params);
  }, []);

  const uploadFile = useCallback((groupId, file) => {
    return uploadGroupFile(groupId, file);
  }, []);

  return {
    groups,
    loadGroups,
    createNewGroup,
    removeGroup,
    addMembers,
    removeMember,
    editGroup,
    fetchGroupMessages,
    uploadFile,
  };
}