import type { DemoAssetOption } from './types';

function svgDataUri(label: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="96" viewBox="0 0 160 96">
  <rect width="160" height="96" rx="8" fill="${color}"/>
  <text x="80" y="54" text-anchor="middle" fill="#fff" font-size="14" font-family="Segoe UI,sans-serif">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 本地脱敏素材样例：无上传服务、无远程图片。 */
export const DEMO_ASSET_OPTIONS: DemoAssetOption[] = [
  { id: 'asset_banner_spring', label: '春季横幅', preview: svgDataUri('Spring', '#3b82f6') },
  { id: 'asset_card_news', label: '资讯卡片', preview: svgDataUri('News', '#0f766e') },
  { id: 'asset_promo_gift', label: '礼包入口', preview: svgDataUri('Gift', '#c2410c') },
  { id: 'asset_topic_hot', label: '热门专题', preview: svgDataUri('Topic', '#7c3aed') }
];

export function findDemoAsset(assetId: string | null | undefined) {
  if (!assetId) return null;
  return DEMO_ASSET_OPTIONS.find(item => item.id === assetId) || null;
}
