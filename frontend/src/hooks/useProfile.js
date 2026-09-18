import { useState, useCallback, useEffect } from "react";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadCoverImage,
} from "../api/userApi";

export function useProfile(isJoined) {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isJoined) return;
    let active = true;
    getProfile()
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load profile");
      });
    return () => {
      active = false;
    };
  }, [isJoined]);

  const saveProfile = useCallback(
    async (fields) => {
      setSaving(true);
      setError("");
      try {
        const updated = await updateProfile(fields);
        setProfile((prev) => ({ ...prev, ...updated, ...fields }));
        return updated;
      } catch (err) {
        setError(err.message || "Failed to update profile");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const changeAvatar = useCallback(async (file) => {
    setSaving(true);
    setError("");
    try {
      const { avatar } = await uploadAvatar(file);
      setProfile((prev) => ({ ...prev, avatar }));
      return avatar;
    } catch (err) {
      setError(err.message || "Failed to upload avatar");
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const changeCover = useCallback(async (file) => {
    setSaving(true);
    setError("");
    try {
      const { coverImage } = await uploadCoverImage(file);
      setProfile((prev) => ({ ...prev, coverImage }));
      return coverImage;
    } catch (err) {
      setError(err.message || "Failed to upload cover");
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(null);
    setError("");
  }, []);

  return {
    profile,
    saving,
    error,
    saveProfile,
    changeAvatar,
    changeCover,
    resetProfile,
  };
}
