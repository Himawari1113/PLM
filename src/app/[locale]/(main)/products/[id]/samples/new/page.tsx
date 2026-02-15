'use client'

import { useParams } from 'next/navigation'
import { NewSampleForm } from '@/components/samples/NewSampleForm'

export default function NewSamplePage() {
  const params = useParams()
  const productId = params.id as string
  return (
    <NewSampleForm
      submitUrl={`/api/products/${productId}/samples`}
      backHref={`/products/${productId}/samples`}
      fixedProductId={productId}
    />
  )
}
