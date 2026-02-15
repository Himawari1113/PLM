'use client'

import { memo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
]

// Use hex values for Recharts (CSS vars don't work in SVG fill)
const CHART_COLORS = ['#64748B', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

interface ChartData {
  name: string
  value: number
}

interface DashboardChartsProps {
  productsByStatus: ChartData[]
  productsByCategory: ChartData[]
  samplesByStatus: ChartData[]
  samplesByType: ChartData[]
  statusLabels: Record<string, string>
  categoryLabels: Record<string, string>
  sampleStatusLabels: Record<string, string>
  sampleTypeLabels: Record<string, string>
}

export const DashboardCharts = memo(function DashboardCharts({
  productsByStatus,
  productsByCategory,
  samplesByStatus,
  samplesByType,
  statusLabels,
  categoryLabels,
  sampleStatusLabels,
  sampleTypeLabels,
}: DashboardChartsProps) {
  const labeledProductsByStatus = productsByStatus.map((d) => ({
    ...d,
    name: statusLabels[d.name] || d.name,
  }))

  const labeledProductsByCategory = productsByCategory.map((d) => ({
    ...d,
    name: categoryLabels[d.name] || d.name,
  }))

  const labeledSamplesByStatus = samplesByStatus.map((d) => ({
    ...d,
    name: sampleStatusLabels[d.name] || d.name,
  }))

  const labeledSamplesByType = samplesByType.map((d) => ({
    ...d,
    name: sampleTypeLabels[d.name] || d.name,
  }))

  return (
    <div className="bp-chart-grid">
      <div className="bp-chart-card">
        <h3 className="bp-chart-card__title">Product Status</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={labeledProductsByStatus}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {labeledProductsByStatus.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bp-chart-card">
        <h3 className="bp-chart-card__title">Products by Category</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={labeledProductsByCategory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#64748B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bp-chart-card">
        <h3 className="bp-chart-card__title">Sample Status</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={labeledSamplesByStatus}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {labeledSamplesByStatus.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bp-chart-card">
        <h3 className="bp-chart-card__title">Samples by Type</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={labeledSamplesByType}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})
