'use client';
import { useAuthStore } from '@/store/auth.store';
import Header from '@/components/layout/Header';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col">
      <Header title="Settings" />
      <div className="p-6 max-w-2xl space-y-6">
        {/* Profile */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Profile</h2>
          <div className="space-y-3">
            {[
              { label: 'Name',  value: user?.name },
              { label: 'Email', value: user?.email },
              { label: 'Role',  value: user?.role },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">API Endpoint</h2>
          <p className="text-sm text-gray-500">{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}</p>
        </div>
      </div>
    </div>
  );
}
