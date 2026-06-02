'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Users, TrendingUp, ShoppingCart, FileText,
  Percent, Trophy, Medal, Award,
} from 'lucide-react';
import { clsx } from 'clsx';

interface EmployeeStats {
  id:               number;
  name:             string;
  role:             string;
  totalOrders:      number;
  completedOrders:  number;
  totalSales:       number;
  avgOrderValue:    number;
  totalDiscount:    number;
  invoicesCreated:  number;
  discountUsage:    number;
  totalDiscountAmt: number;
}

interface PerformanceData {
  employees: EmployeeStats[];
  period:    { from: string; to: string };
}

const ROLE_COLOR: Record<string, string> = {
  super_admin: 'bg-purple-500/20 text-purple-400',
  admin:       'bg-blue-500/20 text-blue-400',
  employee:    'bg-green-500/20 text-green-400',
};

const RANK_ICON = [
  <Trophy key={1} size={16} className="text-yellow-400" />,
  <Medal  key={2} size={16} className="text-gray-400" />,
  <Award  key={3} size={16} className="text-orange-400" />,
];

const months = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, i, 1);
  return { value: `2026-${String(i + 1).padStart(2, '0')}`, label: d.toLocaleString('default', { month: 'long', year: 'numeric' }) };
}).reverse();

export default function PerformancePage() {
  const now      = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const { data, isLoading } = useQuery<PerformanceData>({
    queryKey: ['employee-performance', month],
    queryFn:  () => api.get(`/reports/employee-performance?month=${month}`).then((r) => r.data.data),
  });

  const employees = data?.employees ?? [];
  const topSeller = employees[0];

  // Totals for the period
  const totals = employees.reduce((acc, e) => ({
    orders: acc.orders + e.totalOrders,
    sales:  acc.sales  + e.totalSales,
    invoices: acc.invoices + e.invoicesCreated,
    discounts: acc.discounts + e.totalDiscountAmt,
  }), { orders: 0, sales: 0, invoices: 0, discounts: 0 });

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={22} className="text-primary" /> Employee Performance
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">{employees.length} staff members tracked</p>
        </div>
        {/* Month picker */}
        <select className="input text-sm w-auto"
          value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="p-8 text-center text-[#94A3B8]">Loading performance data…</div>}

      {!isLoading && employees.length > 0 && (
        <>
          {/* Period summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Orders',  value: totals.orders.toLocaleString(),          icon: ShoppingCart, color: 'text-blue-400' },
              { label: 'Total Revenue', value: `$${totals.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-green-400' },
              { label: 'Invoices',      value: totals.invoices.toLocaleString(),         icon: FileText,     color: 'text-purple-400' },
              { label: 'Discounts Given', value: `$${totals.discounts.toFixed(0)}`,     icon: Percent,      color: 'text-yellow-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-[#94A3B8] uppercase tracking-wide">{label}</p>
                  <Icon size={16} className={color} />
                </div>
                <p className={clsx('text-2xl font-bold', color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Top performer highlight */}
          {topSeller && topSeller.totalSales > 0 && (
            <div className="card p-5 border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center gap-3">
                <Trophy size={24} className="text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-yellow-400 uppercase tracking-wider font-semibold">Top Performer This Month</p>
                  <p className="text-white font-bold text-lg">{topSeller.name}</p>
                  <p className="text-sm text-[#94A3B8]">
                    {topSeller.completedOrders} orders · ${topSeller.totalSales.toLocaleString()} revenue · {topSeller.invoicesCreated} invoices
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employee ranking table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-border">
              <h2 className="font-semibold text-white">Performance Rankings</h2>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border">
                    {['#', 'Employee', 'Role', 'Orders', 'Completed', 'Revenue', 'Avg Order', 'Invoices', 'Discounts Given'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[#94A3B8] font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, i) => (
                    <tr key={emp.id} className={clsx(
                      'border-b border-dark-border/40 transition-colors',
                      i === 0 ? 'bg-yellow-500/5 hover:bg-yellow-500/10' :
                      i === 1 ? 'bg-gray-500/5 hover:bg-gray-500/10' :
                      i === 2 ? 'bg-orange-500/5 hover:bg-orange-500/10' :
                                'hover:bg-dark-card/30',
                    )}>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center w-6">
                          {i < 3 ? RANK_ICON[i] : <span className="text-[#64748B] text-xs">{i + 1}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand text-white text-xs font-bold">
                            {emp.name[0]?.toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', ROLE_COLOR[emp.role] ?? 'bg-gray-500/20 text-gray-400')}>
                          {emp.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-semibold">{emp.totalOrders}</td>
                      <td className="px-4 py-3">
                        <span className={clsx('text-sm font-semibold', emp.completedOrders > 0 ? 'text-green-400' : 'text-[#64748B]')}>
                          {emp.completedOrders}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-green-400 font-bold">
                        ${emp.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-[#CBD5E1]">
                        ${emp.avgOrderValue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-purple-400 font-semibold">{emp.invoicesCreated}</td>
                      <td className="px-4 py-3">
                        {emp.discountUsage > 0 ? (
                          <div>
                            <span className="text-yellow-400 font-semibold">{emp.discountUsage}×</span>
                            <span className="text-xs text-[#94A3B8] ml-1">(${emp.totalDiscountAmt.toFixed(0)})</span>
                          </div>
                        ) : (
                          <span className="text-[#64748B] text-xs">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-dark-border">
              {employees.map((emp, i) => (
                <div key={emp.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand text-white text-sm font-bold">
                        {emp.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{emp.name}</p>
                        <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', ROLE_COLOR[emp.role] ?? '')}>
                          {emp.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {i < 3 ? RANK_ICON[i] : <span className="text-[#64748B] text-sm">#{i + 1}</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="card p-2 rounded-xl">
                      <p className="text-green-400 font-bold">${emp.totalSales.toFixed(0)}</p>
                      <p className="text-[10px] text-[#94A3B8]">Revenue</p>
                    </div>
                    <div className="card p-2 rounded-xl">
                      <p className="text-white font-bold">{emp.totalOrders}</p>
                      <p className="text-[10px] text-[#94A3B8]">Orders</p>
                    </div>
                    <div className="card p-2 rounded-xl">
                      <p className="text-purple-400 font-bold">{emp.invoicesCreated}</p>
                      <p className="text-[10px] text-[#94A3B8]">Invoices</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!isLoading && employees.length === 0 && (
        <div className="card p-12 text-center">
          <Users size={40} className="mx-auto text-[#94A3B8] mb-3 opacity-40" />
          <p className="text-[#94A3B8]">No performance data for this period.</p>
        </div>
      )}
    </div>
  );
}
