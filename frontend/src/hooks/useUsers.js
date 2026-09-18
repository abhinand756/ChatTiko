import { useState, useCallback } from "react";
import {
  getAllUsers,
  unfriendUser,
  sendConnectionRequest,
  acceptRequest,
  declineRequest,
} from "../api/userApi";

export function useUsers(refreshCallback) {
  const [allUsers, setAllUsers] = useState([]);

  const loadUsers = useCallback(async () => {
    try {
      const users = await getAllUsers();
      setAllUsers(users);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadUsers();
    if (refreshCallback) refreshCallback();
  }, [loadUsers, refreshCallback]);

  const sendRequest = useCallback(async (receiverId) => {
    await sendConnectionRequest(receiverId);
    await refresh();
  }, [refresh]);

  const accept = useCallback(async (requestId) => {
    await acceptRequest(requestId);
    await refresh();
  }, [refresh]);

  const decline = useCallback(async (requestId) => {
    await declineRequest(requestId);
    await refresh();
  }, [refresh]);

  const unfriend = useCallback(async (username) => {
    await unfriendUser(username);
    await refresh();
  }, [refresh]);

  return { allUsers, loadUsers, refresh, sendRequest, accept, decline, unfriend };
}
