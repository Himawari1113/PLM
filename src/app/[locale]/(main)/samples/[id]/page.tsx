'use client'

import { useParams } from 'next/navigation'
import { NewSampleForm } from '@/components/samples/NewSampleForm'

export default function SampleDetailPage() {
  const params = useParams()
  const sampleId = params.id as string

  return (
    <NewSampleForm
      sampleId={sampleId}
      submitMethod="PUT"
      submitUrl={`/api/samples/${sampleId}`}
      backHref="/samples"
    />
  )
}
