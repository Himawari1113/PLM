export const PRODUCT_CATEGORIES = [
  { value: 'TOPS', label: 'トップス' },
  { value: 'BOTTOMS', label: 'ボトムス' },
  { value: 'OUTERWEAR', label: 'アウター' },
  { value: 'DRESSES', label: 'ワンピース' },
  { value: 'KNITWEAR', label: 'ニット' },
  { value: 'ACCESSORIES', label: 'アクセサリー' },
  { value: 'BAGS', label: 'バッグ' },
  { value: 'SHOES', label: 'シューズ' },
  { value: 'OTHER', label: 'その他' },
] as const

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  DRAFT: '下書き',
  IN_REVIEW: 'レビュー中',
  APPROVED: '承認済み',
  IN_PRODUCTION: '生産中',
  COMPLETED: '完了',
  CANCELLED: 'キャンセル',
}

export const PRODUCT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bp-badge--neutral',
  IN_REVIEW: 'bp-badge--warning',
  APPROVED: 'bp-badge--success',
  IN_PRODUCTION: 'bp-badge--info',
  COMPLETED: 'bp-badge--neutral',
  CANCELLED: 'bp-badge--danger',
}

export const MATERIAL_TYPE_LABELS: Record<string, string> = {
  FABRIC: '生地',
  TRIM: '副資材',
  PACKAGING: '包装資材',
  OTHER: 'その他',
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理者',
  DESIGNER: 'デザイナー',
  MERCHANDISER: 'マーチャンダイザー',
  VIEWER: '閲覧者',
}

export const SAMPLE_TYPE_LABELS: Record<string, string> = {
  PROTO: 'プロト',
  SALES_SAMPLE: '先上げサンプル',
  PP_SAMPLE: 'PPサンプル',
  TOP: 'TOP',
  OTHER: 'その他',
}

export const SAMPLE_STATUS_LABELS: Record<string, string> = {
  PENDING: '未着手',
  IN_PROGRESS: '進行中',
  SUBMITTED: '提出済み',
  APPROVED: '承認済み',
  REJECTED: '却下',
}

export const SAMPLE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bp-badge--neutral',
  IN_PROGRESS: 'bp-badge--info',
  SUBMITTED: 'bp-badge--warning',
  APPROVED: 'bp-badge--success',
  REJECTED: 'bp-badge--danger',
}

export const COST_STATUS_LABELS: Record<string, string> = {
  ESTIMATING: '見積中',
  QUOTED: '見積済み',
  NEGOTIATING: '交渉中',
  APPROVED: '承認済み',
  REJECTED: '却下',
}

export const COST_STATUS_COLORS: Record<string, string> = {
  ESTIMATING: 'bp-badge--neutral',
  QUOTED: 'bp-badge--info',
  NEGOTIATING: 'bp-badge--warning',
  APPROVED: 'bp-badge--success',
  REJECTED: 'bp-badge--danger',
}

export const SEASON_TERMS = [
  { value: 'SS', label: '春夏 (SS)' },
  { value: 'AW', label: '秋冬 (AW)' },
  { value: 'PRE_FALL', label: 'プレフォール' },
  { value: 'RESORT', label: 'リゾート' },
] as const
