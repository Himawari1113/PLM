'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'

interface Division { id: number; name: string }
interface SizeGroup {
  id: string
  name: string
  divisionId: number
  division: Division
  isActive: boolean
  sortOrder: number
  _count: { sizes: number }
}
interface SizeMasterItem {
  id: string
  sizeGroupId: string
  sizeCode: string
  sizeName: string
  sortOrder: number
  isActive: boolean
  sizeGroup: { id: string; name: string; division: Division }
}

export default function SizeMastersPage() {
  const t = useTranslations('sizeMasters')
  const tCommon = useTranslations('common')

  const [divisions, setDivisions] = useState<Division[]>([])
  const [sizeGroups, setSizeGroups] = useState<SizeGroup[]>([])
  const [sizes, setSizes] = useState<SizeMasterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [filterDivisionId, setFilterDivisionId] = useState('')
  const [filterGroupId, setFilterGroupId] = useState('')

  // Size Group form
  const [sgForm, setSgForm] = useState({ name: '', divisionId: '', sortOrder: '0' })
  // Size Master form
  const [smForm, setSmForm] = useState({ sizeGroupId: '', sizeCode: '', sizeName: '', sortOrder: '0' })

  const fetchDivisions = () => fetch('/api/divisions').then((r) => r.json()).then((d) => setDivisions(Array.isArray(d) ? d : []))
  const fetchGroups = () => {
    const q = new URLSearchParams()
    if (filterDivisionId) q.set('divisionId', filterDivisionId)
    fetch(`/api/size-groups?${q.toString()}`).then((r) => r.json()).then((d) => setSizeGroups(Array.isArray(d) ? d : []))
  }
  const fetchSizes = () => {
    setLoading(true)
    const q = new URLSearchParams()
    if (filterGroupId) q.set('sizeGroupId', filterGroupId)
    fetch(`/api/size-masters?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => { setSizes(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setSizes([]); setLoading(false) })
  }

  useEffect(() => { fetchDivisions() }, [])
  useEffect(() => { fetchGroups() }, [filterDivisionId])
  useEffect(() => { fetchSizes() }, [filterGroupId])

  const filteredGroups = filterDivisionId
    ? sizeGroups.filter((g) => g.divisionId === Number(filterDivisionId))
    : sizeGroups

  // Size Group CRUD
  const addGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/size-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: sgForm.name, divisionId: sgForm.divisionId, sortOrder: Number(sgForm.sortOrder || 0) }),
    })
    if (!res.ok) { setError('Failed to create size group'); return }
    setSgForm({ name: '', divisionId: '', sortOrder: '0' })
    fetchGroups()
  }
  const removeGroup = async (id: string) => {
    if (!confirm('Delete this size group and all its sizes?')) return
    await fetch(`/api/size-groups/${id}`, { method: 'DELETE' })
    fetchGroups()
    fetchSizes()
  }

  // Size Master CRUD
  const addSize = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/size-masters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smForm),
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d?.error || 'Failed to create size'); return }
    setSmForm({ sizeGroupId: '', sizeCode: '', sizeName: '', sortOrder: '0' })
    fetchSizes()
    fetchGroups()
  }
  const updateSize = async (id: string, patch: Partial<SizeMasterItem>) => {
    const current = sizes.find((s) => s.id === id)
    if (!current) return
    await fetch(`/api/size-masters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...current, ...patch }),
    })
    fetchSizes()
  }
  const removeSize = async (id: string) => {
    if (!confirm('Delete this size?')) return
    await fetch(`/api/size-masters/${id}`, { method: 'DELETE' })
    fetchSizes()
    fetchGroups()
  }

  return (
    <>
      <BpPageHeader title={t('title')} />

      {/* Size Group Management */}
      <div className="bp-card" style={{ marginBottom: 16 }}>
        <div className="bp-card__header">
          <h2 className="bp-card__title">Size Groups</h2>
        </div>
        <div className="bp-card__content">
          <form onSubmit={addGroup} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px auto', gap: 8, marginBottom: 12 }}>
            <select className="bp-select" value={sgForm.divisionId} onChange={(e) => setSgForm({ ...sgForm, divisionId: e.target.value })} required>
              <option value="">-- Division --</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input className="bp-input" placeholder="Group Name (e.g. XS-XXL)" value={sgForm.name} onChange={(e) => setSgForm({ ...sgForm, name: e.target.value })} required />
            <input className="bp-input" type="number" placeholder="Sort" value={sgForm.sortOrder} onChange={(e) => setSgForm({ ...sgForm, sortOrder: e.target.value })} />
            <button type="submit" className="bp-button bp-button--primary">
              <Plus style={{ width: 16, height: 16 }} /> Add
            </button>
          </form>
          {sizeGroups.length > 0 && (
            <div className="bp-table-wrap" style={{ maxHeight: 260 }}>
              <table className="bp-table">
                <thead>
                  <tr>
                    <th>Division</th>
                    <th>Group Name</th>
                    <th style={{ width: 80 }}>Sizes</th>
                    <th style={{ width: 80 }}>Sort</th>
                    <th style={{ width: 70 }}>Active</th>
                    <th style={{ width: 50 }} />
                  </tr>
                </thead>
                <tbody>
                  {sizeGroups.map((g) => (
                    <tr key={g.id}>
                      <td>{g.division.name}</td>
                      <td>{g.name}</td>
                      <td style={{ textAlign: 'center' }}>{g._count.sizes}</td>
                      <td style={{ textAlign: 'center' }}>{g.sortOrder}</td>
                      <td style={{ textAlign: 'center' }}>{g.isActive ? 'Yes' : 'No'}</td>
                      <td>
                        <button className="bp-button bp-button--danger bp-button--sm" onClick={() => removeGroup(g.id)}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Size Master */}
      <div className="bp-card">
        <div className="bp-card__header">
          <h2 className="bp-card__title">Sizes</h2>
        </div>
        <div className="bp-card__content">
          {/* Filter */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <select className="bp-select" value={filterDivisionId} onChange={(e) => { setFilterDivisionId(e.target.value); setFilterGroupId('') }}>
              <option value="">All Divisions</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="bp-select" value={filterGroupId} onChange={(e) => setFilterGroupId(e.target.value)}>
              <option value="">All Size Groups</option>
              {filteredGroups.map((g) => <option key={g.id} value={g.id}>{g.division.name} / {g.name}</option>)}
            </select>
          </div>

          {/* Add form */}
          <form onSubmit={addSize} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px auto', gap: 8, marginBottom: 12 }}>
            <select className="bp-select" value={smForm.sizeGroupId} onChange={(e) => setSmForm({ ...smForm, sizeGroupId: e.target.value })} required>
              <option value="">-- Size Group --</option>
              {sizeGroups.map((g) => <option key={g.id} value={g.id}>{g.division.name} / {g.name}</option>)}
            </select>
            <input className="bp-input" placeholder="Size Code" value={smForm.sizeCode} onChange={(e) => setSmForm({ ...smForm, sizeCode: e.target.value })} required />
            <input className="bp-input" placeholder="Size Name" value={smForm.sizeName} onChange={(e) => setSmForm({ ...smForm, sizeName: e.target.value })} />
            <input className="bp-input" type="number" placeholder="Sort" value={smForm.sortOrder} onChange={(e) => setSmForm({ ...smForm, sortOrder: e.target.value })} />
            <button type="submit" className="bp-button bp-button--primary">
              <Plus style={{ width: 16, height: 16 }} /> Add
            </button>
          </form>

          {error && <p style={{ color: 'var(--color-danger)', marginBottom: 8 }}>{error}</p>}

          {loading ? (
            <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>
          ) : sizes.length === 0 ? (
            <div className="bp-table__empty"><p>{t('noData')}</p></div>
          ) : (
            <div className="bp-table-wrap">
              <table className="bp-table">
                <thead>
                  <tr>
                    <th>Division</th>
                    <th>Size Group</th>
                    <th>Size Code</th>
                    <th>Size Name</th>
                    <th style={{ width: 80 }}>Sort</th>
                    <th style={{ width: 70 }}>Active</th>
                    <th style={{ width: 50 }} />
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((s) => (
                    <tr key={s.id}>
                      <td>{s.sizeGroup.division.name}</td>
                      <td>{s.sizeGroup.name}</td>
                      <td>
                        <input className="bp-input" value={s.sizeCode} onChange={(e) => updateSize(s.id, { sizeCode: e.target.value })} />
                      </td>
                      <td>
                        <input className="bp-input" value={s.sizeName} onChange={(e) => updateSize(s.id, { sizeName: e.target.value })} />
                      </td>
                      <td>
                        <input className="bp-input" type="number" value={s.sortOrder} onChange={(e) => updateSize(s.id, { sortOrder: Number(e.target.value || 0) })} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={s.isActive} onChange={(e) => updateSize(s.id, { isActive: e.target.checked } as any)} />
                      </td>
                      <td>
                        <button className="bp-button bp-button--danger bp-button--sm" onClick={() => removeSize(s.id)}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
