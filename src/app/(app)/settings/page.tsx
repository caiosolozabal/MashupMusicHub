import { redirect } from 'next/navigation';

// This page will redirect to the profile page by default.
export default function SettingsPage() {
  redirect('/settings/profile');
}
