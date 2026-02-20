'use client'

import { memo } from 'react'
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
  ShoppingCart,
  DollarSign,
  MessageSquare,
  Twitter,
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

export const Sidebar = memo(function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const { selectedYear, setSelectedYear, availableYears, selectedSeason, setSelectedSeason, availableSeasons } = useYearFilter()

  const navGroups: NavGroup[] = [
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
        { name: 'WSSI/OTB', href: '/wssi-otb', icon: ShoppingCart },
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
      ],
    },
  ]

  return (
    <div className={`bp-sidebar${isExpanded ? '' : ' bp-sidebar--collapsed'}`}>
      {/* Brand */}
      <div className="bp-sidebar__brand" onClick={onToggle}>
        <div className="bp-sidebar__hamburger">
          <span /><span /><span />
        </div>
        <div className="bp-sidebar__brand-text">
          <div className="bp-sidebar__brand-name">Apparel PLM</div>
          <div className="bp-sidebar__brand-sub">{t('brandSub')}</div>
        </div>
      </div>

      {/* Year Filter */}
      <div className="bp-sidebar__year-filter">
        <Calendar className="bp-sidebar__year-icon" />
        <select
          className="bp-sidebar__year-select"
          value={selectedYear === null ? '' : String(selectedYear)}
          onChange={(e) => {
            const val = e.target.value
            setSelectedYear(val === '' ? null : parseInt(val, 10))
          }}
        >
          <option value="">All Years</option>
          {availableYears.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Season Filter */}
      <div className="bp-sidebar__year-filter" style={{ marginTop: 4 }}>
        <Calendar className="bp-sidebar__year-icon" />
        <select
          className="bp-sidebar__year-select"
          value={selectedSeason === null ? '' : String(selectedSeason)}
          onChange={(e) => {
            const val = e.target.value
            setSelectedSeason(val === '' ? null : parseInt(val, 10))
          }}
        >
          <option value="">All Seasons</option>
          {availableSeasons.map((s) => (
            <option key={s.code} value={String(s.code)}>
              {s.label}
            </option>
          ))}
        </select>
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
