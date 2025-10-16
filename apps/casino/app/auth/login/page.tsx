import { LoginForm } from "@/components/login-form";
import { Footer } from "@/components/footer";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0f1419]">
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
      <Footer />
    </div>
  );
}
