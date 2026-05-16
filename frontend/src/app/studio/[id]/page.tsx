import { StudioView } from '@/views/studio';

export default function StudioPage({ params }: { params: { id: string } }) {
  return <StudioView sessionId={params.id} />;
}