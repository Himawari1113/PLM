import { NewSampleForm } from '@/components/samples/NewSampleForm'

export default function NewSampleGlobalPage() {
  return <NewSampleForm submitUrl="/api/samples" backHref="/samples" />
}
