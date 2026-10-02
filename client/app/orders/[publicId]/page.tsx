import { OrderDetailPage } from "@/components/commerce";
export default async function Page({ params }: { params: Promise<{ publicId: string }> }) { const { publicId } = await params; return <OrderDetailPage publicId={publicId} />; }
