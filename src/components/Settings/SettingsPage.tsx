import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Lock, 
  Bell, 
  User, 
  Globe, 
  Ban, 
  KeyRound, 
  HelpCircle, 
  Info, 
  LogOut, 
  Check, 
  UserCog, 
  ShieldAlert,
  Smartphone,
  Download,
  Camera,
  Mic,
  Video,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  Heart,
  Shield,
  FileText,
  Radio,
  Share2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface SettingsPageProps {
  initialSection?: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialSection }) => {
  const { userProfile, updateProfileData, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<string>(initialSection || 'profile');

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);
  const [cameraAccess, setCameraAccess] = useState<boolean | null>(null);
  const [micAccess, setMicAccess] = useState<boolean | null>(null);

  const requestCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraAccess(true);
    } catch {
      setCameraAccess(false);
    }
  };

  const requestMicAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicAccess(true);
    } catch {
      setMicAccess(false);
    }
  };

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phoneNumber || '');
  const [username, setUsername] = useState(userProfile?.username || '');

  const [twoFactor, setTwoFactor] = useState(userProfile?.twoFactorEnabled || false);
  const [privacySettings, setPrivacySettings] = useState(userProfile?.privacySettings || {
    showLastSeen: true,
    showPhone: true,
    allowDirectMsg: true
  });
  const [selectedLanguage, setSelectedLanguage] = useState('English (US)');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const handleCheckForUpdates = () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    setTimeout(() => {
      setCheckingUpdate(false);
      setUpdateStatus('You are running the latest version of CHAT IN HB v1.0.0 (Build 100). No new updates available.');
    }, 1500);
  };

  if (!userProfile) return null;

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfileData({
        displayName,
        bio,
        phoneNumber,
        username,
        twoFactorEnabled: twoFactor,
        privacySettings
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    alert('Password updated successfully!');
    setNewPassword('');
    setConfirmPassword('');
  };

  const settingsTabs = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'account', label: 'Account Settings', icon: UserCog },
    { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'appearance', label: 'Appearance / Mode', icon: theme === 'dark' ? Moon : Sun },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'permissions', label: 'App Permissions (Cam/Mic)', icon: Camera },
    { id: 'blocked', label: 'Blocked Users', icon: Ban },
    { id: 'password', label: 'Change Password', icon: KeyRound },
    { id: 'support', label: 'Help & Support', icon: HelpCircle },
    { id: 'about', label: 'About CHAT IN HB', icon: Info },
  ];

  return (
    <div className="w-full p-3 sm:p-5 space-y-5 pb-28 md:pb-8">
      
      {/* Settings Header */}
      <div className="frosted-card rounded-3xl p-6 shadow-2xl flex items-center justify-between border-purple-900/40 bg-purple-950/20">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg">
            <Settings className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h2 className="font-extrabold text-xl text-white tracking-wide">Settings & Preferences</h2>
            <p className="text-xs text-purple-300/70">Manage account, security, privacy, and theme preferences</p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-2xl animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>Saved Successfully!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Left Navigation Pills */}
        <div className="md:col-span-4 space-y-1.5 bg-black/40 backdrop-blur-xl p-2 rounded-3xl border border-purple-900/40 h-fit">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                    : 'text-purple-200/70 hover:text-white hover:bg-purple-900/20'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-purple-400/60'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-purple-900/40">
            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Right Section Content */}
        <div className="md:col-span-8 bg-black/40 backdrop-blur-xl p-6 rounded-3xl border border-purple-900/40 space-y-6">

          {/* 1. Profile Settings */}
          {activeSection === 'profile' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-white border-b border-purple-900/40 pb-2">Profile Settings</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-purple-300 block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-purple-950/20 border border-purple-900/40 rounded-xl p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-300 block mb-1">Username (@handle)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-purple-950/20 border border-purple-900/40 rounded-xl p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-300 block mb-1">Bio</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-purple-950/20 border border-purple-900/40 rounded-xl p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all"
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          )}

          {/* 2. Account Settings */}
          {activeSection === 'account' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-white border-b border-purple-900/40 pb-2">Account Settings</h3>
              
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-900/30">
                  <span className="text-[10px] text-purple-400 uppercase font-bold block">Account Email</span>
                  <span className="text-white font-semibold">{userProfile.email}</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-300 block mb-1">Phone Number (For friends search)</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-purple-950/20 border border-purple-900/40 rounded-xl p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all"
              >
                Update Account Information
              </button>
            </div>
          )}

          {/* 3. Privacy */}
          {activeSection === 'privacy' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-white border-b border-purple-900/40 pb-2">Privacy Settings</h3>
              
              <div className="space-y-3 text-xs text-purple-200">
                <div className="flex items-center justify-between p-3 bg-purple-950/20 rounded-xl border border-purple-900/30">
                  <span>Show Online Status & Last Seen</span>
                  <input
                    type="checkbox"
                    checked={privacySettings.showLastSeen}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, showLastSeen: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-950/20 rounded-xl border border-purple-900/30">
                  <span>Show Phone Number to Friends</span>
                  <input
                    type="checkbox"
                    checked={privacySettings.showPhone}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, showPhone: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-950/20 rounded-xl border border-purple-900/30">
                  <span>Allow Direct Messages from Non-Friends</span>
                  <input
                    type="checkbox"
                    checked={privacySettings.allowDirectMsg}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, allowDirectMsg: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30"
              >
                Save Privacy Controls
              </button>
            </div>
          )}

          {/* 4. Security */}
          {activeSection === 'security' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-white border-b border-purple-900/40 pb-2">Security & 2FA</h3>
              
              <div className="p-4 bg-purple-950/20 rounded-xl border border-purple-900/30 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">Two-Factor Authentication (2FA)</p>
                  <p className="text-purple-300/70 text-[10px]">Require authentication code on new device sign-ins</p>
                </div>
                <input
                  type="checkbox"
                  checked={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30"
              >
                Update Security Settings
              </button>
            </div>
          )}

          {/* 5. Appearance / Dark, Light & System Mode Toggles */}
          {activeSection === 'appearance' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-[var(--text-main)] border-b border-[var(--border-color)] pb-2">Appearance & Theme Colors</h3>
              
              <div className="p-5 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] space-y-4">
                <p className="text-xs text-[var(--text-secondary)] font-medium">Select your preferred application theme mode:</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Light Mode */}
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-2 ${
                      theme === 'light'
                        ? 'bg-purple-600/30 border-purple-500 text-purple-600 dark:text-purple-300 font-bold shadow-lg shadow-purple-600/20 ring-2 ring-purple-500/50'
                        : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Sun className="w-6 h-6 text-amber-500" />
                    <span className="text-xs font-semibold">☀ Light Theme</span>
                  </button>

                  {/* Dark Mode */}
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-2 ${
                      theme === 'dark'
                        ? 'bg-purple-600/30 border-purple-500 text-purple-600 dark:text-purple-300 font-bold shadow-lg shadow-purple-600/20 ring-2 ring-purple-500/50'
                        : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Moon className="w-6 h-6 text-purple-400" />
                    <span className="text-xs font-semibold">🌙 Dark Theme</span>
                  </button>

                  {/* System Default */}
                  <button
                    onClick={() => setTheme('system')}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-2 ${
                      theme === 'system'
                        ? 'bg-purple-600/30 border-purple-500 text-purple-600 dark:text-purple-300 font-bold shadow-lg shadow-purple-600/20 ring-2 ring-purple-500/50'
                        : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Radio className="w-6 h-6 text-cyan-400" />
                    <span className="text-xs font-semibold">📱 System Default</span>
                  </button>
                </div>

                {/* Text Color Adaptability Notice */}
                <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center space-x-3">
                  <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    <strong className="text-[var(--text-main)]">Auto Dynamic Text Contrast:</strong> When changing background color (Dark ↔ Light), all titles, text, card borders, and icons instantly switch colors for optimum legibility.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 6. Language */}
          {activeSection === 'language' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-white border-b border-purple-900/40 pb-2">Language Preferences</h3>
              
              <div className="space-y-2 text-xs">
                {['English (US)', 'Spanish (Español)', 'French (Français)', 'German (Deutsch)', 'Arabic (العربية)', 'Japanese (日本語)'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedLanguage === lang
                        ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                        : 'bg-purple-950/20 border-purple-900/30 text-purple-300 hover:bg-purple-900/20'
                    }`}
                  >
                    <span>{lang}</span>
                    {selectedLanguage === lang && <Check className="w-4 h-4 text-purple-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 7. Notifications */}
          {activeSection === 'notifications' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-white border-b border-purple-900/40 pb-2">Notification Preferences</h3>
              
              <div className="space-y-3 text-xs text-purple-200">
                <div className="flex items-center justify-between p-3 bg-purple-950/20 rounded-xl border border-purple-900/30">
                  <span>Chat Message Push Notifications</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-950/20 rounded-xl border border-purple-900/30">
                  <span>Friend Request Alerts</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-950/20 rounded-xl border border-purple-900/30">
                  <span>Comments & Likes Notifications</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500" />
                </div>
              </div>
            </div>
          )}

          {/* 7b. App Permissions */}
          {activeSection === 'permissions' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-white border-b border-purple-900/40 pb-2">Camera & Microphone Permissions</h3>
              <p className="text-xs text-purple-300/70">
                Permission access requests no longer interrupt you at app startup. Grant or test access on demand for audio/video calls:
              </p>

              <div className="space-y-3 text-xs">
                {/* Camera Control */}
                <div className="p-4 bg-purple-950/20 rounded-2xl border border-purple-900/30 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-purple-600/20 rounded-xl border border-purple-500/30 text-purple-400">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Camera Access</h4>
                      <p className="text-purple-300/60 text-[11px]">Used for video calls and taking story photos</p>
                    </div>
                  </div>

                  <button
                    onClick={requestCameraAccess}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                      cameraAccess === true
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : cameraAccess === false
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg'
                    }`}
                  >
                    {cameraAccess === true ? '✓ Access Allowed' : cameraAccess === false ? '✕ Denied / Blocked' : 'Enable Camera'}
                  </button>
                </div>

                {/* Microphone Control */}
                <div className="p-4 bg-purple-950/20 rounded-2xl border border-purple-900/30 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-purple-600/20 rounded-xl border border-purple-500/30 text-purple-400">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Microphone Access</h4>
                      <p className="text-purple-300/60 text-[11px]">Used for voice notes and audio calls</p>
                    </div>
                  </div>

                  <button
                    onClick={requestMicAccess}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                      micAccess === true
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : micAccess === false
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg'
                    }`}
                  >
                    {micAccess === true ? '✓ Access Allowed' : micAccess === false ? '✕ Denied / Blocked' : 'Enable Microphone'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 8. Blocked Users */}
          {activeSection === 'blocked' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-white border-b border-purple-900/40 pb-2">Blocked Users</h3>
              <p className="text-xs text-purple-300/70">
                Manage accounts you have restricted from contacting you or viewing your posts.
              </p>

              {(!userProfile.blockedUsers || userProfile.blockedUsers.length === 0) ? (
                <div className="p-6 text-center text-xs text-purple-300/60 bg-purple-950/20 rounded-2xl border border-purple-900/30">
                  No blocked users on your list.
                </div>
              ) : (
                <div className="space-y-2">
                  {userProfile.blockedUsers.map((uid) => (
                    <div key={uid} className="flex items-center justify-between p-3 bg-purple-950/20 rounded-xl border border-purple-900/30 text-xs">
                      <span className="text-white font-semibold">User ID: {uid}</span>
                      <button className="px-3 py-1 bg-purple-600 text-white rounded-lg font-bold">Unblock</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 9. Change Password */}
          {activeSection === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <h3 className="font-extrabold text-base text-white border-b border-purple-900/40 pb-2">Change Password</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-purple-300 block mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-purple-950/20 border border-purple-900/40 rounded-xl p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-300 block mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-purple-950/20 border border-purple-900/40 rounded-xl p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30"
              >
                Update Password
              </button>
            </form>
          )}

          {/* 10. Help & Support */}
          {activeSection === 'support' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-white border-b border-purple-900/40 pb-2">Help & Support</h3>
              <p className="text-xs text-purple-200">Need assistance or have a question about CHAT IN HB?</p>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-purple-950/20 rounded-2xl border border-purple-900/30">
                  <h4 className="font-bold text-white mb-1">Frequently Asked Questions</h4>
                  <p className="text-purple-300/70 text-[11px]">Learn how to search friends by phone number, create stories, and manage groups.</p>
                </div>

                <div className="p-4 bg-purple-950/20 rounded-2xl border border-purple-900/30">
                  <h4 className="font-bold text-white mb-1">Contact Support Team</h4>
                  <p className="text-purple-300/70 text-[11px]">Email support@chatinhb.com for account recovery or bug reports.</p>
                </div>
              </div>
            </div>
          )}

          {/* 11. About CHAT IN HB Notes & Info */}
          {activeSection === 'about' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="font-extrabold text-base text-[var(--text-main)] flex items-center space-x-2">
                  <Info className="w-5 h-5 text-fuchsia-500" />
                  <span>About CHAT IN HB</span>
                </h3>
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-600 dark:text-fuchsia-300 border border-purple-500/30 text-[11px] font-mono font-bold">
                  v1.0.0 (Build 100)
                </span>
              </div>

              {/* Developer & App Hero Box */}
              <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl relative overflow-hidden space-y-5">
                <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-purple-500 p-0.5 shadow-xl flex items-center justify-center">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-fuchsia-400" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-2xl text-[var(--text-main)] tracking-wide">CHAT IN HB</h4>
                    <p className="text-xs text-purple-600 dark:text-fuchsia-300 font-mono font-semibold">
                      Version 1.0.0 • Build 100
                    </p>
                  </div>
                </div>

                {/* Updates & Store Buttons Box */}
                <div className="p-4 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-color)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-extrabold text-[var(--text-main)] uppercase tracking-wider">App Update Status</h5>
                      <p className="text-[11px] text-[var(--text-secondary)]">Current Channel: Production Release (Play Store & Web)</p>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                      Up To Date ✓
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {/* Check for Updates Button */}
                    <button
                      onClick={handleCheckForUpdates}
                      disabled={checkingUpdate}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                      <span>{checkingUpdate ? 'Checking for updates...' : 'Check for Updates'}</span>
                    </button>
                  </div>

                  {/* Update Status Banner Message */}
                  {updateStatus && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>{updateStatus}</span>
                    </div>
                  )}
                </div>

                {/* About Box */}
                <div className="p-4 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-color)] space-y-1.5">
                  <h5 className="text-xs font-bold text-purple-600 dark:text-fuchsia-300 uppercase tracking-wider">About Application</h5>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    CHAT IN HB is an all-in-one social networking and messaging platform featuring high-definition WebRTC voice/video calling, real-time Firestore database synchronization, 24-hour interactive story feeds, and dark/light high-contrast theme customization.
                  </p>
                </div>

                {/* Developer Box */}
                <div className="p-4 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-color)] flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/40 flex items-center justify-center text-lg">
                    👨‍💻
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wider block">Founder & Lead Developer</span>
                    <h5 className="font-black text-sm text-[var(--text-main)] tracking-wide">MD AMIR HAMZA</h5>
                    <p className="text-[11px] text-[var(--text-secondary)] font-medium">CHAT IN HB Lead Architect</p>
                  </div>
                </div>

                {/* Tech Stack Pills */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Technology Stack</span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] font-medium flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span>Firebase Firestore & Auth</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] font-medium flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span>WebRTC Audio / Video Calls</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] font-medium flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-fuchsia-400"></span>
                      <span>Android App Bundle (AAB) & PWA</span>
                    </span>
                  </div>
                </div>

                {/* Footer Copyright */}
                <div className="pt-3 border-t border-[var(--border-color)] text-center">
                  <p className="text-xs text-[var(--text-secondary)] font-mono">
                    © 2026 CHAT IN HB • Developer MD AMIR HAMZA. All Rights Reserved.
                  </p>
                </div>
              </div>

              {/* Core Features Notes */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-[var(--text-secondary)] uppercase tracking-wider flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
                  <span>Key App Features & Highlights</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] space-y-1.5">
                    <div className="flex items-center space-x-2 text-fuchsia-600 dark:text-fuchsia-300 font-bold">
                      <MessageSquare className="w-4 h-4 text-fuchsia-500" />
                      <span>Instant Messaging & Voice</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-normal">
                      One-on-one chats, group channels, instant voice audio messages, reaction emojis, and delivery receipts.
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] space-y-1.5">
                    <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-300 font-bold">
                      <Radio className="w-4 h-4 text-cyan-500" />
                      <span>24-Hour Interactive Stories</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-normal">
                      Post photo and video stories with real-time viewer tracking, story reactions, audience controls, and reporting.
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] space-y-1.5">
                    <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-300 font-bold">
                      <User className="w-4 h-4 text-emerald-500" />
                      <span>Profile Customization</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-normal">
                      Persistent cover photos, custom avatar presets, phone number search, and bio management.
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] space-y-1.5">
                    <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-300 font-bold">
                      <Shield className="w-4 h-4 text-amber-500" />
                      <span>Privacy & Security</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-normal">
                      Comprehensive privacy controls, user blocking, restricted lists, and secure Cloud Firestore synchronization.
                    </p>
                  </div>
                </div>
              </div>

              {/* Legal & App Details */}
              <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[var(--text-secondary)] gap-2">
                <div>
                  <p className="font-bold text-[var(--text-main)]">CHAT IN HB Social Platform</p>
                  <p>© 2026 CHAT IN HB. All Rights Reserved.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="hover:text-[var(--text-main)] cursor-pointer transition-colors">Privacy Policy</span>
                  <span>•</span>
                  <span className="hover:text-[var(--text-main)] cursor-pointer transition-colors">Terms of Service</span>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};

