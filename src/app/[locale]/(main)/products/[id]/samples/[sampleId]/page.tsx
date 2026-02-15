'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from '@/lib/navigation'

export default function ProductSampleDetailRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const sampleId = params.sampleId as string

  useEffect(() => {
    router.replace(`/samples/${sampleId}`)
  }, [router, sampleId])

  return <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>
}
