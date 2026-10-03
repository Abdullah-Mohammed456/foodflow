import { AuthPage } from "@/components/commerce";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; registered?: string }> }) { const { next, registered } = await searchParams; return <AuthPage mode="login" next={next} registered={registered === "1"} />; }
