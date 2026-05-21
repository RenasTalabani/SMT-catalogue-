'use client';
import { useAuthStore } from '@/store/auth.store';
import Header from '@/components/layout/Header';
import { User, Mail, Shield, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();

  const profileFields = [
    { label: 'Name',  value: user?.name,  icon: User  },
    { label: 'Email', value: user?.email, icon: Mail  },
    { label: 'Role',  value: user?.role,  icon: Shield },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Settings" />
      <div className="p-6 max-w-2xl space-y-5">
        {/* Profile */}
        <div className="card overflow-hidden">
          <div className="border-b border-dark-border px-6 py-4">
            <h2 className="font-semibold text-white">Profile</h2>
          </div>
          <div className="divide-y divide-dark-border">
            {profileFields.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                    <Icon size={15} className="text-primary" />
                  </div>
                  <span className="text-sm text-[#94A3B8]">{label}</span>
                </div>
                <span className="text-sm font-medium text-white capitalize">{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API */}
        <div className="card overflow-hidden">
          <div className="border-b border-dark-border px-6 py-4">
            <h2 className="font-semibold text-white">API Connection</h2>
          </div>
          <div className="px-6 py-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/20">
              <Globe size={15} className="text-secondary" />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8]">Endpoint</p>
              <p className="text-sm font-mono text-white">{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-success">
              <span className="h-2 w-2 rounded-full bg-success inline-block" />
              Connected
            </span>
          </div>
        </div>

        {/* App Info */}
        <div className="card px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#94A3B8]">Version</span>
            <span className="text-sm font-medium text-white">DaralIraq v3.0 — Enterprise Edition</span>
          </div>
        </div>
      </div>
    </div>
  );
}
