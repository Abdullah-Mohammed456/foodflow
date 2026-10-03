import { OrderDetailPage } from "@/components/commerce";
export default async function Page({ params, searchParams }: { params: Promise<{ publicId: string }>; searchParams: Promise<{ placed?: string }> }) {
  const [{ publicId }, { placed }] = await Promise.all([params, searchParams]);
  return <OrderDetailPage publicId={publicId} placed={placed === "1"} />;
}
