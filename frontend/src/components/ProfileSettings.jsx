import { useEffect, useRef, useState } from "react";
import { X, User, Palette, Lock, Camera, Eye, EyeOff } from "lucide-react";
import { fetchApi, BASE_URL } from "../lib/api";
import { ACCENT_OPTIONS, applyTheme, getUserPreferences, THEME_OPTIONS } from "../lib/theme";

const getAvatarUrl = (avatar, name) => {
  if (avatar) {
    if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
    return `${BASE_URL}${avatar}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}`;
};

export default function ProfileSettings({ user, onClose, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    name: user.name || "",
    gender: user.gender || "boy",
    statusMessage: user.statusMessage || "",
    theme: getUserPreferences(user).theme,
    accentColor: getUserPreferences(user).accentColor,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(getAvatarUrl(user.avatar, user.name));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    applyTheme(formData.theme, formData.accentColor);
  }, [formData.theme, formData.accentColor]);

  const handleClose = () => {
    const prefs = getUserPreferences(user);
    applyTheme(prefs.theme, prefs.accentColor);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (activeTab === "security" && formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError("New passwords do not match");
        return;
      }
      if (formData.newPassword.length < 6) {
        setError("New password must be at least 6 characters");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("name", formData.name.trim());
      payload.append("gender", formData.gender);
      payload.append("statusMessage", formData.statusMessage.trim());
      payload.append("theme", formData.theme);
      payload.append("accentColor", formData.accentColor);

      if (avatarFile) payload.append("avatar", avatarFile);

      if (activeTab === "security" && formData.newPassword) {
        payload.append("currentPassword", formData.currentPassword);
        payload.append("newPassword", formData.newPassword);
      }

      const data = await fetchApi("/api/auth/me", {
        method: "PUT",
        body: payload,
      });

      onUserUpdate(data.user);
      setSuccess("Profile updated successfully");
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setAvatarFile(null);
      if (data.user.avatar) {
        setAvatarPreview(getAvatarUrl(data.user.avatar, data.user.name));
      }
      
      // Auto-close after a short delay so user can see success message
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message);
      const prefs = getUserPreferences(user);
      applyTheme(prefs.theme, prefs.accentColor);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "personalization", label: "Personalization", icon: Palette },
    { id: "security", label: "Security", icon: Lock },
  ];

  return (
    <div className="profile-settings-overlay" onClick={handleClose}>
      <div
        className="profile-settings-modal glass"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Profile Settings"
      >
        <div className="profile-settings-header">
          <h2>Profile Settings</h2>
          <button className="profile-settings-close" onClick={handleClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="profile-settings-tabs">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`profile-settings-tab ${activeTab === id ? "active" : ""}`}
              onClick={() => {
                setActiveTab(id);
                setError("");
                setSuccess("");
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="profile-settings-body">
          {error && <div className="profile-settings-alert error">{error}</div>}
          {success && <div className="profile-settings-alert success">{success}</div>}

          {activeTab === "profile" && (
            <div className="profile-settings-section">
              <div className="profile-avatar-edit">
                <img src={avatarPreview} alt="Avatar preview" className="profile-avatar-preview" />
                <button
                  type="button"
                  className="profile-avatar-change-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={16} />
                  Change Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" value={user.email} disabled />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select
                  className="form-control"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="boy">Boy</option>
                  <option value="girl">Girl</option>
                </select>
              </div>

              <div className="form-group">
                <label>Status Message</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="What's on your mind?"
                  maxLength={120}
                  value={formData.statusMessage}
                  onChange={(e) => setFormData({ ...formData, statusMessage: e.target.value })}
                />
                <span className="form-hint">{formData.statusMessage.length}/120</span>
              </div>
            </div>
          )}

          {activeTab === "personalization" && (
            <div className="profile-settings-section">
              <div className="form-group">
                <label>Theme</label>
                <div className="theme-picker">
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      className={`theme-option ${formData.theme === theme.id ? "selected" : ""}`}
                      onClick={() => setFormData({ ...formData, theme: theme.id })}
                    >
                      <span className="theme-preview" style={{ background: theme.preview }} />
                      <span>{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Accent Color</label>
                <div className="accent-picker">
                  {ACCENT_OPTIONS.map((accent) => (
                    <button
                      key={accent.id}
                      type="button"
                      className={`accent-option ${formData.accentColor === accent.id ? "selected" : ""}`}
                      onClick={() => setFormData({ ...formData, accentColor: accent.id })}
                      title={accent.label}
                    >
                      <span className="accent-swatch" style={{ background: accent.color }} />
                      <span>{accent.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="profile-settings-section">
              <p className="profile-settings-note">
                Leave password fields empty if you don't want to change your password.
              </p>

              <div className="form-group">
                <label>Current Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    className="form-control"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="form-control"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="profile-settings-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
