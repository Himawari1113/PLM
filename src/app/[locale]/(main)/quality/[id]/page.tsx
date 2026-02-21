'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
    ShieldCheck,
    Camera,
    FileText,
    Plus,
    Zap,
    Save,
    Trash2,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Clock,
    Image as ImageIcon,
    Tag,
    ListChecks,
    FileSearch
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'
import { Link } from '@/lib/navigation'

type Tab = 'inspection' | 'pics' | 'description'

interface InspectionItem {
    id: string
    category: string
    itemName: string
    standard: string | null
    actualValue: string | null
    result: string
    remarks: string | null
    isAiGenerated: boolean
}

interface Inspection {
    id: string
    inspectionType: string
    inspectionDate: string | null
    inspector: string | null
    overallResult: string
    status: string
    remarks: string | null
    items: InspectionItem[]
    photos: any[]
    careLabels: any[]
}

interface QualityData {
    sample: {
        id: string
        sampleName: string
        sampleNumber: string
        sampleType: string
        division: string | null
        subCategory: string | null
        supplier: { name: string } | null
        product: { styleNumber: string; name: string }
        sampleMaterials: Array<{ materialName: string | null; kind: string }>
        sampleColors: Array<{ color: { colorName: string } }>
    }
    inspections: Inspection[]
}

export default function QualityDetailPage() {
    const params = useParams()
    const id = params.id as string
    const t = useTranslations('nav')
    const tCommon = useTranslations('common')
    const tSamples = useTranslations('samples')

    const [activeTab, setActiveTab] = useState<Tab>('inspection')
    const [data, setData] = useState<QualityData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeInspectionId, setActiveInspectionId] = useState<string | null>(null)
    const [isDrafting, setIsDrafting] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/quality/${id}`)
            if (res.ok) {
                const json = await res.json()
                setData(json)
                if (json.inspections.length > 0 && !activeInspectionId) {
                    setActiveInspectionId(json.inspections[0].id)
                }
            }
        } catch (err) {
            console.error('Failed to fetch quality data:', err)
        } finally {
            setLoading(false)
        }
    }, [id, activeInspectionId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const activeInspection = data?.inspections.find(i => i.id === activeInspectionId)

    const handleCreateDraft = async () => {
        if (!data?.sample) return
        setIsDrafting(true)
        try {
            // 1. Get AI Draft items
            const aiRes = await fetch('/api/ai/quality-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sampleType: data.sample.sampleType,
                    division: data.sample.division,
                    subCategory: data.sample.subCategory,
                    materials: data.sample.sampleMaterials.map(m => ({ name: m.materialName, type: m.kind })),
                    colors: data.sample.sampleColors.map(c => c.color.colorName)
                })
            })

            const aiData = await aiRes.json()

            // 2. Create the inspection with these items
            const createRes = await fetch(`/api/quality/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inspectionType: 'FINAL',
                    items: aiData.items
                })
            })

            if (createRes.ok) {
                const newInsp = await createRes.json()
                await fetchData()
                setActiveInspectionId(newInsp.id)
            }
        } catch (err) {
            console.error('Failed to create quality draft:', err)
        } finally {
            setIsDrafting(false)
        }
    }

    const handleUpdateItem = async (itemId: string, updates: Partial<InspectionItem>) => {
        if (!activeInspectionId) return
        try {
            await fetch(`/api/quality/inspection/${activeInspectionId}/items`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [{ id: itemId, ...updates }]
                })
            })
            // Local update for responsiveness
            setData(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    inspections: prev.inspections.map(insp => {
                        if (insp.id === activeInspectionId) {
                            return {
                                ...insp,
                                items: insp.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
                            }
                        }
                        return insp
                    })
                }
            })
        } catch (err) {
            console.error('Failed to update item:', err)
        }
    }

    if (loading) return <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>
    if (!data?.sample) return <div className="bp-page">Sample not found</div>

    return (
        <>
            <div style={{ position: 'sticky', top: 48, zIndex: 20, background: 'var(--color-bg)' }}>
                <BpPageHeader
                    title={`Quality: ${data.sample.sampleNumber}`}
                    titleMeta={<span className="bp-page__subtitle">{data.sample.product.name}</span>}
                    actions={
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className={`bp-button ${isDrafting ? 'bp-button--loading' : 'bp-button--primary'}`}
                                onClick={handleCreateDraft}
                                disabled={isDrafting}
                            >
                                <ListChecks style={{ width: 16, height: 16 }} />
                                Auto Draft Inspection
                            </button>
                        </div>
                    }
                />
                <div className="bp-tabs" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '0 20px' }}>
                    <button
                        className={`bp-tabs__item ${activeTab === 'inspection' ? 'bp-tabs__item--active' : ''}`}
                        onClick={() => setActiveTab('inspection')}
                    >
                        <ShieldCheck style={{ width: 16, height: 16 }} />
                        Quality Inspection
                    </button>
                    <button
                        className={`bp-tabs__item ${activeTab === 'pics' ? 'bp-tabs__item--active' : ''}`}
                        onClick={() => setActiveTab('pics')}
                    >
                        <Camera style={{ width: 16, height: 16 }} />
                        Quality Pics
                    </button>
                    <button
                        className={`bp-tabs__item ${activeTab === 'description' ? 'bp-tabs__item--active' : ''}`}
                        onClick={() => setActiveTab('description')}
                    >
                        <Tag style={{ width: 16, height: 16 }} />
                        Quality Description
                    </button>
                </div>
            </div>

            <div className="bp-page">
                {activeTab === 'inspection' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
                        {/* Sidebar: Inspection List */}
                        <div className="bp-card" style={{ height: 'fit-content' }}>
                            <div className="bp-card__header">
                                <span className="bp-card__title">Records</span>
                            </div>
                            <div className="bp-card__content" style={{ padding: 0 }}>
                                {data.inspections.length === 0 ? (
                                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
                                        No inspections yet.
                                    </div>
                                ) : (
                                    data.inspections.map(insp => (
                                        <button
                                            key={insp.id}
                                            onClick={() => setActiveInspectionId(insp.id)}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                                textAlign: 'left',
                                                background: activeInspectionId === insp.id ? 'var(--color-gray-50)' : 'transparent',
                                                border: 'none',
                                                borderBottom: '1px solid var(--color-border-light)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>{insp.inspectionType}</span>
                                                <div style={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    background: insp.overallResult === 'PASS' ? 'var(--color-success)' : insp.overallResult === 'FAIL' ? 'var(--color-danger)' : 'var(--color-gray-300)'
                                                }} />
                                            </div>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
                                                {insp.inspectionDate ? new Date(insp.inspectionDate).toLocaleDateString() : 'Draft'}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Main view: Active Inspection Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {activeInspection ? (
                                <div className="bp-card">
                                    <div className="bp-card__header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span className="bp-card__title">{activeInspection.inspectionType} Inspection Details</span>
                                            <span className={`bp-badge bp-badge--${activeInspection.status === 'APPROVED' ? 'success' : 'neutral'}`}>
                                                {activeInspection.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bp-card__content">
                                        <div className="bp-table-wrap" style={{ maxHeight: 'none' }}>
                                            <table className="bp-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: 140 }}>Category</th>
                                                        <th style={{ minWidth: 200 }}>Check Item</th>
                                                        <th style={{ width: 180 }}>Standard</th>
                                                        <th style={{ width: 180 }}>Actual Value</th>
                                                        <th style={{ width: 120 }}>Result</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(activeInspection?.items || []).map(item => (
                                                        <tr key={item.id}>
                                                            <td style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-xs)' }}>{item.category}</td>
                                                            <td style={{ fontWeight: 500 }}>
                                                                {item.itemName}
                                                                {item.isAiGenerated && <Zap style={{ width: 12, height: 12, marginLeft: 6, color: 'var(--color-accent)', display: 'inline' }} />}
                                                            </td>
                                                            <td style={{ color: 'var(--color-gray-600)' }}>{item.standard || '-'}</td>
                                                            <td>
                                                                <input
                                                                    className="bp-input"
                                                                    style={{ padding: '4px 8px', height: 32 }}
                                                                    defaultValue={item.actualValue || ''}
                                                                    onBlur={(e) => handleUpdateItem(item.id, { actualValue: e.target.value })}
                                                                />
                                                            </td>
                                                            <td>
                                                                <select
                                                                    className="bp-select"
                                                                    style={{ padding: '4px 8px', height: 32 }}
                                                                    value={item.result}
                                                                    onChange={(e) => handleUpdateItem(item.id, { result: e.target.value })}
                                                                >
                                                                    <option value="NOT_TESTED">N/A</option>
                                                                    <option value="PASS">Pass</option>
                                                                    <option value="FAIL">Fail</option>
                                                                    <option value="CONDITIONAL">Conditional</option>
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bp-card" style={{ padding: 40, textAlign: 'center' }}>
                                    <ShieldCheck style={{ width: 48, height: 48, margin: '0 auto 16px', color: 'var(--color-gray-300)' }} />
                                    <p style={{ color: 'var(--color-gray-500)' }}>Select an inspection record or create a new draft.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'pics' && (
                    <div className="bp-card">
                        <div className="bp-card__header">
                            <span className="bp-card__title">Inspection Photos</span>
                        </div>
                        <div className="bp-card__content">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                                <div style={{
                                    border: '2px dashed var(--color-border)',
                                    borderRadius: 'var(--radius-lg)',
                                    aspectRatio: '1/1',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'var(--color-gray-400)'
                                }}>
                                    <ImageIcon style={{ width: 32, height: 32, marginBottom: 8 }} />
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>Add Photo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'description' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                        <div className="bp-card">
                            <div className="bp-card__header">
                                <span className="bp-card__title">Care Labels & Additional Instructions</span>
                            </div>
                            <div className="bp-card__content">
                                {(activeInspection?.careLabels || []).length === 0 ? (
                                    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                                        <Tag style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.5 }} />
                                        <p>No care labels registered. Use the Auto Assistant to generate recommendations.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 24 }}>
                                        {(activeInspection?.careLabels || []).map((l: any) => (
                                            <div key={l.id} style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    width: 100, height: 100, margin: '0 auto 12px',
                                                    border: '2px solid var(--color-gray-100)',
                                                    borderRadius: 'var(--radius-lg)',
                                                    display: 'grid', placeItems: 'center',
                                                    background: '#fff',
                                                    boxShadow: 'var(--shadow-sm)'
                                                }}>
                                                    {l.symbolSvg ? (
                                                        <div dangerouslySetInnerHTML={{ __html: l.symbolSvg }} style={{ width: 60, height: 60 }} />
                                                    ) : (
                                                        <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>{l.symbolCode}</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, marginBottom: 4 }}>{l.category}</div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', lineHeight: 1.2 }}>{l.symbolName}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bp-card">
                            <div className="bp-card__header">
                                <span className="bp-card__title">Care Label & Description Recommendations</span>
                            </div>
                            <div className="bp-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
                                    Generate ISO 3758 care instructions based on material composition and inspection logic.
                                </p>

                                <div style={{ background: 'var(--color-gray-50)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 8, textTransform: 'uppercase' }}>Context</div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-700)' }}>
                                        <strong>Materials:</strong> {data?.sample.sampleMaterials.map(m => m.materialName).filter(Boolean).join(', ') || 'N/A'}<br />
                                        <strong>Category:</strong> {data?.sample.division || 'N/A'} {data?.sample.subCategory || ''}
                                    </div>
                                </div>

                                <button
                                    className={`bp-button ${isDrafting ? 'bp-button--loading' : 'bp-button--primary'}`}
                                    style={{ width: '100%' }}
                                    disabled={isDrafting || !activeInspectionId}
                                    onClick={async () => {
                                        if (!activeInspectionId) return;
                                        setIsDrafting(true);
                                        try {
                                            const resAi = await fetch('/api/ai/care-labels', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    materials: data?.sample.sampleMaterials.map(m => ({ name: m.materialName, type: m.kind })),
                                                    division: data?.sample.division,
                                                    subCategory: data?.sample.subCategory,
                                                    colors: data?.sample.sampleColors.map(c => c.color.colorName),
                                                    inspectionItems: activeInspection?.items || []
                                                })
                                            });
                                            const aiData = await resAi.json();

                                            const saveRes = await fetch(`/api/quality/inspection/${activeInspectionId}/care-labels`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ labels: aiData.labels })
                                            });

                                            if (saveRes.ok) {
                                                await fetchData();
                                            }
                                        } catch (err) {
                                            console.error('Failed to generate care labels:', err);
                                        } finally {
                                            setIsDrafting(false);
                                        }
                                    }}
                                >
                                    <FileSearch style={{ width: 16, height: 16 }} />
                                    Generate Recommendations
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
