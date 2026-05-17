import { StudioView } from '@/views/studio';
import { use } from 'react';

export default function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StudioView sessionId={id} />;
}