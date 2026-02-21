'use client'

import { memo } from 'react'
import { useSession } from 'next-auth/react'
import { Link, usePathname } from '@/lib/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  BoxSelect,
  FlaskConical,
  Layers,
  Network,
  History,
  Zap,
  Palette,
  Flag,
  ListChecks,
  CalendarDays,
  Ruler,
  Calendar,
  DollarSign,
  MessageSquare,
  Twitter,
  ShieldCheck,
  Receipt,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useYearFilter } from '@/contexts/YearFilterContext'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  items: NavItem[]
}

interface SidebarProps {
  isExpanded: boolean
  onToggle: () => void
}

// ロールごとに表示するメニューの href リスト（空配列 = すべて表示）
const ROLE_ALLOWED_HREFS: Record<string, string[] | null> = {
  ADMIN: null, // すべて表示
  DESIGNER: ['/dashboard', '/milestones', '/schedule', '/seasons', '/samples', '/colors', '/progress-management'],
  BUYER: ['/dashboard', '/milestones', '/schedule', '/financial-planning', '/products', '/costs'],
  TECHDESIGN: ['/dashboard', '/milestones', '/schedule', '/seasons', '/samples', '/size-masters', '/progress-management'],
  SOURCING: ['/dashboard', '/milestones', '/schedule', '/seasons', '/samples', '/suppliers', '/materials', '/progress-management', '/costs', '/quality'],
}

export const Sidebar = memo(function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const { selectedYear, setSelectedYear, availableYears, selectedSeason, setSelectedSeason, availableSeasons } = useYearFilter()
  const { data: session } = useSession()

  const role = (session?.user as any)?.role as string | null | undefined
  const allowedHrefs = role ? (ROLE_ALLOWED_HREFS[role] ?? null) : []

  const allNavGroups: NavGroup[] = [
    {
      label: 'Orchestration',
      items: [
        { name: t('dashboard'), href: '/dashboard', icon: LayoutGrid },
        { name: t('milestones'), href: '/milestones', icon: Flag },
        { name: t('schedule'), href: '/schedule', icon: CalendarDays },
      ],
    },
    {
      label: 'Planning',
      items: [
        { name: t('financialPlan'), href: '/financial-planning', icon: DollarSign },
        { name: t('linePlan'), href: '/products', icon: BoxSelect },
      ],
    },
    {
      label: 'Prod. Dev',
      items: [
        { name: t('trends'), href: '/trends', icon: Zap },
        { name: 'Customer Reviews', href: '/customer-reviews', icon: MessageSquare },
        { name: 'Twitter', href: '/twitter', icon: Twitter },
        { name: t('seasons'), href: '/seasons', icon: History },
        { name: t('samples'), href: '/samples', icon: FlaskConical },
        { name: t('colors'), href: '/colors', icon: Palette },
        { name: t('materials'), href: '/materials', icon: Layers },
        { name: t('sampleProgress'), href: '/progress-management', icon: ListChecks },
        { name: t('sizes'), href: '/size-masters', icon: Ruler },
        { name: t('suppliers'), href: '/suppliers', icon: Network },
        { name: t('cost'), href: '/costs', icon: Receipt },
        { name: t('quality'), href: '/quality', icon: ShieldCheck },
      ],
    },
  ]

  // ロールに応じてフィルタリング
  const navGroups: NavGroup[] = allNavGroups
    .map((group) => ({
      ...group,
      items: allowedHrefs === null
        ? group.items
        : group.items.filter((item) => allowedHrefs.includes(item.href)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className={`bp-sidebar${isExpanded ? '' : ' bp-sidebar--collapsed'}`}>
      {/* Brand */}
      <div className="bp-sidebar__brand" onClick={onToggle}>
        <div className="bp-sidebar__hamburger">
          <span /><span /><span />
        </div>
        <div className="bp-sidebar__brand-text">
          <div className="bp-sidebar__brand-name">Product Cockpit</div>
          <div className="bp-sidebar__brand-sub">{t('brandSub')}</div>
        </div>
      </div>

      {/* Filters Container */}
      <div style={{ display: 'flex', gap: 4, padding: '0 12px', marginTop: 8 }}>
        {/* Year Filter */}
        <div className="bp-sidebar__year-filter" style={{ flex: 1, marginTop: 0, padding: '4px 8px' }}>
          <Calendar className="bp-sidebar__year-icon" />
          <select
            className="bp-sidebar__year-select"
            value={selectedYear === null ? '' : String(selectedYear)}
            onChange={(e) => {
              const val = e.target.value
              setSelectedYear(val === '' ? null : parseInt(val, 10))
            }}
          >
            <option value="">Year</option>
            {availableYears.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Season Filter */}
        <div className="bp-sidebar__year-filter" style={{ flex: 1, marginTop: 0, padding: '4px 8px' }}>
          <Calendar className="bp-sidebar__year-icon" />
          <select
            className="bp-sidebar__year-select"
            value={selectedSeason === null ? '' : String(selectedSeason)}
            onChange={(e) => {
              const val = e.target.value
              setSelectedSeason(val === '' ? null : parseInt(val, 10))
            }}
          >
            <option value="">Season</option>
            {availableSeasons.map((s) => (
              <option key={s.code} value={String(s.code)}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bp-sidebar__nav">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="bp-sidebar__section-title">{group.label}</div>
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`bp-sidebar__nav-item${isActive ? ' bp-sidebar__nav-item--active' : ''}`}
                >
                  <item.icon className="bp-sidebar__nav-icon" />
                  <span className="bp-sidebar__nav-label">{item.name}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </div>
  )
})
