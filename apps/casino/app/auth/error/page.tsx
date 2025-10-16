import { Card, CardContent, CardHeader, CardTitle } from "@mypokies/ui";
import { Footer } from "@/components/footer";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1419]">
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  Sorry, something went wrong.
                </CardTitle>
              </CardHeader>
              <CardContent>
                {params?.error ? (
                  <p className="text-sm text-muted-foreground">
                    Code error: {params.error}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    An unspecified error occurred.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
