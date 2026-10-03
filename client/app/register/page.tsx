import { AuthPage } from "@/components/commerce";
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) { const { next } = await searchParams; return <AuthPage mode="register" next={next} />; }
