'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { Package } from 'lucide-react';

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="gradient-login min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Header — matches Flutter login header */}
        <div className="mb-9 flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/20 bg-white/10 backdrop-blur-sm">
            <Package className="h-11 w-11 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">DaralIraq</h1>
          <p className="mt-1.5 text-sm text-white/60">Enterprise Inventory &amp; Sales Platform</p>
        </div>

        {/* Card — white card on gradient, like Flutter */}
        <div className="rounded-3xl bg-white p-8 shadow-modal">
          <h2 className="mb-6 text-center text-lg font-semibold text-dark-bg">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="admin@daraliraq.com"
                className="input bg-light-bg border-light-border focus:ring-primary/40"
              />
              {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="input bg-light-bg border-light-border focus:ring-primary/40"
              />
              {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2 py-3 text-base"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          DaralIraq v3.0 · Enterprise Edition
        </p>
      </div>
    </div>
  );
}
